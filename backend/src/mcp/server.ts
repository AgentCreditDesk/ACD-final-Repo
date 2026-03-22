/**
 * MCP (Model Context Protocol) Server for Agent Credit Desk
 *
 * Exposes lending operations as MCP tools that any AI agent can discover
 * and invoke. Runs as a stdio transport for seamless integration with
 * Claude, ChatGPT, and other MCP-compatible agents.
 *
 * Tools exposed:
 * - acd_request_loan: Submit a loan request
 * - acd_check_credit: Check borrower creditworthiness
 * - acd_loan_status: Get loan status and details
 * - acd_treasury_info: Query treasury capacity
 * - acd_list_loans: List loans for a borrower
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";

// Load env before anything else
dotenv.config();

// MCP uses stdio for JSON-RPC — redirect ALL console output to stderr
// so log messages don't corrupt the transport
const origLog = console.log;
const origInfo = console.info;
console.log = (...args: any[]) => console.error(...args);
console.info = (...args: any[]) => console.error(...args);

import * as loanService from "../services/loan.service";
import { getTreasuryStatus } from "../services/treasury.service";
import { getScoreFromChain } from "../services/scoring.service";
import { RISK_POLICY, SCORE_TIERS } from "../services/policy.service";
import { logger } from "../utils/logger";

const server = new McpServer({
  name: "agent-credit-desk",
  version: "1.0.0",
});

// ─── Tool: Request Loan ──────────────────────────────────────────────────────

server.tool(
  "acd_request_loan",
  "Submit a USDT loan request to the autonomous credit desk. The AI underwriter will evaluate and respond. Returns a loan ID for polling status.",
  {
    borrowerAddress: z.string().describe("Ethereum address of the borrower (0x...)"),
    amount: z.string().describe("Loan amount in USDT smallest units (6 decimals, e.g. '100000000' = 100 USDT)"),
    durationSeconds: z.number().describe("Loan duration in seconds (e.g. 2592000 = 30 days)"),
    purpose: z.string().describe("Brief description of what the loan is for"),
  },
  async ({ borrowerAddress, amount, durationSeconds, purpose }) => {
    try {
      // Pre-flight checks
      const scoreData = await getScoreFromChain(borrowerAddress);
      if (scoreData.loansDefaulted > 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "borrower_blacklisted",
                message: "Borrower has defaults — zero tolerance policy. All future loans permanently rejected.",
              }),
            },
          ],
        };
      }

      const treasury = await getTreasuryStatus();
      const available = BigInt(treasury.availableForLoans);
      const requested = BigInt(amount);

      if (requested > available) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "insufficient_capacity",
                available: treasury.availableForLoans,
                requested: amount,
              }),
            },
          ],
        };
      }

      const loan = await loanService.createLoanRequest({
        borrowerAddress,
        amount: requested,
        durationSeconds,
        purpose: `[MCP] ${purpose}`,
      });

      logger.info("MCP loan request", { loanId: loan.id, borrower: borrowerAddress });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              loanId: loan.id,
              status: "pending",
              message: "Loan submitted for autonomous AI underwriting. Poll acd_loan_status for updates.",
              estimatedDecisionSeconds: 60,
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: String(error) }) }],
        isError: true,
      };
    }
  }
);

// ─── Tool: Check Credit ──────────────────────────────────────────────────────

server.tool(
  "acd_check_credit",
  "Check a borrower's credit score, loan history, and eligibility before requesting a loan. Returns score, tier, and maximum borrowing capacity.",
  {
    borrowerAddress: z.string().describe("Ethereum address to check (0x...)"),
  },
  async ({ borrowerAddress }) => {
    try {
      const scoreData = await getScoreFromChain(borrowerAddress);
      const treasury = await getTreasuryStatus();

      const tier = SCORE_TIERS.find(
        (t) => scoreData.score >= t.minScore && scoreData.score <= t.maxScore
      );

      const eligible = scoreData.loansDefaulted === 0 && scoreData.score >= 300;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              address: borrowerAddress,
              score: scoreData.score,
              loansTaken: scoreData.loansTaken,
              loansRepaid: scoreData.loansRepaid,
              loansDefaulted: scoreData.loansDefaulted,
              eligible,
              reason: !eligible
                ? scoreData.loansDefaulted > 0
                  ? "Zero tolerance: borrower has defaults — permanently blacklisted"
                  : "Score below minimum threshold (300)"
                : "Borrower is eligible for loans",
              tier: tier
                ? {
                    maxDurationDays: tier.maxDurationDays,
                    maxPrincipalPct: tier.maxPrincipalPct,
                    aprRange: `${tier.minAprBps}-${tier.maxAprBps} bps`,
                  }
                : null,
              treasuryAvailable: treasury.availableForLoans,
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: String(error) }) }],
        isError: true,
      };
    }
  }
);

// ─── Tool: Loan Status ───────────────────────────────────────────────────────

server.tool(
  "acd_loan_status",
  "Get the current status of a loan request, including terms, vault details, and repayment info.",
  {
    loanId: z.string().describe("The loan ID returned from acd_request_loan"),
  },
  async ({ loanId }) => {
    try {
      const loan = await loanService.getLoanById(loanId);
      if (!loan) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "loan_not_found" }) }],
        };
      }

      const response: any = {
        loanId: loan.id,
        status: loan.status,
        borrower: loan.borrowerAddress,
        requestedAmount: loan.requestedAmount.toString(),
        durationSeconds: loan.requestedDurationSeconds,
        purpose: loan.purpose,
        createdAt: loan.createdAt.toISOString(),
      };

      if (loan.termsPrincipal) {
        response.terms = {
          principal: loan.termsPrincipal.toString(),
          aprBps: loan.termsAprBps,
        };
      }

      if (loan.decisionRationale) response.rationale = loan.decisionRationale;
      if (loan.loanVaultAddress) response.vaultAddress = loan.loanVaultAddress;
      if (loan.dueTimestamp) response.dueDate = new Date(loan.dueTimestamp * 1000).toISOString();

      return {
        content: [{ type: "text" as const, text: JSON.stringify(response) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: String(error) }) }],
        isError: true,
      };
    }
  }
);

// ─── Tool: Treasury Info ─────────────────────────────────────────────────────

server.tool(
  "acd_treasury_info",
  "Query the current treasury status: available lending capacity, utilization, and total assets. Use this to check if the credit desk can fund a loan.",
  {},
  async () => {
    try {
      const status = await getTreasuryStatus();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              asset: "USDT",
              chain: "Base Sepolia (84532)",
              walletBalance: status.walletBalance,
              aaveDeposited: status.aaveDeposited,
              totalTreasury: status.totalTreasury,
              outstandingLoans: status.outstandingLoans,
              availableForLoans: status.availableForLoans,
              loanUtilization: status.loanUtilization,
              policy: {
                maxExposurePct: RISK_POLICY.maxExposurePct,
                zeroToleranceDefaults: true,
              },
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: String(error) }) }],
        isError: true,
      };
    }
  }
);

// ─── Tool: List Loans ────────────────────────────────────────────────────────

server.tool(
  "acd_list_loans",
  "List all loans for a specific borrower address, including their statuses and terms.",
  {
    borrowerAddress: z.string().describe("Ethereum address of the borrower (0x...)"),
  },
  async ({ borrowerAddress }) => {
    try {
      const loans = await loanService.getLoansByBorrower(borrowerAddress);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              loans.map((l) => ({
                loanId: l.id,
                status: l.status,
                amount: l.requestedAmount.toString(),
                principal: l.termsPrincipal?.toString(),
                aprBps: l.termsAprBps,
                vault: l.loanVaultAddress,
                created: l.createdAt.toISOString(),
              }))
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: String(error) }) }],
        isError: true,
      };
    }
  }
);

// ─── Start Server ────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("MCP server started (stdio transport)");
}

main().catch((error) => {
  console.error("MCP server fatal error:", error);
  process.exit(1);
});

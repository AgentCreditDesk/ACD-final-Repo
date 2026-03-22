/**
 * Agent-to-Agent Lending API
 *
 * REST endpoints for external AI agents to programmatically:
 * - Request loans on behalf of their operators
 * - Check loan status and terms
 * - Query treasury capacity
 * - Get credit assessments before applying
 *
 * All endpoints require API key authentication via X-Agent-Key header.
 */

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import * as loanService from "../services/loan.service";
import * as chainService from "../services/chain.service";
import { getTreasuryStatus } from "../services/treasury.service";
import { getScoreFromChain } from "../services/scoring.service";
import { RISK_POLICY, SCORE_TIERS } from "../services/policy.service";
import { logger } from "../utils/logger";

const router = Router();

// ─── API Key Auth Middleware ─────────────────────────────────────────────────

const AGENT_API_KEYS = new Map<string, { name: string; createdAt: Date }>();

// Bootstrap: allow the env-configured key, or generate one on startup
const envKey = process.env.AGENT_API_KEY || uuidv4();
AGENT_API_KEYS.set(envKey, { name: "default", createdAt: new Date() });
logger.info("Agent API key configured", { key: envKey.slice(0, 8) + "..." });

function requireAgentKey(req: Request, res: Response, next: NextFunction) {
  const key = req.headers["x-agent-key"] as string;
  if (!key || !AGENT_API_KEYS.has(key)) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Valid X-Agent-Key header required",
    });
  }
  (req as any).agentName = AGENT_API_KEYS.get(key)!.name;
  next();
}

router.use(requireAgentKey);

// ─── Agent Discovery ─────────────────────────────────────────────────────────

/**
 * GET /agent-api/capabilities
 * Returns what this lending agent can do — for agent discovery/negotiation.
 */
router.get("/capabilities", (_req: Request, res: Response) => {
  res.json({
    protocol: "acd-lending-v1",
    name: "Agent Credit Desk",
    description: "Autonomous AI-powered USDT lending on Base Sepolia",
    capabilities: [
      "loan_request",
      "credit_check",
      "treasury_query",
      "loan_status",
    ],
    asset: "USDT",
    chain: "base-sepolia",
    chainId: 84532,
    policy: {
      maxLoanDurationDays: 365,
      aprRangeBps: { min: 300, max: 2000 },
      maxExposurePct: RISK_POLICY.maxExposurePct,
      zeroToleranceDefaults: true,
    },
    endpoints: {
      requestLoan: "POST /agent-api/loans",
      creditCheck: "GET /agent-api/credit/:address",
      loanStatus: "GET /agent-api/loans/:id",
      treasury: "GET /agent-api/treasury",
    },
  });
});

// ─── Credit Pre-Check ────────────────────────────────────────────────────────

/**
 * GET /agent-api/credit/:address
 * Pre-check a borrower's creditworthiness before applying.
 */
router.get("/credit/:address", async (req: Request, res: Response) => {
  try {
    const address = req.params.address.toLowerCase();
    const scoreData = await getScoreFromChain(address);
    const treasury = await getTreasuryStatus();

    // Find applicable tier
    const tier = SCORE_TIERS.find(
      (t) => scoreData.score >= t.minScore && scoreData.score <= t.maxScore
    );

    const eligible = scoreData.loansDefaulted === 0 && scoreData.score >= 300;

    res.json({
      address,
      score: scoreData.score,
      loansTaken: scoreData.loansTaken,
      loansRepaid: scoreData.loansRepaid,
      loansDefaulted: scoreData.loansDefaulted,
      eligible,
      reason: !eligible
        ? scoreData.loansDefaulted > 0
          ? "Zero tolerance: borrower has defaults"
          : "Score below minimum threshold"
        : undefined,
      tier: tier
        ? {
            maxDurationDays: tier.maxDurationDays,
            maxPrincipalPct: tier.maxPrincipalPct,
            aprRangeBps: { min: tier.minAprBps, max: tier.maxAprBps },
          }
        : null,
      treasuryAvailable: treasury.availableForLoans,
    });
  } catch (error) {
    logger.error("Agent API credit check error", { error: String(error) });
    res.status(500).json({ error: "internal_error" });
  }
});

// ─── Request Loan ────────────────────────────────────────────────────────────

const agentLoanSchema = z.object({
  borrowerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string(), // USDT amount in smallest unit (6 decimals)
  durationSeconds: z.number().int().positive(),
  purpose: z.string().min(1).max(500),
  callbackUrl: z.string().url().optional(), // Webhook for status updates
  agentMetadata: z
    .object({
      agentId: z.string().optional(),
      protocol: z.string().optional(),
      version: z.string().optional(),
    })
    .optional(),
});

/**
 * POST /agent-api/loans
 * Submit a loan request programmatically. Returns immediately with loan ID.
 * The autonomous underwriting agent will evaluate and respond asynchronously.
 */
router.post("/loans", async (req: Request, res: Response) => {
  try {
    const parsed = agentLoanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "invalid_request",
        details: parsed.error.format(),
      });
    }

    // Pre-flight credit check
    const scoreData = await getScoreFromChain(parsed.data.borrowerAddress);
    if (scoreData.loansDefaulted > 0) {
      return res.status(403).json({
        error: "borrower_blacklisted",
        message: "Borrower has defaults — zero tolerance policy",
      });
    }

    // Check treasury capacity
    const treasury = await getTreasuryStatus();
    const available = BigInt(treasury.availableForLoans);
    const requested = BigInt(parsed.data.amount);
    if (requested > available) {
      return res.status(422).json({
        error: "insufficient_capacity",
        message: "Requested amount exceeds available lending capacity",
        available: treasury.availableForLoans,
      });
    }

    // Create the loan request
    const loan = await loanService.createLoanRequest({
      borrowerAddress: parsed.data.borrowerAddress,
      amount: requested,
      durationSeconds: parsed.data.durationSeconds,
      purpose: `[Agent: ${(req as any).agentName}] ${parsed.data.purpose}`,
    });

    logger.info("Agent API loan request", {
      loanId: loan.id,
      agent: (req as any).agentName,
      borrower: parsed.data.borrowerAddress,
      amount: parsed.data.amount,
    });

    res.status(202).json({
      loanId: loan.id,
      status: "pending",
      message: "Loan request submitted for autonomous underwriting",
      pollUrl: `/agent-api/loans/${loan.id}`,
      estimatedDecisionSeconds: 60,
    });
  } catch (error) {
    logger.error("Agent API loan request error", { error: String(error) });
    res.status(500).json({ error: "internal_error" });
  }
});

// ─── Loan Status ─────────────────────────────────────────────────────────────

/**
 * GET /agent-api/loans/:id
 * Poll loan status. Returns full loan details including vault info if funded.
 */
router.get("/loans/:id", async (req: Request, res: Response) => {
  try {
    const loan = await loanService.getLoanById(req.params.id);
    if (!loan) {
      return res.status(404).json({ error: "loan_not_found" });
    }

    const response: any = {
      loanId: loan.id,
      status: loan.status,
      borrowerAddress: loan.borrowerAddress,
      requestedAmount: loan.requestedAmount.toString(),
      requestedDurationSeconds: loan.requestedDurationSeconds,
      purpose: loan.purpose,
      createdAt: loan.createdAt.toISOString(),
    };

    if (loan.status === "APPROVED" || loan.status === "FUNDED" || loan.status === "DRAWN") {
      response.terms = {
        principal: loan.termsPrincipal?.toString(),
        aprBps: loan.termsAprBps,
      };
    }

    if (loan.decisionRationale) {
      response.rationale = loan.decisionRationale;
    }

    if (loan.loanVaultAddress) {
      response.vault = {
        address: loan.loanVaultAddress,
        deployTxHash: loan.deployTxHash,
        fundTxHash: loan.fundTxHash,
      };
    }

    if (loan.dueTimestamp) {
      response.dueTimestamp = loan.dueTimestamp;
      response.dueDate = new Date(loan.dueTimestamp * 1000).toISOString();
    }

    res.json(response);
  } catch (error) {
    logger.error("Agent API loan status error", { error: String(error) });
    res.status(500).json({ error: "internal_error" });
  }
});

// ─── Treasury Info ───────────────────────────────────────────────────────────

/**
 * GET /agent-api/treasury
 * Query current treasury capacity for lending decisions.
 */
router.get("/treasury", async (_req: Request, res: Response) => {
  try {
    const status = await getTreasuryStatus();
    res.json({
      asset: "USDT",
      chain: "base-sepolia",
      availableForLoans: status.availableForLoans,
      totalTreasury: status.totalTreasury,
      loanUtilization: status.loanUtilization,
      policy: {
        maxExposurePct: RISK_POLICY.maxExposurePct,
        zeroToleranceDefaults: true,
      },
    });
  } catch (error) {
    logger.error("Agent API treasury error", { error: String(error) });
    res.status(500).json({ error: "internal_error" });
  }
});

// ─── Batch Loan Query ────────────────────────────────────────────────────────

/**
 * GET /agent-api/loans?borrower=0x...
 * List loans for a borrower (agent's portfolio view).
 */
router.get("/loans", async (req: Request, res: Response) => {
  try {
    const borrower = req.query.borrower as string | undefined;
    if (!borrower) {
      return res.status(400).json({ error: "borrower query param required" });
    }

    const loans = await loanService.getLoansByBorrower(borrower);
    res.json(
      loans.map((l) => ({
        loanId: l.id,
        status: l.status,
        requestedAmount: l.requestedAmount.toString(),
        termsPrincipal: l.termsPrincipal?.toString(),
        termsAprBps: l.termsAprBps,
        createdAt: l.createdAt.toISOString(),
        vaultAddress: l.loanVaultAddress,
      }))
    );
  } catch (error) {
    logger.error("Agent API loans list error", { error: String(error) });
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;

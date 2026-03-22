import { Router, Request, Response } from "express";
import { z } from "zod";
import * as loanService from "../services/loan.service";
import * as chainService from "../services/chain.service";
import { logger } from "../utils/logger";

const router = Router();

// POST /loans/request - Submit a new loan request
const createRequestSchema = z.object({
  borrowerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string().transform((v) => v), // Keep as string, convert to BigInt in service
  durationSeconds: z.number().int().positive(),
  purpose: z.string().min(1).max(500),
});

router.post("/request", async (req: Request, res: Response) => {
  try {
    const parsed = createRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    }

    const loan = await loanService.createLoanRequest({
      borrowerAddress: parsed.data.borrowerAddress,
      amount: BigInt(parsed.data.amount),
      durationSeconds: parsed.data.durationSeconds,
      purpose: parsed.data.purpose,
    });

    res.status(201).json(serializeLoan(loan));
  } catch (error) {
    logger.error("Error creating loan request", { error: String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /loans/pending - Get pending requests for the agent
router.get("/pending", async (_req: Request, res: Response) => {
  try {
    const loans = await loanService.getPendingRequests();
    res.json(loans.map(serializeLoan));
  } catch (error) {
    logger.error("Error fetching pending loans", { error: String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /loans/:id/decision - Agent posts underwriting decision
const decisionSchema = z.object({
  approve: z.boolean(),
  principal: z.string().optional(),
  aprBps: z.number().int().optional(),
  durationSeconds: z.number().int().optional(),
  rationale: z.string().min(1),
});

router.post("/:id/decision", async (req: Request, res: Response) => {
  try {
    const parsed = decisionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
    }

    const loan = await loanService.processDecision(req.params.id, parsed.data);
    res.json(serializeLoan(loan));
  } catch (error: any) {
    logger.error("Error processing decision", { loanId: req.params.id, error: String(error) });
    if (error.message?.includes("not in PENDING")) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /loans/:id/fund - Deploy LoanVault and fund from treasury
router.post("/:id/fund", async (req: Request, res: Response) => {
  try {
    const result = await chainService.deployAndFundVault(req.params.id);
    res.json(result);
  } catch (error: any) {
    logger.error("Error funding loan", { loanId: req.params.id, error: String(error) });
    if (error.message?.includes("not in APPROVED")) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /loans/:id/notify-repay - Frontend notifies backend that borrower repaid on-chain
router.post("/:id/notify-repay", async (req: Request, res: Response) => {
  try {
    const loan = await loanService.getLoanById(req.params.id);
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }
    if (!loan.loanVaultAddress) {
      return res.status(400).json({ error: "No vault for this loan" });
    }

    // Verify on-chain that vault is actually in Repaid state
    const { getLoanVault } = await import("../utils/contracts");
    const vault = getLoanVault(loan.loanVaultAddress);
    const state = await vault.state();

    if (Number(state) !== 3) {
      return res.status(400).json({ error: "Vault is not in Repaid state on-chain" });
    }

    // Update DB if not already repaid
    if (loan.status !== "REPAID") {
      const { PrismaClient, LoanStatus } = await import("@prisma/client");
      const prisma = new PrismaClient();
      const totalOwed = await vault.totalOwed();

      await prisma.loanRequest.update({
        where: { id: loan.id },
        data: { status: LoanStatus.REPAID, repaidAt: new Date() },
      });

      await prisma.treasuryEvent.create({
        data: {
          type: "REPAYMENT_RECEIVED",
          amount: totalOwed,
          relatedLoanId: loan.id,
          metadata: { borrower: loan.borrowerAddress },
        },
      });

      // Bump credit score on-chain
      const scoringService = await import("../services/scoring.service");
      await scoringService.bumpOnRepaid(loan.borrowerAddress);

      logger.info("Repayment notified and processed", { loanId: loan.id, borrower: loan.borrowerAddress });
    }

    res.json({ status: "repaid", loanId: loan.id });
  } catch (error) {
    logger.error("Error processing repay notification", { loanId: req.params.id, error: String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /loans/:id/vault-info - Get on-chain vault details (totalOwed, state)
router.get("/:id/vault-info", async (req: Request, res: Response) => {
  try {
    const loan = await loanService.getLoanById(req.params.id);
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }
    if (!loan.loanVaultAddress) {
      return res.status(404).json({ error: "No vault deployed for this loan" });
    }

    const { getLoanVault } = await import("../utils/contracts");
    const vault = getLoanVault(loan.loanVaultAddress);

    const [state, totalOwed, interestOwed, principal, dueTimestamp] = await Promise.all([
      vault.state(),
      vault.totalOwed(),
      vault.interestOwed(),
      vault.principal(),
      vault.dueTimestamp(),
    ]);

    res.json({
      vaultAddress: loan.loanVaultAddress,
      state: Number(state), // 0=Created, 1=Funded, 2=Drawn, 3=Repaid, 4=Defaulted
      totalOwed: totalOwed.toString(),
      interestOwed: interestOwed.toString(),
      principal: principal.toString(),
      dueTimestamp: Number(dueTimestamp),
    });
  } catch (error) {
    logger.error("Error fetching vault info", { loanId: req.params.id, error: String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /loans/:id - Get loan details
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const loan = await loanService.getLoanById(req.params.id);
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }
    res.json(serializeLoan(loan));
  } catch (error) {
    logger.error("Error fetching loan", { loanId: req.params.id, error: String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /loans - Get all loans (with optional borrower filter)
router.get("/", async (req: Request, res: Response) => {
  try {
    const borrower = req.query.borrower as string | undefined;
    const loans = borrower
      ? await loanService.getLoansByBorrower(borrower)
      : await loanService.getAllLoans();
    res.json(loans.map(serializeLoan));
  } catch (error) {
    logger.error("Error fetching loans", { error: String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /loans/stats/summary - Loan statistics
router.get("/stats/summary", async (_req: Request, res: Response) => {
  try {
    const stats = await loanService.getLoanStats();
    res.json(stats);
  } catch (error) {
    logger.error("Error fetching loan stats", { error: String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Serialize BigInt fields for JSON
function serializeLoan(loan: any) {
  return {
    ...loan,
    requestedAmount: loan.requestedAmount?.toString(),
    termsPrincipal: loan.termsPrincipal?.toString(),
  };
}

export default router;

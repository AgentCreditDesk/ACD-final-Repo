import { Router, Request, Response } from "express";
import { getBorrowerProfile, syncScoreToCache } from "../services/scoring.service";
import { logger } from "../utils/logger";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /borrowers/:address/score - Get borrower credit score and profile
router.get("/:address/score", async (req: Request, res: Response) => {
  try {
    const address = req.params.address.toLowerCase();
    const profile = await getBorrowerProfile(address);

    // Sync to cache in background
    syncScoreToCache(address).catch((err) =>
      logger.warn("Background score sync failed", { address, error: String(err) })
    );

    res.json(profile);
  } catch (error) {
    logger.error("Error fetching borrower score", { address: req.params.address, error: String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /borrowers/:address/loans - Get borrower's loan history
router.get("/:address/loans", async (req: Request, res: Response) => {
  try {
    const address = req.params.address.toLowerCase();
    const loans = await prisma.loanRequest.findMany({
      where: { borrowerAddress: address },
      orderBy: { createdAt: "desc" },
    });

    res.json(
      loans.map((loan) => ({
        ...loan,
        requestedAmount: loan.requestedAmount.toString(),
        termsPrincipal: loan.termsPrincipal?.toString(),
      }))
    );
  } catch (error) {
    logger.error("Error fetching borrower loans", { error: String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /borrowers/scores/all - Get all cached scores
router.get("/scores/all", async (_req: Request, res: Response) => {
  try {
    const scores = await prisma.borrowerScoreCache.findMany({
      orderBy: { scoreValue: "desc" },
    });
    res.json(scores);
  } catch (error) {
    logger.error("Error fetching all scores", { error: String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

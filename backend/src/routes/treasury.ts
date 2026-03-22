import { Router, Request, Response } from "express";
import * as treasuryService from "../services/treasury.service";
import { RISK_POLICY, SCORE_TIERS } from "../services/policy.service";
import { logger } from "../utils/logger";
import { PrismaClient } from "@prisma/client";
import { getWdkTreasuryAddress, getUsdtBalance, getNativeBalance } from "../wdk/wallet";
import { wdkSupplyToAave, wdkWithdrawFromAave, wdkGetAaveAccountData } from "../wdk/aave";

const router = Router();
const prisma = new PrismaClient();

// GET /treasury/status - Current treasury status
router.get("/status", async (_req: Request, res: Response) => {
  try {
    const status = await treasuryService.getTreasuryStatus();
    res.json(status);
  } catch (error) {
    logger.error("Error fetching treasury status", { error: String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /treasury/rebalance - Trigger treasury rebalancing
router.post("/rebalance", async (_req: Request, res: Response) => {
  try {
    const result = await treasuryService.rebalanceTreasury();
    res.json(result);
  } catch (error) {
    logger.error("Error rebalancing treasury", { error: String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /treasury/supply-aave - Manually supply to Aave
router.post("/supply-aave", async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: "amount required" });

    const txHash = await treasuryService.supplyIdleToAave(BigInt(amount));
    res.json({ txHash, amount });
  } catch (error) {
    logger.error("Error supplying to Aave", { error: String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /treasury/withdraw-aave - Manually withdraw from Aave
router.post("/withdraw-aave", async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: "amount required" });

    const txHash = await treasuryService.withdrawFromAave(BigInt(amount));
    res.json({ txHash, amount });
  } catch (error) {
    logger.error("Error withdrawing from Aave", { error: String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /treasury/events - Treasury event timeline
router.get("/events", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const events = await prisma.treasuryEvent.findMany({
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    res.json(
      events.map((e) => ({
        ...e,
        amount: e.amount.toString(),
      }))
    );
  } catch (error) {
    logger.error("Error fetching treasury events", { error: String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /treasury/wdk-status - Get treasury status via WDK
router.get("/wdk-status", async (_req: Request, res: Response) => {
  try {
    const [address, usdtBalance, nativeBalance, aaveData] = await Promise.all([
      getWdkTreasuryAddress().catch(() => "not configured"),
      getUsdtBalance().catch(() => 0n),
      getNativeBalance().catch(() => 0n),
      wdkGetAaveAccountData().catch(() => null),
    ]);

    res.json({
      address,
      usdtBalance: usdtBalance.toString(),
      nativeBalance: nativeBalance.toString(),
      aave: aaveData
        ? {
            totalCollateral: aaveData.totalCollateralBase.toString(),
            totalDebt: aaveData.totalDebtBase.toString(),
            availableBorrows: aaveData.availableBorrowsBase.toString(),
            healthFactor: aaveData.healthFactor.toString(),
          }
        : null,
    });
  } catch (error) {
    logger.error("Error fetching WDK treasury status", { error: String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /treasury/wdk-supply - Supply to Aave via WDK
router.post("/wdk-supply", async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: "amount required" });

    const txHash = await wdkSupplyToAave(BigInt(amount));
    res.json({ txHash, amount });
  } catch (error) {
    logger.error("Error WDK supply to Aave", { error: String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /treasury/wdk-withdraw - Withdraw from Aave via WDK
router.post("/wdk-withdraw", async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: "amount required" });

    const txHash = await wdkWithdrawFromAave(BigInt(amount));
    res.json({ txHash, amount });
  } catch (error) {
    logger.error("Error WDK withdraw from Aave", { error: String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /treasury/policy - Current risk policy parameters
router.get("/policy", async (_req: Request, res: Response) => {
  res.json({
    riskPolicy: RISK_POLICY,
    scoreTiers: SCORE_TIERS,
  });
});

export default router;

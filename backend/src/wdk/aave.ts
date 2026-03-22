import AaveProtocolEvm from "@tetherto/wdk-protocol-lending-aave-evm";
import { getTreasuryAccount } from "./wallet";
import { config } from "../config";
import { logger } from "../utils/logger";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let _aaveProtocol: any | null = null;

/**
 * Initialize the WDK Aave Protocol EVM instance.
 */
export async function getAaveProtocol(): Promise<any> {
  if (_aaveProtocol) return _aaveProtocol;

  const account = await getTreasuryAccount();
  _aaveProtocol = new AaveProtocolEvm(account);

  logger.info("WDK Aave Protocol initialized");
  return _aaveProtocol;
}

/**
 * Supply USDT to Aave V3 via WDK.
 */
export async function wdkSupplyToAave(amount: bigint): Promise<string | null> {
  if (!config.USDT_ADDRESS) {
    logger.warn("USDT_ADDRESS not configured for Aave supply");
    return null;
  }

  try {
    const aave = await getAaveProtocol();

    // Get fee quote first
    const quote = await aave.quoteSupply({
      token: config.USDT_ADDRESS,
      amount,
    });

    logger.info("Aave supply quote", { estimatedFee: quote?.toString() });

    // Execute supply
    const txHash = await aave.supply({
      token: config.USDT_ADDRESS,
      amount,
    });

    logger.info("WDK Aave supply executed", { amount: amount.toString(), txHash });

    // Log treasury event
    await prisma.treasuryEvent.create({
      data: {
        type: "AAVE_SUPPLY",
        amount,
        txHash: typeof txHash === "string" ? txHash : txHash?.hash,
        metadata: { source: "wdk", action: "supply" },
      },
    });

    return typeof txHash === "string" ? txHash : txHash?.hash;
  } catch (error) {
    logger.error("WDK Aave supply failed", { error: String(error) });
    throw error;
  }
}

/**
 * Withdraw USDT from Aave V3 via WDK.
 */
export async function wdkWithdrawFromAave(amount: bigint): Promise<string | null> {
  if (!config.USDT_ADDRESS) {
    logger.warn("USDT_ADDRESS not configured for Aave withdraw");
    return null;
  }

  try {
    const aave = await getAaveProtocol();

    const quote = await aave.quoteWithdraw({
      token: config.USDT_ADDRESS,
      amount,
    });

    logger.info("Aave withdraw quote", { estimatedFee: quote?.toString() });

    const txHash = await aave.withdraw({
      token: config.USDT_ADDRESS,
      amount,
    });

    logger.info("WDK Aave withdraw executed", { amount: amount.toString(), txHash });

    await prisma.treasuryEvent.create({
      data: {
        type: "AAVE_WITHDRAW",
        amount,
        txHash: typeof txHash === "string" ? txHash : txHash?.hash,
        metadata: { source: "wdk", action: "withdraw" },
      },
    });

    return typeof txHash === "string" ? txHash : txHash?.hash;
  } catch (error) {
    logger.error("WDK Aave withdraw failed", { error: String(error) });
    throw error;
  }
}

/**
 * Get Aave account data via WDK.
 */
export async function wdkGetAaveAccountData(): Promise<{
  totalCollateralBase: bigint;
  totalDebtBase: bigint;
  availableBorrowsBase: bigint;
  currentLiquidationThreshold: bigint;
  ltv: bigint;
  healthFactor: bigint;
} | null> {
  try {
    const aave = await getAaveProtocol();
    const data = await aave.getAccountData();

    return {
      totalCollateralBase: BigInt(data.totalCollateralBase?.toString() || "0"),
      totalDebtBase: BigInt(data.totalDebtBase?.toString() || "0"),
      availableBorrowsBase: BigInt(data.availableBorrowsBase?.toString() || "0"),
      currentLiquidationThreshold: BigInt(data.currentLiquidationThreshold?.toString() || "0"),
      ltv: BigInt(data.ltv?.toString() || "0"),
      healthFactor: BigInt(data.healthFactor?.toString() || "0"),
    };
  } catch (error) {
    logger.error("WDK Aave getAccountData failed", { error: String(error) });
    return null;
  }
}

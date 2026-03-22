/**
 * Treasury Service — WDK-first implementation.
 *
 * All wallet operations use Tether WDK modules:
 * - Balance queries via WDK Wallet EVM
 * - Aave supply/withdraw via WDK Protocol Lending Aave EVM
 * - Token operations via WDK Wallet EVM
 */

import { PrismaClient, LoanStatus } from "@prisma/client";
import { config } from "../config";
import { getProvider } from "../utils/contracts";
import { logger } from "../utils/logger";
import { TreasuryStatus } from "../types";
import { RISK_POLICY } from "./policy.service";

// WDK modules
import {
  getWdkTreasuryAddress,
  getUsdtBalance,
  getNativeBalance,
} from "../wdk/wallet";
import {
  wdkSupplyToAave,
  wdkWithdrawFromAave,
  wdkGetAaveAccountData,
} from "../wdk/aave";

const prisma = new PrismaClient();

/**
 * Get the current treasury status using WDK wallet for all on-chain queries.
 */
export async function getTreasuryStatus(): Promise<TreasuryStatus> {
  let walletBalance = 0n;
  let aaveDeposited = 0n;

  // Get USDT wallet balance via WDK
  try {
    walletBalance = await getUsdtBalance();
  } catch (error) {
    logger.warn("Failed to get USDT balance via WDK", { error: String(error) });
  }

  // Get Aave account data via WDK
  try {
    const accountData = await wdkGetAaveAccountData();
    if (accountData) {
      // totalCollateralBase is in USD with 8 decimals, convert to 6 for USDT approximation
      aaveDeposited = accountData.totalCollateralBase / 100n;
    }
  } catch (error) {
    logger.warn("Failed to get Aave data via WDK", { error: String(error) });
  }

  // Get outstanding loans from DB
  const outstandingLoans = await prisma.loanRequest.findMany({
    where: {
      status: { in: [LoanStatus.FUNDED, LoanStatus.DRAWN] },
    },
    select: { termsPrincipal: true },
  });

  const totalOutstanding = outstandingLoans.reduce(
    (sum, loan) => sum + (loan.termsPrincipal || 0n),
    0n
  );

  const totalTreasury = walletBalance + aaveDeposited + totalOutstanding;
  const utilization = totalTreasury > 0n
    ? Number(totalOutstanding * 10000n / totalTreasury) / 10000
    : 0;

  const maxExposure = (totalTreasury * BigInt(Math.floor(RISK_POLICY.maxExposurePct * 10000))) / 10000n;
  const availableForLoans = maxExposure > totalOutstanding ? maxExposure - totalOutstanding : 0n;

  return {
    walletBalance: walletBalance.toString(),
    aaveDeposited: aaveDeposited.toString(),
    totalTreasury: totalTreasury.toString(),
    outstandingLoans: totalOutstanding.toString(),
    loanUtilization: utilization,
    availableForLoans: availableForLoans.toString(),
  };
}

/**
 * Supply idle USDT to Aave V3 via WDK lending module.
 */
export async function supplyIdleToAave(amount: bigint): Promise<string | null> {
  return wdkSupplyToAave(amount);
}

/**
 * Withdraw USDT from Aave via WDK lending module.
 */
export async function withdrawFromAave(amount: bigint): Promise<string | null> {
  return wdkWithdrawFromAave(amount);
}

/**
 * Rebalance treasury: move idle capital to Aave or withdraw for lending.
 * Uses WDK for all on-chain operations.
 */
export async function rebalanceTreasury(): Promise<{
  action: string;
  amount: string;
  txHash: string | null;
}> {
  const status = await getTreasuryStatus();
  const walletBalance = BigInt(status.walletBalance);
  const totalTreasury = BigInt(status.totalTreasury);
  const outstandingLoans = BigInt(status.outstandingLoans);

  if (totalTreasury === 0n) {
    return { action: "none", amount: "0", txHash: null };
  }

  const utilization = status.loanUtilization;

  // If utilization is below target min, supply idle capital to Aave via WDK
  if (utilization < RISK_POLICY.targetUtilizationMin) {
    // Keep enough for potential loan requests (20% of wallet balance as buffer)
    const buffer = walletBalance * 2000n / 10000n;
    const supplyAmount = walletBalance - buffer;

    if (supplyAmount > 0n) {
      const txHash = await supplyIdleToAave(supplyAmount);
      return { action: "supply_aave", amount: supplyAmount.toString(), txHash };
    }
  }

  // If utilization is above target max and we have Aave deposits, withdraw via WDK
  if (utilization > RISK_POLICY.targetUtilizationMax) {
    const aaveDeposited = BigInt(status.aaveDeposited);
    if (aaveDeposited > 0n) {
      const targetUtil = (RISK_POLICY.targetUtilizationMin + RISK_POLICY.targetUtilizationMax) / 2;
      const targetOutstanding = totalTreasury * BigInt(Math.floor(targetUtil * 10000)) / 10000n;
      const withdrawAmount = outstandingLoans > targetOutstanding
        ? outstandingLoans - targetOutstanding
        : aaveDeposited / 4n;

      const actualWithdraw = withdrawAmount > aaveDeposited ? aaveDeposited : withdrawAmount;
      if (actualWithdraw > 0n) {
        const txHash = await withdrawFromAave(actualWithdraw);
        return { action: "withdraw_aave", amount: actualWithdraw.toString(), txHash };
      }
    }
  }

  return { action: "none", amount: "0", txHash: null };
}

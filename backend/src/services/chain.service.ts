import { ethers } from "ethers";
import { PrismaClient, LoanStatus } from "@prisma/client";
import { config } from "../config";
import {
  getLoanVaultFactory,
  getLoanVault,
  getERC20,
  getProvider,
  getTreasuryAddress,
} from "../utils/contracts";
import { logger } from "../utils/logger";
import * as scoringService from "./scoring.service";

const prisma = new PrismaClient();

/**
 * Deploy a new LoanVault via the factory and fund it from treasury.
 */
export async function deployAndFundVault(loanId: string): Promise<{
  vaultAddress: string;
  deployTxHash: string;
  fundTxHash: string;
}> {
  const loan = await prisma.loanRequest.findUniqueOrThrow({ where: { id: loanId } });

  if (loan.status !== LoanStatus.APPROVED) {
    throw new Error(`Loan ${loanId} is not in APPROVED state`);
  }
  if (!loan.termsPrincipal || !loan.termsAprBps) {
    throw new Error(`Loan ${loanId} missing terms`);
  }

  // Verify treasury has enough USDT liquidity to fund this loan
  const usdt = getERC20(config.USDT_ADDRESS);
  const treasuryAddr = await getTreasuryAddress();
  const walletBalance: bigint = await usdt.balanceOf(treasuryAddr);
  if (walletBalance < loan.termsPrincipal) {
    throw new Error(
      `Insufficient treasury liquidity: need ${loan.termsPrincipal.toString()} but wallet has ${walletBalance.toString()}`
    );
  }

  const factory = getLoanVaultFactory();
  const treasuryAddress = treasuryAddr;
  const durationSeconds = loan.requestedDurationSeconds;

  // Deploy vault via factory
  logger.info("Deploying LoanVault", {
    loanId,
    borrower: loan.borrowerAddress,
    principal: loan.termsPrincipal.toString(),
  });

  const deployResult = await factory.createVault(
    treasuryAddress,
    loan.borrowerAddress,
    config.USDT_ADDRESS,
    loan.termsPrincipal,
    loan.termsAprBps,
    durationSeconds
  );
  const deployReceipt = deployResult.receipt;

  // Get vault address from event
  const vaultCreatedEvent = deployReceipt!.logs.find(
    (log: ethers.Log) => {
      try {
        const parsed = factory.interface.parseLog({ topics: [...log.topics], data: log.data });
        return parsed?.name === "VaultCreated";
      } catch {
        return false;
      }
    }
  );

  if (!vaultCreatedEvent) {
    throw new Error("VaultCreated event not found in deploy receipt");
  }

  const parsedEvent = factory.interface.parseLog({
    topics: [...vaultCreatedEvent.topics],
    data: vaultCreatedEvent.data,
  });
  const vaultAddress = parsedEvent!.args[0];
  const deployTxHash = deployResult.hash;

  logger.info("LoanVault deployed via WDK", { loanId, vaultAddress, txHash: deployTxHash });

  // Approve vault to spend USDT from treasury (via WDK)
  const approveTx = await usdt.approve(vaultAddress, loan.termsPrincipal);
  await approveTx.wait();

  // Fund the vault (via WDK)
  const vault = getLoanVault(vaultAddress);
  const fundResult = await vault.fund();
  await fundResult.wait();
  const fundTxHash = fundResult.hash;

  logger.info("LoanVault funded via WDK", { loanId, vaultAddress, txHash: fundTxHash });

  // Calculate due timestamp
  const block = fundResult.blockNumber ? await getProvider().getBlock(fundResult.blockNumber) : null;
  const dueTimestamp = (block?.timestamp || Math.floor(Date.now() / 1000)) + durationSeconds;

  // Update loan record
  await prisma.loanRequest.update({
    where: { id: loanId },
    data: {
      status: LoanStatus.FUNDED,
      loanVaultAddress: vaultAddress,
      dueTimestamp,
      deployTxHash: deployTxHash,
      fundTxHash: fundTxHash,
      fundedAt: new Date(),
    },
  });

  // Log treasury event
  await prisma.treasuryEvent.create({
    data: {
      type: "FUND_LOAN",
      amount: loan.termsPrincipal,
      relatedLoanId: loanId,
      txHash: fundTxHash,
      metadata: { vaultAddress, borrower: loan.borrowerAddress },
    },
  });

  return {
    vaultAddress,
    deployTxHash: deployTxHash,
    fundTxHash: fundTxHash,
  };
}

/**
 * Monitor active loans for repayment and default events.
 * Called periodically by the monitoring loop.
 */
export async function monitorActiveLoans(): Promise<void> {
  // Check FUNDED loans — see if they've been drawn
  const fundedLoans = await prisma.loanRequest.findMany({
    where: { status: LoanStatus.FUNDED, loanVaultAddress: { not: null } },
  });

  for (const loan of fundedLoans) {
    try {
      const vault = getLoanVault(loan.loanVaultAddress!);
      const state = await vault.state();

      if (Number(state) === 2) {
        // Drawn
        await prisma.loanRequest.update({
          where: { id: loan.id },
          data: { status: LoanStatus.DRAWN, drawnAt: new Date() },
        });
        logger.info("Loan drawn detected", { loanId: loan.id });
      }
    } catch (error) {
      logger.error("Error monitoring funded loan", { loanId: loan.id, error: String(error) });
    }
  }

  // Check DRAWN loans — see if repaid or past due
  const drawnLoans = await prisma.loanRequest.findMany({
    where: { status: LoanStatus.DRAWN, loanVaultAddress: { not: null } },
  });

  const now = Math.floor(Date.now() / 1000);

  for (const loan of drawnLoans) {
    try {
      const vault = getLoanVault(loan.loanVaultAddress!);
      const state = await vault.state();

      if (Number(state) === 3) {
        // Repaid
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

        // Bump credit score
        await scoringService.bumpOnRepaid(loan.borrowerAddress);
        logger.info("Loan repaid detected", { loanId: loan.id, borrower: loan.borrowerAddress });
      } else if (loan.dueTimestamp && now > loan.dueTimestamp) {
        // Past due — try to mark default on-chain
        try {
          const defaultTx = await vault.markDefault();
          await defaultTx.wait();
        } catch {
          // May already be defaulted or not authorized
        }

        await prisma.loanRequest.update({
          where: { id: loan.id },
          data: { status: LoanStatus.DEFAULTED, defaultedAt: new Date() },
        });

        await prisma.treasuryEvent.create({
          data: {
            type: "DEFAULT_MARKED",
            amount: loan.termsPrincipal || 0n,
            relatedLoanId: loan.id,
            metadata: { borrower: loan.borrowerAddress },
          },
        });

        await scoringService.bumpOnDefault(loan.borrowerAddress);
        logger.info("Loan default detected", { loanId: loan.id, borrower: loan.borrowerAddress });
      }
    } catch (error) {
      logger.error("Error monitoring drawn loan", { loanId: loan.id, error: String(error) });
    }
  }
}

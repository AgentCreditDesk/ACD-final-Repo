import { PrismaClient } from "@prisma/client";
import { getCreditScoreOracle } from "../utils/contracts";
import { logger } from "../utils/logger";
import { getTierForScore } from "./policy.service";
import { BorrowerProfile } from "../types";

const prisma = new PrismaClient();

export async function getScoreFromChain(address: string): Promise<{
  score: number;
  loansTaken: number;
  loansRepaid: number;
  loansDefaulted: number;
}> {
  try {
    const oracle = getCreditScoreOracle();
    const profile = await oracle.profileOf(address);
    return {
      score: Number(profile.score),
      loansTaken: Number(profile.loansTaken),
      loansRepaid: Number(profile.loansRepaid),
      loansDefaulted: Number(profile.loansDefaulted),
    };
  } catch (error) {
    logger.warn("Failed to read on-chain score, using cache/default", { address, error: String(error) });
    // Fall back to cache or defaults
    const cached = await prisma.borrowerScoreCache.findUnique({ where: { address } });
    if (cached) {
      return {
        score: cached.scoreValue,
        loansTaken: cached.loansTaken,
        loansRepaid: cached.loansRepaid,
        loansDefaulted: cached.loansDefaulted,
      };
    }
    return { score: 500, loansTaken: 0, loansRepaid: 0, loansDefaulted: 0 };
  }
}

export async function syncScoreToCache(address: string): Promise<void> {
  const onChain = await getScoreFromChain(address);

  await prisma.borrowerScoreCache.upsert({
    where: { address },
    update: {
      scoreValue: onChain.score,
      loansTaken: onChain.loansTaken,
      loansRepaid: onChain.loansRepaid,
      loansDefaulted: onChain.loansDefaulted,
      lastSyncedAt: new Date(),
    },
    create: {
      address,
      scoreValue: onChain.score,
      loansTaken: onChain.loansTaken,
      loansRepaid: onChain.loansRepaid,
      loansDefaulted: onChain.loansDefaulted,
    },
  });

  logger.info("Score synced to cache", { address, score: onChain.score });
}

export async function bumpOnRepaid(borrowerAddress: string): Promise<void> {
  try {
    const oracle = getCreditScoreOracle();
    const tx = await oracle.bumpOnRepaid(borrowerAddress);
    await tx.wait();
    logger.info("On-chain bumpOnRepaid executed", { borrowerAddress, txHash: tx.hash });
  } catch (error) {
    logger.error("Failed on-chain bumpOnRepaid", { borrowerAddress, error: String(error) });
  }

  await syncScoreToCache(borrowerAddress);
}

export async function bumpOnDefault(borrowerAddress: string): Promise<void> {
  try {
    const oracle = getCreditScoreOracle();
    const tx = await oracle.bumpOnDefault(borrowerAddress);
    await tx.wait();
    logger.info("On-chain bumpOnDefault executed", { borrowerAddress, txHash: tx.hash });
  } catch (error) {
    logger.error("Failed on-chain bumpOnDefault", { borrowerAddress, error: String(error) });
  }

  await syncScoreToCache(borrowerAddress);
}

export async function getBorrowerProfile(address: string): Promise<BorrowerProfile> {
  const scoreData = await getScoreFromChain(address);
  const tier = getTierForScore(scoreData.score);

  return {
    address,
    score: scoreData.score,
    loansTaken: scoreData.loansTaken,
    loansRepaid: scoreData.loansRepaid,
    loansDefaulted: scoreData.loansDefaulted,
    tier,
  };
}

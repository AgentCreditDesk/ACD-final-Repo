import { PolicyConfig, ScoreTier } from "../types";

export const RISK_POLICY: PolicyConfig = {
  maxExposurePct: 0.50,       // Max 50% of treasury in outstanding loans
  maxPerBorrowerPct: 0.10,    // Max 10% of treasury per borrower
  minHealthFactor: 1.2,       // Min Aave health factor
  targetUtilizationMin: 0.60, // Target 60-80% utilization
  targetUtilizationMax: 0.80,
};

export const SCORE_TIERS: ScoreTier[] = [
  {
    minScore: 800, maxScore: 1000,
    maxDurationDays: 30,
    maxPrincipalPct: 0.10,
    minAprBps: 500, maxAprBps: 800,
  },
  {
    minScore: 600, maxScore: 799,
    maxDurationDays: 21,
    maxPrincipalPct: 0.05,
    minAprBps: 800, maxAprBps: 1200,
  },
  {
    minScore: 0, maxScore: 599,
    maxDurationDays: 14,
    maxPrincipalPct: 0.02,
    minAprBps: 1200, maxAprBps: 2000,
  },
];

export function getTierForScore(score: number): ScoreTier {
  for (const tier of SCORE_TIERS) {
    if (score >= tier.minScore && score <= tier.maxScore) {
      return tier;
    }
  }
  return SCORE_TIERS[SCORE_TIERS.length - 1];
}

export interface PolicyValidation {
  valid: boolean;
  errors: string[];
}

export function validateDecision(params: {
  principal: bigint;
  aprBps: number;
  durationSeconds: number;
  borrowerScore: number;
  borrowerDefaults: number;
  totalTreasury: bigint;
  outstandingLoans: bigint;
  borrowerOutstanding: bigint;
}): PolicyValidation {
  const errors: string[] = [];

  // Zero tolerance: any default = permanently blacklisted
  if (params.borrowerDefaults >= 1) {
    errors.push(
      `Borrower has ${params.borrowerDefaults} default(s) — zero tolerance policy: all future loans are rejected`
    );
    return { valid: false, errors };
  }

  const tier = getTierForScore(params.borrowerScore);
  const durationDays = params.durationSeconds / (24 * 60 * 60);

  // Check duration against tier
  if (durationDays > tier.maxDurationDays) {
    errors.push(
      `Duration ${durationDays}d exceeds tier max ${tier.maxDurationDays}d for score ${params.borrowerScore}`
    );
  }

  // Check APR against tier
  if (params.aprBps < tier.minAprBps) {
    errors.push(
      `APR ${params.aprBps}bps below tier min ${tier.minAprBps}bps`
    );
  }
  if (params.aprBps > tier.maxAprBps) {
    errors.push(
      `APR ${params.aprBps}bps above tier max ${tier.maxAprBps}bps`
    );
  }

  // Check principal against tier max
  if (params.totalTreasury > 0n) {
    const maxPrincipal = (params.totalTreasury * BigInt(Math.floor(tier.maxPrincipalPct * 10000))) / 10000n;
    if (params.principal > maxPrincipal) {
      errors.push(
        `Principal exceeds tier max ${tier.maxPrincipalPct * 100}% of treasury`
      );
    }

    // Check global exposure limit
    const newOutstanding = params.outstandingLoans + params.principal;
    const maxExposure = (params.totalTreasury * BigInt(Math.floor(RISK_POLICY.maxExposurePct * 10000))) / 10000n;
    if (newOutstanding > maxExposure) {
      errors.push(
        `Total exposure would exceed ${RISK_POLICY.maxExposurePct * 100}% of treasury`
      );
    }

    // Check per-borrower limit
    const newBorrowerExposure = params.borrowerOutstanding + params.principal;
    const maxPerBorrower = (params.totalTreasury * BigInt(Math.floor(RISK_POLICY.maxPerBorrowerPct * 10000))) / 10000n;
    if (newBorrowerExposure > maxPerBorrower) {
      errors.push(
        `Borrower exposure would exceed ${RISK_POLICY.maxPerBorrowerPct * 100}% of treasury`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

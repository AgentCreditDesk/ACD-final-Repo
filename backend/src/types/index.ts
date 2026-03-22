export interface LoanDecision {
  approve: boolean;
  principal: bigint;
  aprBps: number;
  durationSeconds: number;
  rationale: string;
}

export interface TreasuryStatus {
  walletBalance: string;
  aaveDeposited: string;
  totalTreasury: string;
  outstandingLoans: string;
  loanUtilization: number;
  availableForLoans: string;
}

export interface PolicyConfig {
  maxExposurePct: number;
  maxPerBorrowerPct: number;
  minHealthFactor: number;
  targetUtilizationMin: number;
  targetUtilizationMax: number;
}

export interface ScoreTier {
  minScore: number;
  maxScore: number;
  maxDurationDays: number;
  maxPrincipalPct: number;
  minAprBps: number;
  maxAprBps: number;
}

export interface BorrowerProfile {
  address: string;
  score: number;
  loansTaken: number;
  loansRepaid: number;
  loansDefaulted: number;
  tier: ScoreTier;
}

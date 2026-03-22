export const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-800",
  FUNDED: "bg-purple-100 text-purple-800",
  DRAWN: "bg-orange-100 text-orange-800",
  REPAID: "bg-green-100 text-green-800",
  DEFAULTED: "bg-red-200 text-red-900",
};

export const TIER_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: "Premium", color: "text-green-600" },
  mid: { label: "Standard", color: "text-blue-600" },
  low: { label: "Basic", color: "text-orange-600" },
};

export function getScoreTierLabel(score: number): { label: string; color: string; tier: string } {
  if (score >= 800) return { label: "Premium (800-1000)", color: "text-emerald-600", tier: "high" };
  if (score >= 600) return { label: "Standard (600-799)", color: "text-blue-600", tier: "mid" };
  return { label: "Basic (0-599)", color: "text-amber-600", tier: "low" };
}

export function formatUsdt(amount: string | number | bigint, decimals = 6): string {
  const num = Number(BigInt(amount)) / Math.pow(10, decimals);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  if (days > 0) return `${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.floor(seconds / 3600);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  FUND_LOAN: "Loan Funded",
  AAVE_SUPPLY: "Aave Supply",
  AAVE_WITHDRAW: "Aave Withdraw",
  REPAYMENT_RECEIVED: "Repayment",
  DEFAULT_MARKED: "Default",
  SCORE_UPDATE: "Score Update",
};

// Contract ABIs for frontend interactions
export const USDT_ADDRESS = "0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a";

export const LOAN_VAULT_ABI = [
  "function draw() external",
  "function repay() external",
  "function totalOwed() view returns (uint256)",
  "function interestOwed() view returns (uint256)",
  "function principal() view returns (uint256)",
  "function state() view returns (uint8)",
  "function dueTimestamp() view returns (uint256)",
  "function borrower() view returns (address)",
  "function asset() view returns (address)",
] as const;

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
] as const;

// LoanVault state enum
export const VAULT_STATES = ["Created", "Funded", "Drawn", "Repaid", "Defaulted"] as const;

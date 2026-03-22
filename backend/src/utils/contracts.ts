/**
 * Contract utilities — WDK-first wallet layer.
 *
 * All treasury signing uses the WDK wallet (Tether WDK EVM module).
 * ethers.js is only used for ABI encoding/decoding and read-only contract calls,
 * NOT for key management or transaction signing.
 */

import { ethers } from "ethers";
import { config } from "../config";
import { getTreasuryAccount, getWdkTreasuryAddress } from "../wdk/wallet";
import { logger } from "./logger";
import * as LoanVaultABI from "../../abis/LoanVault.json";
import * as LoanVaultFactoryABI from "../../abis/LoanVaultFactory.json";
import * as CreditScoreOracleABI from "../../abis/CreditScoreOracle.json";
import * as MockERC20ABI from "../../abis/MockERC20.json";

let _provider: ethers.JsonRpcProvider | null = null;

/**
 * Read-only provider for chain queries and event parsing.
 */
export function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(config.RPC_URL);
  }
  return _provider;
}

/**
 * Get the treasury wallet address via WDK.
 */
export async function getTreasuryAddress(): Promise<string> {
  return getWdkTreasuryAddress();
}

// ─── WDK Transaction Helper ─────────────────────────────────────────────────

/**
 * Send a contract call via WDK wallet's sendTransaction.
 * Encodes the function call using ethers ABI encoder, then sends via WDK.
 */
async function wdkContractCall(
  contractAddress: string,
  abi: any[],
  functionName: string,
  args: any[],
  value?: bigint
): Promise<{ hash: string }> {
  const account = await getTreasuryAccount();
  const iface = new ethers.Interface(abi);
  const data = iface.encodeFunctionData(functionName, args);

  const tx: any = { to: contractAddress, data };
  if (value && value > 0n) {
    tx.value = value;
  }

  logger.info("WDK contract call", { to: contractAddress, function: functionName });
  const result = await account.sendTransaction(tx);
  return { hash: result.hash };
}

/**
 * Read a contract value (read-only, no signing needed).
 */
function getReadOnlyContract(address: string, abi: any[]): ethers.Contract {
  return new ethers.Contract(address, abi, getProvider());
}

// ─── Contract Interfaces ────────────────────────────────────────────────────

/**
 * LoanVaultFactory — deploys new LoanVault escrows.
 * Write operations use WDK, reads use ethers provider.
 */
export function getLoanVaultFactory() {
  if (!config.LOAN_VAULT_FACTORY_ADDRESS) {
    throw new Error("LOAN_VAULT_FACTORY_ADDRESS not configured");
  }

  const address = config.LOAN_VAULT_FACTORY_ADDRESS;
  const abi = LoanVaultFactoryABI.abi;
  const readOnly = getReadOnlyContract(address, abi);

  return {
    // Write: deploy a new vault via WDK signing
    async createVault(
      lender: string,
      borrower: string,
      asset: string,
      principal: bigint,
      aprBps: number,
      durationSeconds: number
    ) {
      const result = await wdkContractCall(address, abi, "createVault", [
        lender, borrower, asset, principal, aprBps, durationSeconds
      ]);
      // Wait for receipt to get events
      const receipt = await getProvider().waitForTransaction(result.hash);
      return {
        hash: result.hash,
        wait: async () => receipt,
        // Parse VaultCreated event from receipt
        receipt,
      };
    },
    // Read operations
    totalVaults: () => readOnly.totalVaults(),
    getBorrowerVaults: (borrower: string) => readOnly.getBorrowerVaults(borrower),
    getLenderVaults: (lender: string) => readOnly.getLenderVaults(lender),
    // For event parsing
    interface: new ethers.Interface(abi),
  };
}

/**
 * LoanVault — per-loan escrow contract.
 */
export function getLoanVault(address: string) {
  const abi = LoanVaultABI.abi;
  const readOnly = getReadOnlyContract(address, abi);

  return {
    // Write operations via WDK
    async fund() {
      const result = await wdkContractCall(address, abi, "fund", []);
      const receipt = await getProvider().waitForTransaction(result.hash);
      return { hash: result.hash, wait: async () => receipt, blockNumber: receipt?.blockNumber };
    },
    async markDefault() {
      const result = await wdkContractCall(address, abi, "markDefault", []);
      const receipt = await getProvider().waitForTransaction(result.hash);
      return { hash: result.hash, wait: async () => receipt };
    },
    // Read operations (no signing needed)
    state: () => readOnly.state(),
    totalOwed: () => readOnly.totalOwed(),
    interestOwed: () => readOnly.interestOwed(),
    principal: () => readOnly.principal(),
    dueTimestamp: () => readOnly.dueTimestamp(),
    borrower: () => readOnly.borrower(),
    asset: () => readOnly.asset(),
    startTimestamp: () => readOnly.startTimestamp(),
  };
}

/**
 * CreditScoreOracle — on-chain credit scoring.
 */
export function getCreditScoreOracle() {
  if (!config.CREDIT_SCORE_ORACLE_ADDRESS) {
    throw new Error("CREDIT_SCORE_ORACLE_ADDRESS not configured");
  }

  const address = config.CREDIT_SCORE_ORACLE_ADDRESS;
  const abi = CreditScoreOracleABI.abi;
  const readOnly = getReadOnlyContract(address, abi);

  return {
    // Write operations via WDK
    async bumpOnRepaid(borrower: string) {
      const result = await wdkContractCall(address, abi, "bumpOnRepaid", [borrower]);
      const receipt = await getProvider().waitForTransaction(result.hash);
      return { hash: result.hash, wait: async () => receipt };
    },
    async bumpOnDefault(borrower: string) {
      const result = await wdkContractCall(address, abi, "bumpOnDefault", [borrower]);
      const receipt = await getProvider().waitForTransaction(result.hash);
      return { hash: result.hash, wait: async () => receipt };
    },
    async initializeProfile(borrower: string, initialScore: number) {
      const result = await wdkContractCall(address, abi, "initializeProfile", [borrower, initialScore]);
      const receipt = await getProvider().waitForTransaction(result.hash);
      return { hash: result.hash, wait: async () => receipt };
    },
    // Read operations
    scoreOf: (borrower: string) => readOnly.scoreOf(borrower),
    profileOf: (borrower: string) => readOnly.profileOf(borrower),
  };
}

/**
 * ERC20 token interactions — uses WDK for approve/transfer, ethers for reads.
 */
export function getERC20(tokenAddress: string) {
  const abi = MockERC20ABI.abi;
  const readOnly = getReadOnlyContract(tokenAddress, abi);

  return {
    // Write operations via WDK
    async approve(spender: string, amount: bigint) {
      // Use WDK's native approve method for proper USDT handling
      const account = await getTreasuryAccount();
      const result = await account.approve({
        token: tokenAddress,
        spender,
        amount,
      });
      const receipt = await getProvider().waitForTransaction(result.hash);
      return { hash: result.hash, wait: async () => receipt };
    },
    async transfer(to: string, amount: bigint) {
      const account = await getTreasuryAccount();
      const result = await account.transfer({
        token: tokenAddress,
        recipient: to,
        amount,
      });
      const receipt = await getProvider().waitForTransaction(result.hash);
      return { hash: result.hash, wait: async () => receipt };
    },
    // Read operations
    balanceOf: (address: string) => readOnly.balanceOf(address),
    allowance: (owner: string, spender: string) => readOnly.allowance(owner, spender),
    symbol: () => readOnly.symbol(),
    decimals: () => readOnly.decimals(),
  };
}

// Re-export ABIs for external use
export { LoanVaultABI, LoanVaultFactoryABI, CreditScoreOracleABI };

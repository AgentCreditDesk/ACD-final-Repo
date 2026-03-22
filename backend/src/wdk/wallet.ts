/**
 * WDK Wallet Module — Primary wallet layer for Agent Credit Desk.
 *
 * Uses Tether WDK EVM wallet when a mnemonic is available (production path).
 * Falls back to ethers.js Wallet when only a private key is provided.
 * Both paths expose the same interface for seamless operation.
 */

import WalletManagerEvm from "@tetherto/wdk-wallet-evm";
import { ethers } from "ethers";
import { config } from "../config";
import { logger } from "../utils/logger";

let _walletManager: any | null = null;
let _account: any | null = null;
let _isWdk = false;

/**
 * Initialize the WDK EVM wallet manager with the treasury mnemonic.
 * Returns a singleton wallet manager instance.
 */
export async function getWalletManager(): Promise<any> {
  if (_walletManager) return _walletManager;

  if (config.TREASURY_MNEMONIC) {
    _walletManager = new WalletManagerEvm(config.TREASURY_MNEMONIC, {
      provider: config.RPC_URL,
    });
    _isWdk = true;
    logger.info("WDK Wallet Manager initialized (mnemonic mode)", { rpcUrl: config.RPC_URL });
  } else if (config.TREASURY_PRIVATE_KEY) {
    // Wrap ethers Wallet with WDK-compatible interface
    _walletManager = { _type: "ethers-fallback" };
    _isWdk = false;
    logger.info("WDK Wallet (ethers compatibility mode)", { rpcUrl: config.RPC_URL });
  } else {
    throw new Error("TREASURY_MNEMONIC or TREASURY_PRIVATE_KEY required");
  }

  return _walletManager;
}

/**
 * Get the primary treasury account (index 0).
 * Returns WDK account or ethers-compatible wrapper.
 */
export async function getTreasuryAccount(): Promise<any> {
  if (_account) return _account;

  await getWalletManager();

  if (_isWdk) {
    _account = await _walletManager.getAccount(0);
  } else {
    // Create ethers wallet with WDK-compatible interface
    const provider = new ethers.JsonRpcProvider(config.RPC_URL);
    const wallet = new ethers.Wallet(config.TREASURY_PRIVATE_KEY, provider);
    const nonceMgr = new ethers.NonceManager(wallet);

    _account = {
      address: wallet.address,

      async getAddress() { return wallet.address; },

      async getBalance() { return provider.getBalance(wallet.address); },

      async getTokenBalance(token: string) {
        const erc20 = new ethers.Contract(
          token,
          ["function balanceOf(address) view returns (uint256)"],
          provider
        );
        return erc20.balanceOf(wallet.address);
      },

      async sendTransaction(tx: any) {
        const txResponse = await nonceMgr.sendTransaction({
          to: tx.to,
          data: tx.data,
          value: tx.value,
        });
        const receipt = await txResponse.wait();
        return { hash: txResponse.hash, fee: receipt?.fee || 0n };
      },

      async transfer(options: { token: string; recipient: string; amount: bigint }) {
        const erc20 = new ethers.Contract(
          options.token,
          ["function transfer(address to, uint256 amount) returns (bool)"],
          nonceMgr
        );
        const tx = await erc20.transfer(options.recipient, options.amount);
        await tx.wait();
        return { hash: tx.hash, fee: 0n };
      },

      async approve(options: { token: string; spender: string; amount: bigint }) {
        const erc20 = new ethers.Contract(
          options.token,
          ["function approve(address spender, uint256 amount) returns (bool)"],
          nonceMgr
        );
        const tx = await erc20.approve(options.spender, options.amount);
        await tx.wait();
        return { hash: tx.hash, fee: 0n };
      },

      dispose() {},
    };
  }

  const address = _account.address || (await _account.getAddress?.());
  logger.info("Treasury account loaded", { address, mode: _isWdk ? "wdk" : "ethers-compat" });
  return _account;
}

/**
 * Check if using native WDK wallet.
 */
export function isUsingWdk(): boolean {
  return _isWdk;
}

/**
 * Get the treasury wallet address.
 */
export async function getWdkTreasuryAddress(): Promise<string> {
  const account = await getTreasuryAccount();
  return account.address || (await account.getAddress?.());
}

/**
 * Get USDT balance via WDK wallet.
 */
export async function getUsdtBalance(): Promise<bigint> {
  const account = await getTreasuryAccount();

  if (!config.USDT_ADDRESS) {
    logger.warn("USDT_ADDRESS not configured");
    return 0n;
  }

  try {
    const balance = await account.getTokenBalance(config.USDT_ADDRESS);
    return BigInt(balance.toString());
  } catch (error) {
    logger.error("Failed to get USDT balance", { error: String(error) });
    return 0n;
  }
}

/**
 * Get native (ETH) balance via WDK wallet.
 */
export async function getNativeBalance(): Promise<bigint> {
  const account = await getTreasuryAccount();

  try {
    const balance = await account.getBalance();
    return BigInt(balance.toString());
  } catch (error) {
    logger.error("Failed to get native balance", { error: String(error) });
    return 0n;
  }
}

/**
 * Transfer USDT using WDK wallet.
 */
export async function transferUsdt(to: string, amount: bigint): Promise<string> {
  const account = await getTreasuryAccount();

  const result = await account.transfer({
    token: config.USDT_ADDRESS,
    recipient: to,
    amount,
  });

  logger.info("USDT transfer via WDK", { to, amount: amount.toString(), txHash: result.hash });
  return result.hash;
}

/**
 * Cleanup wallet resources.
 */
export function disposeWallet(): void {
  if (_account) {
    try { _account.dispose?.(); } catch {}
    _account = null;
  }
  if (_walletManager) {
    try { _walletManager.dispose?.(); } catch {}
    _walletManager = null;
  }
  _isWdk = false;
  logger.info("WDK wallet resources disposed");
}

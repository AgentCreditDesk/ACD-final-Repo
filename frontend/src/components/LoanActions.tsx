"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { BrowserProvider, Contract } from "ethers";
import { motion } from "framer-motion";
import { LOAN_VAULT_ABI, ERC20_ABI, USDT_ADDRESS, VAULT_STATES } from "@/lib/contracts";
import { formatUsdt } from "@/lib/constants";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Loan {
  id: string;
  borrowerAddress: string;
  status: string;
  loanVaultAddress?: string;
  termsPrincipal?: string;
  termsAprBps?: number;
  requestedDurationSeconds: number;
  dueTimestamp?: number;
  decisionRationale?: string;
}

interface VaultInfo {
  state: number;
  totalOwed: string;
  interestOwed: string;
  principal: string;
  dueTimestamp: number;
}

export default function LoanActions({ loans, onRefresh }: { loans: Loan[]; onRefresh: () => void }) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const actionableLoans = loans.filter(
    (l) => l.loanVaultAddress && ["FUNDED", "DRAWN"].includes(l.status)
  );

  if (actionableLoans.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-purple animate-pulse" />
        <h2 className="text-white/40 text-xs font-mono uppercase tracking-wider">Active Loans</h2>
      </div>
      {actionableLoans.map((loan, i) => (
        <motion.div
          key={loan.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.4 }}
        >
          <LoanActionCard
            loan={loan}
            walletClient={walletClient}
            userAddress={address}
            onRefresh={onRefresh}
          />
        </motion.div>
      ))}
    </div>
  );
}

function LoanActionCard({
  loan,
  walletClient,
  userAddress,
  onRefresh,
}: {
  loan: Loan;
  walletClient: any;
  userAddress?: string;
  onRefresh: () => void;
}) {
  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchVaultInfo = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/loans/${loan.id}/vault-info`);
      if (res.ok) {
        setVaultInfo(await res.json());
      }
    } catch {
      // ignore
    }
  }, [loan.id]);

  useEffect(() => {
    fetchVaultInfo();
    const interval = setInterval(fetchVaultInfo, 15000);
    return () => clearInterval(interval);
  }, [fetchVaultInfo]);

  const getProvider = async () => {
    if (!walletClient) throw new Error("Wallet not connected");
    return new BrowserProvider(walletClient.transport);
  };

  const handleDraw = async () => {
    setLoading(true);
    setError(null);
    setTxStatus("Sending draw transaction...");
    try {
      const provider = await getProvider();
      const signer = await provider.getSigner();
      const vault = new Contract(loan.loanVaultAddress!, LOAN_VAULT_ABI, signer);

      const tx = await vault.draw();
      setTxStatus("Waiting for confirmation...");
      await tx.wait();

      setTxStatus("Funds drawn successfully!");
      setTimeout(() => {
        setTxStatus(null);
        onRefresh();
        fetchVaultInfo();
      }, 2000);
    } catch (err: any) {
      setError(err.shortMessage || err.message || "Draw failed");
      setTxStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRepay = async () => {
    if (!vaultInfo) return;
    setLoading(true);
    setError(null);
    setTxStatus("Approving USDT spend...");
    try {
      const provider = await getProvider();
      const signer = await provider.getSigner();

      const usdt = new Contract(USDT_ADDRESS, ERC20_ABI, signer);
      const totalOwed = BigInt(vaultInfo.totalOwed);
      const MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

      const currentAllowance = await usdt.allowance(userAddress, loan.loanVaultAddress);
      if (BigInt(currentAllowance) < totalOwed) {
        const approveTx = await usdt.approve(loan.loanVaultAddress, MAX_UINT256);
        setTxStatus("Waiting for approval confirmation...");
        await approveTx.wait(2);
      }

      setTxStatus("Sending repay transaction...");
      const vault = new Contract(loan.loanVaultAddress!, LOAN_VAULT_ABI, signer);
      const repayTx = await vault.repay();
      setTxStatus("Waiting for confirmation...");
      await repayTx.wait();

      setTxStatus("Updating credit score...");
      try {
        await fetch(`${API_URL}/loans/${loan.id}/notify-repay`, { method: "POST" });
      } catch {
        // Non-critical
      }

      setTxStatus("Loan repaid successfully! Credit score updated.");
      setTimeout(() => {
        setTxStatus(null);
        onRefresh();
        fetchVaultInfo();
      }, 2000);
    } catch (err: any) {
      setError(err.shortMessage || err.message || "Repay failed");
      setTxStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const stateLabel = vaultInfo ? VAULT_STATES[vaultInfo.state] || "Unknown" : loan.status;
  const now = Math.floor(Date.now() / 1000);
  const isOverdue = vaultInfo && vaultInfo.dueTimestamp > 0 && now > vaultInfo.dueTimestamp;
  const timeLeft = vaultInfo && vaultInfo.dueTimestamp > 0 ? vaultInfo.dueTimestamp - now : 0;
  const daysLeft = Math.max(0, Math.floor(timeLeft / 86400));
  const hoursLeft = Math.max(0, Math.floor((timeLeft % 86400) / 3600));

  return (
    <div className="glass rounded-2xl p-5 hover-glow gradient-border">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-white font-semibold text-lg">
              {formatUsdt(loan.termsPrincipal || "0")}
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium ${
                stateLabel === "Funded"
                  ? "status-funded"
                  : stateLabel === "Drawn"
                  ? "status-drawn"
                  : stateLabel === "Repaid"
                  ? "status-repaid"
                  : "status-pending"
              }`}
            >
              {stateLabel}
            </span>
          </div>
          <p className="text-xs text-white/30 font-mono">
            vault: {loan.loanVaultAddress?.slice(0, 10)}...{loan.loanVaultAddress?.slice(-8)}
          </p>
        </div>

        {vaultInfo && vaultInfo.dueTimestamp > 0 && (
          <div className={`text-right ${isOverdue ? "text-red-400" : "text-white/40"}`}>
            <p className="text-xs font-mono font-medium">
              {isOverdue ? "OVERDUE" : `${daysLeft}d ${hoursLeft}h left`}
            </p>
            <p className="text-[10px] text-white/20 mt-0.5">
              Due: {new Date(vaultInfo.dueTimestamp * 1000).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      {/* Vault details */}
      {vaultInfo && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Principal", value: formatUsdt(vaultInfo.principal), color: "text-white" },
            { label: "Interest", value: formatUsdt(vaultInfo.interestOwed), color: "text-amber-400" },
            { label: "Total Owed", value: formatUsdt(vaultInfo.totalOwed), color: "text-white font-bold" },
          ].map((item) => (
            <div key={item.label} className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-[10px] text-white/30 font-mono uppercase">{item.label}</p>
              <p className={`text-sm ${item.color} font-mono mt-1`}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {loan.status === "FUNDED" && vaultInfo?.state === 1 && (
          <button
            onClick={handleDraw}
            disabled={loading || !walletClient}
            className="flex-1 relative py-3 rounded-xl text-white font-medium text-sm overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple to-indigo-600" />
            <div className="absolute inset-0 glow-purple opacity-50" />
            <span className="relative">{loading ? "Processing..." : "Draw Funds"}</span>
          </button>
        )}

        {(loan.status === "DRAWN" || vaultInfo?.state === 2) && (
          <button
            onClick={handleRepay}
            disabled={loading || !walletClient}
            className="flex-1 relative py-3 rounded-xl text-white font-medium text-sm overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-teal to-emerald-600" />
            <div className="absolute inset-0 glow-teal opacity-50" />
            <span className="relative">
              {loading ? "Processing..." : `Repay ${vaultInfo ? formatUsdt(vaultInfo.totalOwed) : ""}`}
            </span>
          </button>
        )}
      </div>

      {/* Status messages */}
      {txStatus && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 text-blue-400 text-sm font-mono"
        >
          <span className="animate-pulse mr-2">&#9679;</span>
          {txStatus}
        </motion.div>
      )}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm"
        >
          {error}
        </motion.div>
      )}

      {!walletClient && (
        <p className="mt-3 text-xs text-white/20 font-mono">Connect wallet to interact</p>
      )}
    </div>
  );
}

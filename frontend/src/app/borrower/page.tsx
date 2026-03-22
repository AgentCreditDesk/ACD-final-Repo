"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import ScoreCard from "@/components/ScoreCard";
import LoanRequestForm from "@/components/LoanRequestForm";
import LoanTable from "@/components/LoanTable";
import LoanActions from "@/components/LoanActions";
import { borrowersApi, loansApi } from "@/lib/api";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function BorrowerPage() {
  const { address, isConnected } = useAccount();
  const [profile, setProfile] = useState<any>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async (addr: string) => {
    setLoading(true);
    try {
      const [scoreData, loansData] = await Promise.all([
        borrowersApi.getScore(addr),
        loansApi.getByBorrower(addr),
      ]);
      setProfile(scoreData);
      setLoans(loansData);
    } catch (err) {
      console.error("Failed to load borrower data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      loadData(address);
    }
  }, [isConnected, address, loadData]);

  const handleRefresh = () => {
    if (address) loadData(address);
  };

  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="glass rounded-2xl p-10 text-center gradient-border"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-teal/20 to-purple/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Borrower Portal</h2>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">
            Connect your wallet to view your credit score, request loans, draw funds, and repay.
          </p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Borrower Portal</h1>
          <p className="text-white/30 text-sm font-mono mt-1">{address}</p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 glass rounded-xl text-white/50 hover:text-white/80 transition-all text-sm font-mono hover:glow-teal"
        >
          Refresh
        </button>
      </motion.div>

      {/* Score + Form */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {profile ? (
          <ScoreCard
            score={profile.score}
            loansTaken={profile.loansTaken}
            loansRepaid={profile.loansRepaid}
            loansDefaulted={profile.loansDefaulted}
          />
        ) : (
          <div className="glass rounded-2xl p-6 animate-pulse">
            <div className="h-32 bg-white/[0.03] rounded-xl" />
          </div>
        )}
        <LoanRequestForm borrowerAddress={address!} onSuccess={handleRefresh} />
      </motion.div>

      {/* Active Loans */}
      <motion.div variants={fadeUp}>
        <LoanActions loans={loans} onRefresh={handleRefresh} />
      </motion.div>

      {/* Loan History */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-teal/50" />
          <h2 className="text-white/40 text-xs font-mono uppercase tracking-wider">Loan History</h2>
        </div>
        {loading ? (
          <div className="glass rounded-2xl p-8 animate-pulse">
            <div className="h-32 bg-white/[0.03] rounded-xl" />
          </div>
        ) : (
          <LoanTable loans={loans} showRationale />
        )}
      </motion.div>
    </motion.div>
  );
}

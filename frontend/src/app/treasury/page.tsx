"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import TreasuryPanel from "@/components/TreasuryPanel";
import LoanTable from "@/components/LoanTable";
import DecisionLog from "@/components/DecisionLog";
import EventTimeline from "@/components/EventTimeline";
import { loansApi, treasuryApi } from "@/lib/api";
import { formatBps } from "@/lib/constants";

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function TreasuryPage() {
  const [treasury, setTreasury] = useState<any>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rebalancing, setRebalancing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [treasuryData, loansData, eventsData, policyData] = await Promise.all([
        treasuryApi.getStatus(),
        loansApi.getAll(),
        treasuryApi.getEvents(),
        treasuryApi.getPolicy(),
      ]);
      setTreasury(treasuryData);
      setLoans(loansData);
      setEvents(eventsData);
      setPolicy(policyData);
    } catch (err) {
      console.error("Failed to load treasury data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleRebalance = async () => {
    setRebalancing(true);
    try {
      const result = await treasuryApi.rebalance();
      alert(`Rebalance: ${result.action} (${result.amount})`);
      loadData();
    } catch (err: any) {
      alert(`Rebalance failed: ${err.message}`);
    } finally {
      setRebalancing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 glass rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 glass rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      className="space-y-6"
    >
      {/* ── Header ── */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Treasury Dashboard</h1>
          <p className="text-white/30 text-sm mt-1">
            Real-time autonomous treasury, lending activity, and agent decisions.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRebalance}
            disabled={rebalancing}
            className="px-4 py-2 glass rounded-xl text-purple/70 hover:text-purple transition-all text-sm font-mono hover:glow-purple disabled:opacity-50"
          >
            {rebalancing ? "Rebalancing..." : "Rebalance"}
          </button>
          <button
            onClick={loadData}
            className="px-4 py-2 glass rounded-xl text-white/50 hover:text-white/80 transition-all text-sm font-mono hover:glow-teal"
          >
            Refresh
          </button>
        </div>
      </motion.div>

      {/* ── Treasury Metrics ── */}
      <motion.div variants={fadeUp}>
        {treasury && <TreasuryPanel {...treasury} />}
      </motion.div>

      {/* ── Risk Policy & Score Tiers ── */}
      {policy && (
        <motion.div variants={fadeUp} className="section-card">
          <div className="section-card-header">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal" />
              <h3 className="text-white/60 text-xs font-mono uppercase tracking-widest">Risk Policy & Score Tiers</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Global Limits */}
              <div>
                <h4 className="text-xs text-teal/60 font-mono uppercase tracking-wider mb-4 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  Global Limits
                </h4>
                <div className="space-y-1">
                  {[
                    { label: "Max Exposure", value: `${policy.riskPolicy.maxExposurePct * 100}%` },
                    { label: "Max Per Borrower", value: `${policy.riskPolicy.maxPerBorrowerPct * 100}%` },
                    { label: "Target Utilization", value: `${policy.riskPolicy.targetUtilizationMin * 100}% – ${policy.riskPolicy.targetUtilizationMax * 100}%` },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-center py-2.5 px-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                      <span className="text-white/40 font-mono text-xs">{item.label}</span>
                      <span className="text-white font-mono text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Score Tiers */}
              <div>
                <h4 className="text-xs text-purple/60 font-mono uppercase tracking-wider mb-4 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                  Score Tiers
                </h4>
                <div className="rounded-xl overflow-hidden border border-white/[0.06]">
                  <table className="w-full text-sm font-mono">
                    <thead>
                      <tr className="bg-white/[0.03]">
                        <th className="text-left py-2.5 px-3 text-white/30 text-[10px] uppercase tracking-wider font-medium">Score</th>
                        <th className="text-left py-2.5 px-3 text-white/30 text-[10px] uppercase tracking-wider font-medium">Max Days</th>
                        <th className="text-left py-2.5 px-3 text-white/30 text-[10px] uppercase tracking-wider font-medium">Max %</th>
                        <th className="text-left py-2.5 px-3 text-white/30 text-[10px] uppercase tracking-wider font-medium">APR</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/60 text-xs">
                      {policy.scoreTiers.map((tier: any, i: number) => (
                        <tr key={i} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 px-3 text-teal font-medium">{tier.minScore}–{tier.maxScore}</td>
                          <td className="py-2.5 px-3">{tier.maxDurationDays}d</td>
                          <td className="py-2.5 px-3">{tier.maxPrincipalPct * 100}%</td>
                          <td className="py-2.5 px-3">{formatBps(tier.minAprBps)}–{formatBps(tier.maxAprBps)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Decision Log + Event Timeline ── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DecisionLog loans={loans} />
        <EventTimeline events={events} />
      </motion.div>

      {/* ── All Loans ── */}
      <motion.div variants={fadeUp} className="section-card">
        <div className="section-card-header">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple" />
            <h2 className="text-white/60 text-xs font-mono uppercase tracking-widest">All Loans</h2>
          </div>
          <span className="text-white/20 text-xs font-mono">{loans.length} total</span>
        </div>
        <div className="p-4">
          <LoanTable loans={loans} showBorrower showRationale />
        </div>
      </motion.div>
    </motion.div>
  );
}

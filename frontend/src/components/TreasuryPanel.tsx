"use client";

import { motion } from "framer-motion";
import { formatUsdt } from "@/lib/constants";

interface TreasuryPanelProps {
  walletBalance: string;
  aaveDeposited: string;
  totalTreasury: string;
  outstandingLoans: string;
  loanUtilization: number;
  availableForLoans: string;
}

export default function TreasuryPanel(props: TreasuryPanelProps) {
  const utilizationPct = (props.loanUtilization * 100).toFixed(1);
  const utilizationColor =
    props.loanUtilization >= 0.8
      ? "text-red-400"
      : props.loanUtilization >= 0.6
      ? "text-yellow-400"
      : "text-teal";

  const barColor =
    props.loanUtilization >= 0.8
      ? "from-red-500 to-red-600"
      : props.loanUtilization >= 0.6
      ? "from-yellow-500 to-amber-500"
      : "from-teal to-emerald-500";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Treasury */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="section-card group"
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Total Treasury</p>
            <div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-white font-mono">{formatUsdt(props.totalTreasury)}</p>
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between items-center py-1.5 px-2.5 rounded-lg bg-white/[0.02]">
              <span className="text-white/30 font-mono text-[11px]">Wallet</span>
              <span className="text-white/70 font-mono text-[11px] font-medium">{formatUsdt(props.walletBalance)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 px-2.5 rounded-lg bg-white/[0.02]">
              <span className="text-white/30 font-mono text-[11px]">Aave</span>
              <span className="text-purple/80 font-mono text-[11px] font-medium">{formatUsdt(props.aaveDeposited)}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Outstanding */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="section-card group"
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Outstanding Loans</p>
            <div className="w-8 h-8 rounded-lg bg-purple/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-white font-mono">{formatUsdt(props.outstandingLoans)}</p>
          <div className="mt-4">
            <div className="flex justify-between items-center py-1.5 px-2.5 rounded-lg bg-white/[0.02]">
              <span className="text-white/30 font-mono text-[11px]">Available for Loans</span>
              <span className="text-teal font-mono text-[11px] font-medium">{formatUsdt(props.availableForLoans)}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Utilization */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="section-card group"
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Loan Utilization</p>
            <div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
          </div>
          <p className={`text-2xl font-bold font-mono ${utilizationColor}`}>{utilizationPct}%</p>
          <div className="mt-4">
            <div className="w-full bg-white/[0.06] rounded-full h-2.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(props.loanUtilization * 100, 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" as const, delay: 0.5 }}
                className={`h-2.5 rounded-full bg-gradient-to-r ${barColor}`}
                style={{ boxShadow: "0 0 12px rgba(0, 194, 168, 0.3)" }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-white/20 font-mono">0%</span>
              <span className="text-[10px] text-white/30 font-mono">Target: 60–80%</span>
              <span className="text-[10px] text-white/20 font-mono">100%</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

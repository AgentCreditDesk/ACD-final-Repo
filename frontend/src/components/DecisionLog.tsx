"use client";

import { motion } from "framer-motion";
import { formatUsdt, shortenAddress } from "@/lib/constants";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "status-pending",
  APPROVED: "status-approved",
  REJECTED: "status-rejected",
  FUNDED: "status-funded",
  DRAWN: "status-drawn",
  REPAID: "status-repaid",
  DEFAULTED: "status-defaulted",
};

interface DecisionLogProps {
  loans: any[];
}

export default function DecisionLog({ loans }: DecisionLogProps) {
  const decided = loans.filter((l) => l.status !== "PENDING");

  return (
    <div className="terminal overflow-hidden">
      <div className="terminal-header">
        <div className="terminal-dot bg-red-500/80" />
        <div className="terminal-dot bg-yellow-500/80" />
        <div className="terminal-dot bg-green-500/80" />
        <span className="ml-3 text-xs text-white/30 font-mono">agent-decisions</span>
      </div>

      <div className="p-4">
        {decided.length === 0 ? (
          <p className="text-white/20 text-sm font-mono">
            <span className="text-teal/50">$</span> awaiting decisions...
            <span className="cursor-blink" />
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {decided.map((loan, i) => (
              <motion.div
                key={loan.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.03] hover:border-white/[0.06] transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-teal/50 font-mono text-xs">&gt;</span>
                    <span className="font-mono text-sm text-teal/70">
                      {shortenAddress(loan.borrowerAddress)}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-mono font-medium ${STATUS_STYLES[loan.status] || "status-pending"}`}>
                      {loan.status}
                    </span>
                  </div>
                  <span className="text-sm text-white/60 font-mono">
                    {formatUsdt(loan.termsPrincipal || loan.requestedAmount)}
                  </span>
                </div>
                {loan.decisionRationale && (
                  <p className="text-xs text-white/30 leading-relaxed pl-5">
                    {loan.decisionRationale}
                  </p>
                )}
                <p className="text-[10px] text-white/15 mt-2 font-mono pl-5">
                  {new Date(loan.createdAt).toLocaleString()}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

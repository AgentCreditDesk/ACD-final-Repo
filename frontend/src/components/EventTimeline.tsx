"use client";

import { motion } from "framer-motion";
import { formatUsdt, EVENT_TYPE_LABELS, shortenAddress } from "@/lib/constants";

interface TreasuryEvent {
  id: string;
  type: string;
  amount: string;
  relatedLoanId?: string;
  txHash?: string;
  metadata?: any;
  timestamp: string;
}

interface EventTimelineProps {
  events: TreasuryEvent[];
}

const EVENT_COLORS: Record<string, { dot: string; text: string }> = {
  FUND_LOAN: { dot: "bg-purple", text: "text-purple/80" },
  AAVE_SUPPLY: { dot: "bg-blue-500", text: "text-blue-400/80" },
  AAVE_WITHDRAW: { dot: "bg-orange-500", text: "text-orange-400/80" },
  REPAYMENT_RECEIVED: { dot: "bg-teal", text: "text-teal/80" },
  DEFAULT_MARKED: { dot: "bg-red-500", text: "text-red-400/80" },
  SCORE_UPDATE: { dot: "bg-yellow-500", text: "text-yellow-400/80" },
};

export default function EventTimeline({ events }: EventTimelineProps) {
  return (
    <div className="terminal overflow-hidden">
      <div className="terminal-header">
        <div className="terminal-dot bg-red-500/80" />
        <div className="terminal-dot bg-yellow-500/80" />
        <div className="terminal-dot bg-green-500/80" />
        <span className="ml-3 text-xs text-white/30 font-mono">treasury-events</span>
      </div>

      <div className="p-4">
        {events.length === 0 ? (
          <p className="text-white/20 text-sm font-mono">
            <span className="text-teal/50">$</span> no events recorded
            <span className="cursor-blink" />
          </p>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {events.map((event, idx) => {
              const colors = EVENT_COLORS[event.type] || { dot: "bg-gray-500", text: "text-white/40" };
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03, duration: 0.3 }}
                  className="flex items-start gap-3 py-2.5 group"
                >
                  {/* Timeline */}
                  <div className="flex flex-col items-center pt-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${colors.dot} shrink-0 group-hover:scale-125 transition-transform`}
                      style={{ boxShadow: `0 0 8px ${colors.dot === "bg-teal" ? "rgba(0,194,168,0.4)" : "rgba(139,92,246,0.3)"}` }}
                    />
                    {idx < events.length - 1 && (
                      <div className="w-px h-5 bg-white/[0.05] mt-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium font-mono ${colors.text}`}>
                        {EVENT_TYPE_LABELS[event.type] || event.type}
                      </span>
                      <span className="text-sm text-white/50 font-mono">
                        {formatUsdt(event.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-white/20 font-mono">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                      {event.txHash && (
                        <span className="text-[10px] font-mono text-purple/40">
                          tx:{shortenAddress(event.txHash)}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

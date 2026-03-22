"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView, useSpring, useMotionValue } from "framer-motion";
import { getScoreTierLabel } from "@/lib/constants";

interface ScoreCardProps {
  score: number;
  loansTaken: number;
  loansRepaid: number;
  loansDefaulted: number;
}

function AnimatedScore({ value }: { value: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { damping: 30, stiffness: 60 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (inView) mv.set(value);
  }, [inView, value, mv]);

  useEffect(() => {
    return spring.on("change", (v) => setDisplay(Math.round(v)));
  }, [spring]);

  return <span ref={ref}>{display}</span>;
}

export default function ScoreCard({ score, loansTaken, loansRepaid, loansDefaulted }: ScoreCardProps) {
  const tier = getScoreTierLabel(score);
  const percentage = (score / 1000) * 100;
  const circumference = 2 * Math.PI * 50;
  const strokeDash = (percentage / 100) * circumference;

  const getColors = () => {
    if (score >= 800) return { from: "#00C2A8", to: "#10b981" };
    if (score >= 600) return { from: "#60a5fa", to: "#8b5cf6" };
    return { from: "#fbbf24", to: "#f59e0b" };
  };
  const colors = getColors();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass rounded-2xl p-6 hover-glow"
    >
      <div className="flex items-center gap-2 mb-5">
        <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
        <h3 className="text-white/40 text-xs font-mono uppercase tracking-wider">Credit Score</h3>
      </div>

      <div className="flex items-center gap-8">
        {/* Animated gauge */}
        <div className="relative w-32 h-32 shrink-0">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
            {/* Background track */}
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            {/* Animated arc */}
            <motion.circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="url(#scoreGrad)"
              strokeWidth="8"
              strokeLinecap="round"
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${strokeDash} ${circumference - strokeDash}` }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
              style={{ filter: `drop-shadow(0 0 8px ${colors.from}40)` }}
            />
            <defs>
              <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={colors.from} />
                <stop offset="100%" stopColor={colors.to} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white">
              <AnimatedScore value={score} />
            </span>
            <span className="text-[10px] text-white/30 font-mono">/1000</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-4">
          <div>
            <span
              className="text-sm font-semibold px-3 py-1 rounded-full"
              style={{
                background: `${colors.from}15`,
                color: colors.from,
                border: `1px solid ${colors.from}30`,
              }}
            >
              {tier.label}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Taken", value: loansTaken, color: "text-white" },
              { label: "Repaid", value: loansRepaid, color: "text-teal" },
              { label: "Defaulted", value: loansDefaulted, color: "text-red-400" },
            ].map((s) => (
              <div key={s.label} className="bg-white/[0.03] rounded-xl p-3 text-center">
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

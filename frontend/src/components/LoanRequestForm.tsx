"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { loansApi } from "@/lib/api";

interface LoanRequestFormProps {
  borrowerAddress: string;
  onSuccess?: () => void;
}

export default function LoanRequestForm({ borrowerAddress, onSuccess }: LoanRequestFormProps) {
  const [amount, setAmount] = useState("");
  const [durationDays, setDurationDays] = useState("14");
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e6)).toString();
      const durationSeconds = parseInt(durationDays) * 86400;

      await loansApi.createRequest({
        borrowerAddress,
        amount: amountWei,
        durationSeconds,
        purpose,
      });

      setSuccess(true);
      setAmount("");
      setPurpose("");
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Failed to submit loan request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="glass rounded-2xl p-6 hover-glow"
    >
      <div className="flex items-center gap-2 mb-5">
        <span className="w-1.5 h-1.5 rounded-full bg-purple animate-pulse" />
        <h3 className="text-white/40 text-xs font-mono uppercase tracking-wider">New Loan Request</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-white/40 mb-1.5 font-mono">Amount (USDT)</label>
          <input
            type="number"
            step="0.01"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100.00"
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/20 transition-all font-mono text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1.5 font-mono">Duration</label>
          <select
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/20 transition-all text-sm"
          >
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="21">21 days</option>
            <option value="30">30 days</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1.5 font-mono">Purpose</label>
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Working capital, liquidity provision, etc."
            rows={3}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/20 transition-all resize-none text-sm"
            required
          />
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-teal/10 border border-teal/20 rounded-xl px-4 py-3 text-teal text-sm"
          >
            Loan request submitted! The AI agent will evaluate it shortly.
          </motion.div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full relative py-3.5 rounded-xl text-white font-medium text-sm overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-teal to-purple/60" />
          <div className="absolute inset-0 glow-teal opacity-50" />
          <span className="relative">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Submitting...
              </span>
            ) : (
              "Submit Loan Request"
            )}
          </span>
        </button>
      </form>
    </motion.div>
  );
}

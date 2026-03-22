"use client";

import { motion } from "framer-motion";
import { formatUsdt, formatBps, formatDuration, shortenAddress } from "@/lib/constants";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "status-pending",
  APPROVED: "status-approved",
  REJECTED: "status-rejected",
  FUNDED: "status-funded",
  DRAWN: "status-drawn",
  REPAID: "status-repaid",
  DEFAULTED: "status-defaulted",
};

interface Loan {
  id: string;
  borrowerAddress: string;
  requestedAmount: string;
  requestedDurationSeconds: number;
  purpose: string;
  status: string;
  termsPrincipal?: string;
  termsAprBps?: number;
  dueTimestamp?: number;
  decisionRationale?: string;
  loanVaultAddress?: string;
  createdAt: string;
}

interface LoanTableProps {
  loans: Loan[];
  showBorrower?: boolean;
  showRationale?: boolean;
}

export default function LoanTable({ loans, showBorrower = false, showRationale = false }: LoanTableProps) {
  if (loans.length === 0) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <p className="text-white/30 font-mono text-sm">No loans found</p>
      </div>
    );
  }

  return (
    <div className="terminal overflow-hidden">
      <div className="terminal-header">
        <div className="terminal-dot bg-red-500/80" />
        <div className="terminal-dot bg-yellow-500/80" />
        <div className="terminal-dot bg-green-500/80" />
        <span className="ml-3 text-xs text-white/30 font-mono">loan-history</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {showBorrower && <th className="px-4 py-3 text-left text-[10px] font-mono text-white/30 uppercase tracking-wider">Borrower</th>}
              <th className="px-4 py-3 text-left text-[10px] font-mono text-white/30 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-left text-[10px] font-mono text-white/30 uppercase tracking-wider">Duration</th>
              <th className="px-4 py-3 text-left text-[10px] font-mono text-white/30 uppercase tracking-wider">APR</th>
              <th className="px-4 py-3 text-left text-[10px] font-mono text-white/30 uppercase tracking-wider">Purpose</th>
              <th className="px-4 py-3 text-left text-[10px] font-mono text-white/30 uppercase tracking-wider">Status</th>
              {showRationale && <th className="px-4 py-3 text-left text-[10px] font-mono text-white/30 uppercase tracking-wider">Rationale</th>}
              <th className="px-4 py-3 text-left text-[10px] font-mono text-white/30 uppercase tracking-wider">Vault</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan, i) => (
              <motion.tr
                key={loan.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
              >
                {showBorrower && (
                  <td className="px-4 py-3 text-sm font-mono text-teal/70">
                    {shortenAddress(loan.borrowerAddress)}
                  </td>
                )}
                <td className="px-4 py-3 text-sm text-white font-medium font-mono">
                  {formatUsdt(loan.termsPrincipal || loan.requestedAmount)}
                </td>
                <td className="px-4 py-3 text-sm text-white/50 font-mono">
                  {formatDuration(loan.requestedDurationSeconds)}
                </td>
                <td className="px-4 py-3 text-sm text-white/50 font-mono">
                  {loan.termsAprBps ? formatBps(loan.termsAprBps) : "--"}
                </td>
                <td className="px-4 py-3 text-sm text-white/40 max-w-[200px] truncate">
                  {loan.purpose}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium ${STATUS_STYLES[loan.status] || "status-pending"}`}>
                    {loan.status}
                  </span>
                </td>
                {showRationale && (
                  <td className="px-4 py-3 text-sm text-white/30 max-w-[280px]">
                    <p className="truncate" title={loan.decisionRationale || ""}>
                      {loan.decisionRationale || "--"}
                    </p>
                  </td>
                )}
                <td className="px-4 py-3 text-sm font-mono text-purple/60">
                  {loan.loanVaultAddress ? shortenAddress(loan.loanVaultAddress) : "--"}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

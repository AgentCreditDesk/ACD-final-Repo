/**
 * ACD Autonomous Underwriter Agent
 *
 * Implements the HEARTBEAT.md loop:
 * - Every cycle: check pending loans → evaluate → decide → fund if approved
 * - Every 5th cycle: rebalance treasury (Aave supply/withdraw)
 *
 * Uses Groq LLM (llama-3.3-70b-versatile) for autonomous decision-making.
 */

import "dotenv/config";

const BACKEND = process.env.ACD_BACKEND_URL || "http://localhost:3001";
const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL || "30000"); // 30s default
const REBALANCE_EVERY = 5; // every 5th heartbeat

if (!GROQ_KEY) {
  console.error("[AGENT] GROQ_API_KEY is required in .env");
  process.exit(1);
}

let heartbeatCount = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function api(path, options = {}) {
  const url = `${BACKEND}${path}`;
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API ${res.status}: ${body}`);
    }
    return res.json();
  } catch (err) {
    console.error(`[API] ${options.method || "GET"} ${path} failed:`, err.message);
    return null;
  }
}

async function callGroq(systemPrompt, userPrompt) {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 512,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[GROQ] Error ${res.status}:`, err);
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    return JSON.parse(content);
  } catch (err) {
    console.error("[GROQ] Request failed:", err.message);
    return null;
  }
}

// ─── System Prompt (kept minimal to stay under Groq token limits) ────────────

const UNDERWRITER_SYSTEM = `You are an autonomous loan underwriter for Agent Credit Desk (ACD). You evaluate loan requests and return JSON decisions.

SCORE TIERS:
- 800-1000: max 30 days, max 10% of treasury, APR 500-800 bps
- 600-799: max 21 days, max 5% of treasury, APR 800-1200 bps
- 0-599: max 14 days, max 2% of treasury, APR 1200-2000 bps

RULES:
- Max 50% of treasury in outstanding loans
- Max 10% of treasury per single borrower
- Reduce principal if request exceeds limits (don't auto-reject)
- REJECT if borrower has ANY defaults (1+ defaults = permanently blacklisted, zero tolerance)
- Low utilization (<60%): be more lenient
- High utilization (>80%): be conservative
- All USDT amounts in 6-decimal base units (1 USDT = 1000000)
- APR in basis points (500 bps = 5%)
- Duration in seconds (86400 = 1 day)

RESPOND WITH ONLY valid JSON:
{"approve":true/false,"principal":"amount_string","aprBps":number,"durationSeconds":number,"rationale":"explanation"}
If rejecting, set approve to false and include rationale.`;

// ─── Underwriting Loop ──────────────────────────────────────────────────────

async function processLoan(loan, treasury) {
  console.log(`\n[UNDERWRITE] Processing loan ${loan.id}`);
  console.log(`  Borrower: ${loan.borrowerAddress}`);
  console.log(`  Requested: ${loan.requestedAmount} (${Number(loan.requestedAmount) / 1e6} USDT)`);
  console.log(`  Duration: ${loan.requestedDurationSeconds}s (${Math.round(loan.requestedDurationSeconds / 86400)} days)`);
  console.log(`  Purpose: ${loan.purpose}`);

  // Fetch borrower credit score
  const score = await api(`/borrowers/${loan.borrowerAddress}/score`);
  if (!score) {
    console.error(`  [SKIP] Could not fetch credit score`);
    return;
  }
  const tierName = score.tier
    ? `Score ${score.tier.minScore}-${score.tier.maxScore}, max ${score.tier.maxDurationDays} days, max ${(score.tier.maxPrincipalPct * 100).toFixed(0)}% of treasury, APR ${score.tier.minAprBps}-${score.tier.maxAprBps} bps`
    : "unknown";
  console.log(`  Credit Score: ${score.score} | Tier: ${tierName}`);

  // Build the prompt for Groq
  const totalTreasury = Number(treasury.totalTreasury || 0) / 1e6;
  const availableForLoans = Number(treasury.availableForLoans || 0) / 1e6;
  const aaveDeposited = Number(treasury.aaveDeposited || 0) / 1e6;
  const outstandingLoans = Number(treasury.outstandingLoans || 0) / 1e6;

  const userPrompt = `Evaluate this loan request:

LOAN REQUEST:
- Borrower: ${loan.borrowerAddress}
- Requested Amount: ${Number(loan.requestedAmount) / 1e6} USDT
- Requested Duration: ${Math.round(loan.requestedDurationSeconds / 86400)} days (${loan.requestedDurationSeconds} seconds)
- Purpose: ${loan.purpose}

BORROWER PROFILE:
- Credit Score: ${score.score}
- Tier: ${tierName}
- Loans Taken: ${score.loansTaken || 0}
- Loans Repaid: ${score.loansRepaid || 0}
- Loans Defaulted: ${score.loansDefaulted || 0}

TREASURY STATE:
- Total Treasury: ${totalTreasury} USDT
- Available for Loans: ${availableForLoans} USDT
- In Aave (yield): ${aaveDeposited} USDT
- Outstanding Loans: ${outstandingLoans} USDT
- Loan Utilization: ${(treasury.loanUtilization * 100).toFixed(1)}%

Make your underwriting decision. Return JSON only.`;

  const decision = await callGroq(UNDERWRITER_SYSTEM, userPrompt);
  if (!decision) {
    console.error(`  [SKIP] Groq returned no decision`);
    return;
  }

  console.log(`  Decision: ${decision.approve ? "APPROVED" : "REJECTED"}`);
  console.log(`  Rationale: ${decision.rationale}`);
  if (decision.approve) {
    console.log(`  Principal: ${decision.principal} (${Number(decision.principal) / 1e6} USDT)`);
    console.log(`  APR: ${decision.aprBps} bps (${(decision.aprBps / 100).toFixed(1)}%)`);
    console.log(`  Duration: ${decision.durationSeconds}s (${Math.round(decision.durationSeconds / 86400)} days)`);
  }

  // Post decision to backend
  const decisionPayload = decision.approve
    ? {
        approve: true,
        principal: String(decision.principal),
        aprBps: decision.aprBps,
        durationSeconds: decision.durationSeconds,
        rationale: decision.rationale,
      }
    : {
        approve: false,
        rationale: decision.rationale,
      };

  const result = await api(`/loans/${loan.id}/decision`, {
    method: "POST",
    body: JSON.stringify(decisionPayload),
  });

  if (!result) {
    console.error(`  [ERROR] Failed to post decision`);
    return;
  }
  console.log(`  Decision posted successfully. Status: ${result.status}`);

  // If approved, fund the loan
  if (decision.approve) {
    console.log(`  [FUND] Deploying vault and funding loan...`);
    const fundResult = await api(`/loans/${loan.id}/fund`, { method: "POST" });
    if (fundResult) {
      console.log(`  [FUND] Loan funded! Vault: ${fundResult.vaultAddress || "deployed"}`);
    } else {
      console.error(`  [FUND] Funding failed — may need manual retry`);
    }
  }
}

async function underwritingLoop() {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`[HEARTBEAT #${heartbeatCount}] ${new Date().toISOString()}`);
  console.log(`${"═".repeat(60)}`);

  // Fetch pending loans
  const pending = await api("/loans/pending");
  if (!pending || pending.length === 0) {
    console.log("[UNDERWRITE] No pending loans. HEARTBEAT_OK");
    return;
  }

  console.log(`[UNDERWRITE] Found ${pending.length} pending loan(s)`);

  // Fetch treasury status once for all evaluations
  const treasury = await api("/treasury/status");
  if (!treasury) {
    console.error("[UNDERWRITE] Could not fetch treasury status, skipping cycle");
    return;
  }

  // Process each loan (oldest first)
  const sorted = pending.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const loan of sorted) {
    await processLoan(loan, treasury);
    // Small delay between loans to respect Groq rate limits
    if (sorted.indexOf(loan) < sorted.length - 1) {
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

// ─── Treasury Rebalancing ───────────────────────────────────────────────────

async function rebalanceLoop() {
  console.log(`\n[REBALANCE] Running treasury rebalance check...`);

  const treasury = await api("/treasury/status");
  if (!treasury) {
    console.error("[REBALANCE] Could not fetch treasury status");
    return;
  }

  const utilization = treasury.loanUtilization || 0;
  console.log(`[REBALANCE] Current utilization: ${(utilization * 100).toFixed(1)}%`);

  if (utilization < 0.6) {
    console.log("[REBALANCE] Below 60% — supplying idle capital to Aave");
    const result = await api("/treasury/rebalance", { method: "POST" });
    if (result) {
      console.log("[REBALANCE] Rebalance complete:", JSON.stringify(result));
    }
  } else if (utilization > 0.8) {
    console.log("[REBALANCE] Above 80% — withdrawing from Aave for liquidity");
    const result = await api("/treasury/rebalance", { method: "POST" });
    if (result) {
      console.log("[REBALANCE] Rebalance complete:", JSON.stringify(result));
    }
  } else {
    console.log("[REBALANCE] Utilization in target band (60-80%). No action needed.");
  }
}

// ─── Main Loop ──────────────────────────────────────────────────────────────

async function heartbeat() {
  heartbeatCount++;

  try {
    await underwritingLoop();

    // Rebalance every Nth heartbeat
    if (heartbeatCount % REBALANCE_EVERY === 0) {
      await rebalanceLoop();
    }
  } catch (err) {
    console.error("[HEARTBEAT] Unexpected error:", err.message);
  }
}

// Startup
console.log("╔══════════════════════════════════════════════════════════╗");
console.log("║    ACD Autonomous Underwriter Agent                     ║");
console.log("║    Powered by Groq (llama-3.3-70b-versatile)           ║");
console.log("╠══════════════════════════════════════════════════════════╣");
console.log(`║  Backend:    ${BACKEND.padEnd(43)}║`);
console.log(`║  Interval:   ${(HEARTBEAT_INTERVAL / 1000 + "s").padEnd(43)}║`);
console.log(`║  Rebalance:  every ${REBALANCE_EVERY} heartbeats${" ".repeat(29)}║`);
console.log("╚══════════════════════════════════════════════════════════╝");
console.log("");

// Run first heartbeat immediately
heartbeat();

// Then schedule recurring
setInterval(heartbeat, HEARTBEAT_INTERVAL);

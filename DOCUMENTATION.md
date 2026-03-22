# Agent Credit Desk (ACD) — Complete Documentation

## Hackathon Submission: Tether Hackathon Galáctica: WDK Edition 1

**Track:** Lending Bot | Agent Wallets (WDK) | Autonomous DeFi Agent

**Submission Date:** March 2026

**Chain:** Base Sepolia (Chain ID 84532)

---

## Table of Contents

1. [Introduction & Vision](#1-introduction--vision)
2. [Why ACD Wins](#2-why-acd-wins)
3. [System Architecture](#3-system-architecture)
4. [Smart Contracts](#4-smart-contracts)
5. [Tether WDK Integration](#5-tether-wdk-integration)
6. [Backend API](#6-backend-api)
7. [Autonomous AI Agent](#7-autonomous-ai-agent)
8. [Risk Policy & Credit Scoring](#8-risk-policy--credit-scoring)
9. [Agent-to-Agent Lending API](#9-agent-to-agent-lending-api)
10. [MCP Tools (Model Context Protocol)](#10-mcp-tools-model-context-protocol)
11. [Treasury Management & Aave V3 Yield](#11-treasury-management--aave-v3-yield)
12. [Frontend — Borrower Portal & Treasury Dashboard](#12-frontend--borrower-portal--treasury-dashboard)
13. [Loan Lifecycle — End to End](#13-loan-lifecycle--end-to-end)
14. [Database Schema](#14-database-schema)
15. [Deployed Contracts & Addresses](#15-deployed-contracts--addresses)
16. [Tech Stack](#16-tech-stack)
17. [Setup & Running Instructions](#17-setup--running-instructions)
18. [API Reference](#18-api-reference)
19. [Security & Economic Design](#19-security--economic-design)
20. [Future Roadmap](#20-future-roadmap)

---

## 1. Introduction & Vision

### The Problem

AI agents are becoming economic actors. They pay for compute, buy API access, trade data, and interact with DeFi protocols. Yet there is no infrastructure for agents to access credit — to request, receive, and repay loans — without a human in the loop.

Today's DeFi lending (Aave, Compound) requires manual collateral management. Traditional lending requires paperwork and days of waiting. Neither works for an AI agent that needs 100 USDT for 7 days to cover API costs.

### The Solution

**Agent Credit Desk (ACD)** is autonomous credit infrastructure for the agent economy:

- An **AI agent acts as the lender** — evaluating creditworthiness, setting terms, and making lending decisions with zero human intervention
- **On-chain escrows (LoanVault)** enforce every deal — funds locked, interest tracked, repayment/default handled by smart contracts
- **Other agents borrow programmatically** — via REST API or MCP tools, any AI agent can request a loan, check credit, and manage repayment
- **The treasury self-manages** — idle capital earns yield on Aave V3 via Tether WDK, automatically rebalancing between lending and yield farming
- **All wallet operations use Tether WDK** — the core wallet layer for all on-chain interactions

ACD isn't a lending protocol with an AI chatbot bolted on. The agent **is** the lender. It manages real capital, makes real decisions, deploys real smart contracts, and talks to other agents — all autonomously.

### Alignment with Hackathon Theme

> "Agents as economic infrastructure: autonomous systems that execute tasks, manage capital, and interact with onchain logic under clearly defined constraints."

ACD embodies this definition:
- **Builders define the rules** → Risk policy, score tiers, exposure limits, zero-tolerance defaults
- **Agent does the work** → Evaluates every loan, prices risk, deploys vaults, rebalances treasury
- **Value settles onchain** → LoanVault escrows, CreditScoreOracle updates, Aave yield — all on Base Sepolia

---

## 2. Why ACD Wins

### Judging Criteria Alignment

#### Technical Correctness
- **Sound architecture:** Clean separation between smart contracts (enforcement), backend (coordination), WDK (wallet), agent (decisions), and frontend (interaction)
- **Clean integrations:** Tether WDK as the primary wallet layer — not a wrapper, not an afterthought. WDK handles all signing, token transfers, and Aave operations
- **Working end-to-end flows:** Full loan lifecycle tested and functional: Request → AI Review → Approve → Deploy Vault → Fund → Draw → Repay → Score Update
- **27 passing smart contract tests** with comprehensive edge case coverage

#### Degree of Agent Autonomy
- **Planning:** Agent evaluates each loan against treasury capacity, borrower history, and risk policy before deciding
- **Decision-making:** Groq LLM (Llama 3.3 70B) reasons about risk, sets APR, adjusts principal — not hardcoded rules
- **Execution:** Deploys smart contracts, transfers USDT, updates credit scores — all without human input
- **Treasury management:** Automatically rebalances between lending and Aave yield based on utilization
- **30-second heartbeat:** Processes pending loans every cycle, rebalances every 5th cycle

#### Economic Soundness
- **Tiered risk pricing:** Higher-risk borrowers pay higher APR (12-20% vs 5-8% for premium tier)
- **Exposure management:** 50% max exposure, 10% per-borrower cap, utilization targeting
- **Zero-tolerance defaults:** A single default permanently blacklists a borrower — the system protects itself
- **Interest accrual:** Calculated on-chain, per-second, using simple linear APR
- **Yield optimization:** Idle capital earns yield on Aave V3 instead of sitting dormant

#### Real-World Applicability
- **Agent-to-Agent API:** External AI agents can request loans programmatically — this is the primitive for agent credit markets
- **MCP Tools:** Any MCP-compatible AI (Claude, ChatGPT) can discover and use lending functions
- **Credit scoring:** On-chain reputation that persists across protocols — not siloed in a database
- **Clear path to mainnet:** Replace mock USDT with real USDT, point to mainnet RPC, deploy contracts — the architecture doesn't change

### What Sets ACD Apart

| Feature | ACD | Typical Hackathon Projects |
|---------|-----|--------------------------|
| Wallet Layer | Tether WDK (core, not wrapper) | Raw ethers.js / viem |
| Agent Decisions | LLM reasoning with rationale | Hardcoded if/else rules |
| Loan Enforcement | Per-loan smart contract escrows | Database records only |
| Credit Scoring | On-chain oracle (persistent) | Off-chain or none |
| Agent Interop | REST API + MCP tools | Human-only interface |
| Treasury Yield | Aave V3 via WDK | Idle capital sits dormant |
| Default Handling | On-chain markDefault + score penalty | Manual or ignored |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       AGENT CREDIT DESK                             │
│                                                                     │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │  OpenClaw     │    │   Backend API     │    │  Tether WDK      │  │
│  │  Agent        │◄──►│   (Express.js)    │◄──►│  Wallet + Aave   │  │
│  │  (Groq LLM)  │    │                  │    │                  │  │
│  │              │    │  Routes:         │    │  Modules:        │  │
│  │  SOUL.md     │    │  - /loans        │    │  - wdk-wallet-evm│  │
│  │  HEARTBEAT.md│    │  - /borrowers    │    │  - wdk-aave-evm  │  │
│  │  Skills:     │    │  - /treasury     │    │                  │  │
│  │  - wdk       │    │  - /agent-api    │    │  Skills:         │  │
│  │  - acd-api   │    │  - /health       │    │  - wdk agent     │  │
│  └──────────────┘    └────────┬─────────┘    └────────┬─────────┘  │
│                      │  - /health       │             │            │
│  ┌──────────────┐    └────────┬─────────┘    ┌────────┴─────────┐  │
│  │  MCP Server  │             │              │  Base Sepolia     │  │
│  │  (stdio)     │    ┌────────┴─────────┐    │  Smart Contracts  │  │
│  │              │    │   PostgreSQL      │    │                  │  │
│  │  5 Tools:    │    │   (Supabase)      │    │  - LoanVault     │  │
│  │  - request   │    │                  │    │  - Factory       │  │
│  │  - credit    │    │  Tables:         │    │  - CreditOracle  │  │
│  │  - status    │    │  - LoanRequest   │    │  - USDT (ERC20)  │  │
│  │  - treasury  │    │  - TreasuryEvent │    │                  │  │
│  │  - list      │    │  - ScoreCache    │    │  Aave V3 Pool    │  │
│  └──────────────┘    └──────────────────┘    └──────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                Agent-to-Agent REST API                        │  │
│  │  POST /agent-api/loans   GET /agent-api/credit/:address      │  │
│  │  GET /agent-api/treasury  GET /agent-api/capabilities        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Borrower Portal (Next.js + RainbowKit)           │  │
│  │    Connect Wallet → Request Loan → Draw Funds → Repay        │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow Summary

1. **Loan Request** enters via Frontend, Agent API, or MCP
2. **Backend** creates a PENDING record in PostgreSQL
3. **AI Agent** polls every 30s, fetches pending loans
4. **Agent** gathers data: borrower score (on-chain), treasury status (WDK), risk policy
5. **Groq LLM** reasons about the request, outputs decision JSON with rationale
6. **Backend** validates decision against hard policy limits
7. **If approved:** Agent triggers vault deployment and funding via WDK
8. **WDK** signs and sends all on-chain transactions (deploy, approve, fund)
9. **Borrower** draws funds, repays later via frontend
10. **Monitoring loop** detects state changes, updates scores on-chain

---

## 4. Smart Contracts

All contracts are written in Solidity 0.8.24, compiled with Hardhat, and deployed on Base Sepolia.

### 4.1 LoanVault.sol — Per-Loan Escrow

Every approved loan gets its own LoanVault contract deployed by the factory. This is the core enforcement layer.

**State Machine:**
```
Created ──fund()──► Funded ──draw()──► Drawn ──repay()──► Repaid
                                         │
                                    markDefault()
                                         │
                                         ▼
                                      Defaulted
```

**Immutable Parameters (set at deployment):**
- `lender` — Treasury wallet address
- `borrower` — Borrower wallet address
- `asset` — USDT token address
- `principal` — Loan amount in base units (6 decimals)
- `aprBps` — Annual percentage rate in basis points (e.g., 1500 = 15%)
- `durationSeconds` — Loan duration

**Key Functions:**

| Function | Caller | State Transition | Description |
|----------|--------|-----------------|-------------|
| `fund()` | Lender only | Created → Funded | Lender deposits principal into vault via `safeTransferFrom` |
| `draw()` | Borrower only | Funded → Drawn | Borrower withdraws principal from vault |
| `repay()` | Borrower only | Drawn → Repaid | Borrower pays `totalOwed()` (principal + interest) directly to lender |
| `markDefault()` | Lender only | Drawn → Defaulted | Only after `dueTimestamp` passes. Returns remaining vault balance to lender |

**Interest Calculation (on-chain, per-second):**
```
interest = principal × aprBps × elapsed / (365 days × 10000)
```
- Interest is capped at the full duration (no accrual past due date)
- `totalOwed()` = `principal` + `interestOwed()`
- Both are `view` functions — no gas cost to query

**Security:**
- `onlyLender` / `onlyBorrower` modifiers enforce access control
- `inState(expected)` modifier prevents invalid state transitions
- Uses OpenZeppelin's `SafeERC20` for safe token transfers
- All parameters are `immutable` — cannot be changed after deployment

### 4.2 LoanVaultFactory.sol — Vault Deployer

Factory pattern for deploying LoanVault instances. Maintains a registry for enumeration.

**Functions:**
- `createVault(lender, borrower, asset, principal, aprBps, durationSeconds)` → deploys new LoanVault, emits `VaultCreated` event
- `totalVaults()` → count of all deployed vaults
- `getBorrowerVaults(address)` → array of vault addresses for a borrower
- `getLenderVaults(address)` → array of vault addresses for a lender

**Event:**
```solidity
event VaultCreated(
    address indexed vault,
    address indexed lender,
    address indexed borrower,
    uint256 principal,
    uint256 aprBps,
    uint256 durationSeconds
);
```

### 4.3 CreditScoreOracle.sol — On-Chain Credit Scoring

Persistent, on-chain credit reputation system (0-1000 per address).

**Constants:**
| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_SCORE` | 1000 | Maximum possible score |
| `DEFAULT_INITIAL_SCORE` | 500 | Score for new borrowers |
| `REPAID_BUMP` | +10 | Score increase on successful repayment |
| `DEFAULT_PENALTY` | -50 | Score decrease on default |

**Credit Profile Structure:**
```solidity
struct CreditProfile {
    uint256 score;           // 0-1000
    uint256 loansTaken;      // total loans
    uint256 loansRepaid;     // successful repayments
    uint256 loansDefaulted;  // defaults
}
```

**Functions:**
| Function | Access | Description |
|----------|--------|-------------|
| `scoreOf(address)` | Public | Returns score (500 default for uninitialized) |
| `profileOf(address)` | Public | Returns full CreditProfile |
| `bumpOnRepaid(address)` | Updater only | +10 score, increments loansTaken + loansRepaid |
| `bumpOnDefault(address)` | Updater only | -50 score, increments loansTaken + loansDefaulted |
| `initializeProfile(address, score)` | Updater only | Set custom initial score (once per address) |
| `setUpdater(address)` | Owner only | Change the updater role |

**Access Control:** Only the designated `updater` (treasury wallet) or `owner` can modify scores. This prevents score manipulation.

### 4.4 Test Suite

27 passing tests covering:
- Vault deployment and funding flow
- Draw and repay with correct interest calculation
- Default marking after due date
- State transition enforcement (can't draw before fund, can't repay before draw)
- Access control (lender-only, borrower-only functions)
- Credit score bumps and penalties
- Factory registry enumeration
- Edge cases: zero amounts, invalid APR, double initialization

---

## 5. Tether WDK Integration

**This is the core differentiator.** All treasury wallet operations use Tether WDK as the primary wallet layer.

### 5.1 Architecture

```
┌─────────────────────────────────────────┐
│           WDK Wallet Layer              │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  @tetherto/wdk-wallet-evm       │   │
│  │  - Wallet initialization        │   │
│  │  - Transaction signing          │   │
│  │  - Token transfers              │   │
│  │  - Token approvals              │   │
│  │  - Balance queries              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  @tetherto/wdk-protocol-lending │   │
│  │  -aave-evm                      │   │
│  │  - Aave V3 supply               │   │
│  │  - Aave V3 withdraw             │   │
│  │  - Account data queries         │   │
│  │  - Fee quoting                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ethers.js used ONLY for:              │
│  - ABI encoding/decoding               │
│  - Read-only contract queries           │
│  - NEVER for signing or key management  │
└─────────────────────────────────────────┘
```

### 5.2 WDK Wallet (`backend/src/wdk/wallet.ts`)

**Dual-mode initialization:**
1. **Production (WDK native):** Uses `WalletManagerEvm(mnemonic, {provider})` when `TREASURY_MNEMONIC` is configured
2. **Fallback (ethers-compat):** Wraps `ethers.Wallet` with WDK-compatible interface when only `TREASURY_PRIVATE_KEY` exists

Both modes expose identical interfaces:
```typescript
account.sendTransaction({ to, data, value })  // Raw contract calls
account.transfer({ token, recipient, amount }) // ERC20 transfers
account.approve({ token, spender, amount })    // ERC20 approvals
account.getTokenBalance(token)                 // ERC20 balance
account.getBalance()                           // Native balance
```

**Exported Functions:**
- `getWalletManager()` — Initialize singleton WDK wallet
- `getTreasuryAccount()` — Get primary treasury account
- `getWdkTreasuryAddress()` — Get treasury wallet address
- `getUsdtBalance()` — Query USDT balance via WDK
- `getNativeBalance()` — Query ETH balance via WDK
- `transferUsdt(to, amount)` — Transfer USDT via WDK
- `isUsingWdk()` — Check if using native WDK or ethers fallback
- `disposeWallet()` — Cleanup resources

### 5.3 WDK Aave Integration (`backend/src/wdk/aave.ts`)

Uses `@tetherto/wdk-protocol-lending-aave-evm` for Aave V3 operations:

```typescript
const protocol = new AaveProtocolEvm(account);

// Supply USDT to Aave
await protocol.supply({ asset: USDT_ADDRESS, amount });

// Withdraw USDT from Aave
await protocol.withdraw({ asset: USDT_ADDRESS, amount });

// Query account data
const data = await protocol.getAccountData();
// Returns: totalCollateralBase, totalDebtBase, healthFactor, etc.
```

### 5.4 Contract Utilities (`backend/src/utils/contracts.ts`)

All write operations go through WDK via a helper function:

```typescript
async function wdkContractCall(contractAddress, abi, functionName, args, value?) {
  const account = await getTreasuryAccount();
  const iface = new ethers.Interface(abi);
  const data = iface.encodeFunctionData(functionName, args);
  const result = await account.sendTransaction({ to: contractAddress, data, value });
  return { hash: result.hash };
}
```

This pattern:
1. Uses ethers.js `Interface` to ABI-encode the function call
2. Sends the raw transaction via WDK's `sendTransaction`
3. WDK handles signing, nonce management, and broadcasting

**Contract wrappers** (getLoanVaultFactory, getLoanVault, getCreditScoreOracle, getERC20) return objects with both write methods (WDK) and read methods (ethers provider).

---

## 6. Backend API

**Framework:** Express.js + TypeScript + Prisma ORM
**Database:** PostgreSQL (Supabase)
**Port:** 3001

### 6.1 Service Layer

| Service | File | Responsibility |
|---------|------|---------------|
| `loan.service` | `src/services/loan.service.ts` | Create requests, process decisions, query loans |
| `policy.service` | `src/services/policy.service.ts` | Risk policy enforcement, score tier matching |
| `chain.service` | `src/services/chain.service.ts` | Deploy vaults, fund loans, monitor states |
| `scoring.service` | `src/services/scoring.service.ts` | On-chain score reads, bump on repay/default |
| `treasury.service` | `src/services/treasury.service.ts` | Balance queries, Aave operations, rebalancing |

### 6.2 Monitoring Loop

Runs every 30 seconds in the background:

1. **FUNDED loans** — Checks if borrower has drawn (vault state == 2)
2. **DRAWN loans** — Checks if repaid (vault state == 3) or past due
3. **Past due** — Calls `markDefault()` on-chain, updates DB, penalizes credit score
4. **Repaid** — Updates DB, bumps credit score on-chain via WDK

### 6.3 Decision Validation

When the agent posts a decision, the backend validates against hard policy limits **before saving**:

1. Zero tolerance check: any defaults → immediate rejection
2. Duration vs tier max days
3. APR vs tier min/max range
4. Principal vs tier max percentage of treasury
5. Global exposure limit (50% of treasury)
6. Per-borrower exposure limit (10% of treasury)

If any check fails, the loan is auto-rejected with the specific policy violation message. The agent doesn't need to enforce policy — the backend is the gatekeeper.

---

## 7. Autonomous AI Agent (OpenClaw + Groq)

### 7.1 Overview

The ACD underwriter is built on **OpenClaw**, Tether's official agent framework. OpenClaw agents are instruction-driven — defined through markdown workspace files, not hardcoded logic. The agent's personality, decision rules, heartbeat tasks, and skills are all expressed as human-readable documents that the LLM interprets at runtime.

**Framework:** OpenClaw (markdown-driven agent workspace)
**LLM:** Groq (Llama 3.3 70B Versatile) — chosen for speed and free tier availability
**Runtime:** Node.js standalone loop (`agent/agent-loop.mjs`) implementing the OpenClaw heartbeat pattern

### 7.2 OpenClaw Workspace Structure

The entire agent lives in the `agent/` directory, following OpenClaw's workspace convention:

```
agent/
├── SOUL.md              # Agent persona, values, decision framework
├── AGENTS.md            # Operating instructions and behavioral rules
├── IDENTITY.md          # Agent name, emoji, description
├── HEARTBEAT.md         # Periodic task definitions (underwriting loop)
├── BOOT.md              # Startup checklist
├── TOOLS.md             # Notes about tools and API conventions
├── MEMORY.md            # Long-term retention notes
├── memory/              # Daily logs (auto-managed by OpenClaw)
├── skills/              # OpenClaw skill definitions
│   ├── acd-api/         # HTTP skill for ACD backend endpoints
│   ├── wdk/             # Tether WDK agent skills (wallet, Aave)
│   ├── onchain-analytics/  # On-chain data queries
│   └── treasury-rebalance/ # Treasury rebalancing skill
├── scripts/             # Shell scripts wrapping REST API calls
│   ├── fetch-pending.sh
│   ├── get-score.sh
│   ├── get-treasury.sh
│   ├── post-decision.sh
│   ├── fund-loan.sh
│   └── rebalance.sh
├── agent-loop.mjs       # Standalone heartbeat runtime
└── package.json
```

### 7.3 SOUL.md — Agent Persona & Decision Framework

The `SOUL.md` is the most important file in an OpenClaw workspace. It defines **who the agent is** and **how it thinks**:

```markdown
# Agent Credit Desk — Autonomous Underwriter

You are the autonomous underwriting agent for Agent Credit Desk (ACD),
a decentralized lending system built on Tether WDK. You manage a USDT
treasury, evaluate loan requests from borrowers (humans and other AI
agents), and make lending decisions independently.
```

**Core Responsibilities (from SOUL.md):**
1. **Underwrite loan requests** — Evaluate using credit scores, treasury state, and policy constraints
2. **Price risk** — Set APR and principal within score-tier limits
3. **Fund approved loans** — Trigger on-chain LoanVault deployment
4. **Rebalance treasury** — Move idle capital to Aave V3 for yield

**Decision Rules (enforced by personality, not code):**
- APPROVE if borrower's score/tier permits and treasury has capacity
- REDUCE principal if requested amount exceeds limits (offer less, don't auto-reject)
- SET APR based on risk: low score = higher APR within tier range
- **REJECT if borrower has ANY defaults** (1+ = permanently blacklisted, zero tolerance)
- When utilization LOW (<60%): be more lenient to deploy capital productively
- When utilization HIGH (>80%): be conservative, preserve liquidity
- Always provide detailed rationale — judges and borrowers read this

**Personality traits:**
- Analytical and transparent — every decision has an explanation
- Optimizes for long-term treasury health, not short-term volume
- Treats all borrowers equally based on on-chain track record
- Concise: data in, decision out — no pleasantries

### 7.4 HEARTBEAT.md — Autonomous Loop

OpenClaw's heartbeat system drives periodic task execution. Our agent defines two loops:

**Underwriting Loop (every heartbeat ~30s):**
```
1. Fetch pending loans:     ./scripts/fetch-pending.sh
2. If empty → HEARTBEAT_OK (stop)
3. For EACH pending loan (oldest first):
   a. Get borrower score:  ./scripts/get-score.sh <address>
   b. Get treasury state:  ./scripts/get-treasury.sh
   c. Analyze data + make underwriting decision (LLM reasoning)
   d. Post decision:       ./scripts/post-decision.sh <id> '<json>'
   e. If approved → fund:  ./scripts/fund-loan.sh <id>
```

**Treasury Rebalancing (every 5th heartbeat ~2.5 minutes):**
```
1. Get treasury status:  ./scripts/get-treasury.sh
2. If utilization < 60%: supply idle USDT to Aave
3. If utilization > 80%: withdraw from Aave
4. If 60%-80%: no action
5. Execute: ./scripts/rebalance.sh
```

### 7.5 AGENTS.md — Operating Instructions

Defines the hard behavioral rules the agent must follow:

- **Never skip data gathering** — always fetch fresh borrower score and treasury status before deciding
- **Never hardcode decisions** — always reason from the data using the LLM
- **If API unreachable:** log error, retry next heartbeat, don't crash
- **If funding fails on-chain:** log it, flag for review, don't auto-retry
- **Always post decisions with rationale** — empty rationales are forbidden
- **Multiple pending loans:** process oldest first by `createdAt`
- **LLM parsing errors:** reject with "Decision engine error — retry on next cycle"

### 7.6 OpenClaw Skills

The agent has four registered skills that extend its capabilities:

#### `skills/acd-api/` — ACD Backend API Skill
Enables the agent to interact with all backend endpoints:
- Fetch pending loans, borrower scores, treasury status
- Post underwriting decisions
- Trigger loan funding and treasury rebalancing
- Uses curl + jq via shell scripts

#### `skills/wdk/` — Tether WDK Skill
The official Tether WDK agent skill, providing knowledge about:
- `@tetherto/wdk-wallet-evm` — Wallet management, transactions, transfers
- `@tetherto/wdk-protocol-lending-aave-evm` — Aave V3 supply/withdraw
- Common wallet interfaces (`getBalance`, `transfer`, `sendTransaction`)
- Security best practices (fee estimation, key hygiene, disposal)
- Multi-chain architecture (EVM, BTC, Solana, TON, TRON, Spark)

#### `skills/onchain-analytics/` — On-Chain Analytics Skill
Queries on-chain data for underwriting context:
- Transaction count for borrower addresses
- ETH balance checks
- Contract interaction history

#### `skills/treasury-rebalance/` — Treasury Rebalancing Skill
Handles the Aave yield optimization logic:
- Check current utilization vs target band
- Calculate supply/withdraw amounts
- Execute rebalancing via backend API

### 7.7 LLM Prompt Design

The agent builds a minimal prompt (~2K tokens) to stay under Groq's free tier limits (12K tokens/minute):

```
SYSTEM: You are the ACD underwriter. Evaluate this loan request.
Respond ONLY with JSON: {approve, principal, aprBps, durationSeconds, rationale}

RULES:
- Score tiers determine max duration, principal %, and APR range
- REJECT if borrower has ANY defaults (zero tolerance)
- Consider treasury capacity before approving
- Always provide a detailed rationale

DATA:
- Borrower: 0x... | Score: 540 | Loans: 4 taken, 4 repaid, 0 defaults
- Request: 10 USDT for 7 days, purpose: "API compute costs"
- Treasury: 618 USDT total, 16% utilization, 209 USDT available
- Tier: Score 0-599 → max 14 days, max 2% treasury, APR 1200-2000 bps
```

**Response format (strict JSON):**
```json
{
  "approve": true,
  "principal": "5000000",
  "aprBps": 1500,
  "durationSeconds": 604800,
  "rationale": "Borrower has a credit score of 540, within the 0-599 tier. Requested amount and duration are within the tier limits. Borrower has no defaults and low loan utilization, so the request is approved with a moderate APR."
}
```

### 7.8 Decision Quality & Transparency

Every decision includes a rationale that is:
- **Visible** in the frontend treasury dashboard (DecisionLog component)
- **Stored** in the database for audit (LoanRequest.decisionRationale)
- **Returned** via the Agent API for transparency
- **Unique per loan** — the LLM reasons about each specific request, not generic templates

Example real decisions from production:
> "Borrower's credit score of 520 falls within the 0-599 tier, but low loan utilization and zero defaults justify approval at the higher end of the APR range for this tier."

> "High loan utilization (84.4%) and requested loan exceeds available treasury — REJECTED."

> "Borrower's credit score falls within the 0-599 tier, but they have a clean repayment history and low loan utilization. The requested amount and duration are within the tier's limits."

### 7.9 OpenClaw Setup & Running

```bash
# Install OpenClaw
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard --install-daemon
openclaw onboard --groq-api-key "$GROQ_API_KEY"

# Register the agent workspace
openclaw agents add acd-underwriter --workspace /path/to/agent

# Start the gateway (agent runs via heartbeat automatically)
openclaw gateway start

# Interactive mode (for debugging)
openclaw chat acd-underwriter

# Or run standalone (without OpenClaw daemon)
cd agent
node agent-loop.mjs
```

### 7.10 Why OpenClaw?

OpenClaw is the right choice for this hackathon because:

1. **Markdown-driven agents** — The agent's personality, rules, and tasks are human-readable documents, not opaque code. Judges can read `SOUL.md` and understand exactly how the agent thinks.

2. **Skill system** — The WDK skill (`skills/wdk/`) gives the agent deep knowledge of Tether's wallet SDK. The ACD API skill connects it to the backend. Skills are composable and declarative.

3. **Heartbeat pattern** — Built-in support for periodic autonomous tasks. Perfect for an underwriting loop that needs to poll, evaluate, and act on a schedule.

4. **Tether ecosystem integration** — OpenClaw is part of the Tether agent toolkit. Using it demonstrates alignment with the hackathon's vision of agents as economic infrastructure.

5. **Separation of concerns** — The agent reasons (via LLM), the backend enforces policy (hard limits), smart contracts settle value (on-chain). OpenClaw's workspace model naturally supports this architecture.

---

## 8. Risk Policy & Credit Scoring

### 8.1 Score Tiers

| Tier | Score Range | Max Duration | Max Principal | APR Range | Risk Level |
|------|------------|-------------|---------------|-----------|------------|
| Premium | 800-1000 | 30 days | 10% of treasury | 5-8% | Low |
| Standard | 600-799 | 21 days | 5% of treasury | 8-12% | Medium |
| Basic | 0-599 | 14 days | 2% of treasury | 12-20% | High |

### 8.2 Global Policy

| Parameter | Value | Description |
|-----------|-------|-------------|
| Max Exposure | 50% | Maximum percentage of treasury in outstanding loans |
| Max Per Borrower | 10% | Maximum exposure to a single borrower |
| Min Health Factor | 1.2 | Minimum Aave health factor to maintain |
| Target Utilization | 60-80% | Target band for treasury utilization |
| Zero Tolerance | 1 default | A single default permanently blacklists the borrower |

### 8.3 Credit Score Lifecycle

```
New Borrower → Score 500 (default)
                    │
              ┌─────┴──────┐
              │             │
         Repay Loan    Default Loan
         Score +10     BLACKLISTED
         (cap 1000)    (permanent)
              │
         Repay Again
         Score +10
              │
         Continue...
         Score 520 → 530 → ... → 600 (tier upgrade!)
```

### 8.4 Zero Tolerance Default Policy

This is a deliberate economic design choice:

- **1 default = permanent blacklist** — all future loan requests automatically rejected
- Enforced at two levels:
  1. **Backend policy validation:** `if (borrowerDefaults >= 1) reject`
  2. **Agent LLM prompt:** "REJECT if borrower has ANY defaults (zero tolerance)"
- **Rationale:** In an autonomous system with no human recourse, the cost of a bad loan is high. Zero tolerance forces borrowers to take repayment seriously and protects the treasury.

---

## 9. Agent-to-Agent Lending API

This is what makes ACD infrastructure, not just an application. Other AI agents can interact with the credit desk programmatically.

### 9.1 Authentication

All endpoints require an API key via the `X-Agent-Key` header:
```bash
curl -H "X-Agent-Key: YOUR_API_KEY" https://api.acd.example/agent-api/capabilities
```

### 9.2 Endpoints

#### Discovery
```
GET /agent-api/capabilities
```
Returns what the credit desk can do — for agent negotiation:
```json
{
  "protocol": "acd-lending-v1",
  "name": "Agent Credit Desk",
  "capabilities": ["loan_request", "credit_check", "treasury_query", "loan_status"],
  "asset": "USDT",
  "chain": "base-sepolia",
  "chainId": 84532,
  "policy": {
    "maxLoanDurationDays": 365,
    "aprRangeBps": { "min": 300, "max": 2000 },
    "zeroToleranceDefaults": true
  }
}
```

#### Credit Pre-Check
```
GET /agent-api/credit/:address
```
Check if a borrower is eligible before requesting a loan:
```json
{
  "address": "0x73a5...",
  "score": 540,
  "loansTaken": 4,
  "loansRepaid": 4,
  "loansDefaulted": 0,
  "eligible": true,
  "tier": { "maxDurationDays": 14, "maxPrincipalPct": 0.02, "aprRangeBps": { "min": 1200, "max": 2000 } },
  "treasuryAvailable": "209254639"
}
```

#### Request Loan
```
POST /agent-api/loans
```
Submit a loan request. Returns immediately with a loan ID for polling:
```json
// Request
{
  "borrowerAddress": "0x73a5...",
  "amount": "5000000",
  "durationSeconds": 604800,
  "purpose": "API compute costs for AI agent"
}

// Response (202 Accepted)
{
  "loanId": "2541e22c-...",
  "status": "pending",
  "message": "Loan request submitted for autonomous underwriting",
  "pollUrl": "/agent-api/loans/2541e22c-...",
  "estimatedDecisionSeconds": 60
}
```

#### Poll Status
```
GET /agent-api/loans/:id
```
Returns full loan details including vault info if funded:
```json
{
  "loanId": "2541e22c-...",
  "status": "FUNDED",
  "terms": { "principal": "5000000", "aprBps": 1500 },
  "vault": {
    "address": "0x5D9A...",
    "deployTxHash": "0xce74...",
    "fundTxHash": "0xd08b..."
  },
  "dueDate": "2026-03-26T09:02:58.000Z",
  "rationale": "Borrower has a credit score of 540..."
}
```

#### Treasury Capacity
```
GET /agent-api/treasury
```
Query how much lending capacity is available:
```json
{
  "asset": "USDT",
  "chain": "base-sepolia",
  "availableForLoans": "204254639",
  "totalTreasury": "618509278",
  "loanUtilization": 0.1616
}
```

### 9.3 Error Handling

| Code | Error | Description |
|------|-------|-------------|
| 401 | `unauthorized` | Missing or invalid API key |
| 400 | `invalid_request` | Validation failure (bad address, missing fields) |
| 403 | `borrower_blacklisted` | Borrower has defaults — permanently rejected |
| 422 | `insufficient_capacity` | Loan exceeds available treasury capacity |

---

## 10. MCP Tools (Model Context Protocol)

ACD exposes its lending functions as MCP tools, allowing any MCP-compatible AI agent to discover and invoke them.

### 10.1 Available Tools

| Tool | Description | Input |
|------|-------------|-------|
| `acd_request_loan` | Submit a loan request | borrowerAddress, amount, durationSeconds, purpose |
| `acd_check_credit` | Check borrower eligibility | borrowerAddress |
| `acd_loan_status` | Get loan status + vault details | loanId |
| `acd_treasury_info` | Query lending capacity | (none) |
| `acd_list_loans` | List loans for a borrower | borrowerAddress |

### 10.2 Configuration

Add to your MCP client config:
```json
{
  "mcpServers": {
    "agent-credit-desk": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "cwd": "./backend"
    }
  }
}
```

### 10.3 Usage Example (Claude)

```
User: Check if 0x73a5021c... can get a loan

Claude: [uses acd_check_credit tool]
→ Score 540, eligible, tier allows up to 2% of treasury at 12-20% APR

User: Request a 5 USDT loan for 7 days for API costs

Claude: [uses acd_request_loan tool]
→ Loan submitted (ID: abc123), will be evaluated in ~60 seconds

User: What's the status?

Claude: [uses acd_loan_status tool]
→ FUNDED! Vault deployed at 0x5D9A..., due March 26
```

---

## 11. Treasury Management & Aave V3 Yield

### 11.1 Treasury Composition

```
Total Treasury = Wallet Balance + Aave Deposits + Outstanding Loans

┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  USDT Wallet   │  │  Aave V3       │  │  Outstanding   │
│  (liquid)      │  │  (earning yield)│  │  Loans         │
│                │  │                │  │  (deployed in  │
│  Available for │  │  Withdrawn as  │  │  LoanVaults)   │
│  immediate     │  │  needed for    │  │                │
│  lending       │  │  lending       │  │  Returns on    │
│                │  │                │  │  repayment     │
└────────────────┘  └────────────────┘  └────────────────┘
```

### 11.2 Rebalancing Logic

The agent checks utilization every 5th heartbeat (~2.5 minutes):

- **Utilization < 60%:** Supply idle capital to Aave (keep 20% buffer for sudden loan requests)
- **Utilization 60-80%:** No action (target band)
- **Utilization > 80%:** Withdraw from Aave to maintain lending capacity

All Aave operations are performed via `@tetherto/wdk-protocol-lending-aave-evm`.

### 11.3 Treasury Status API

```
GET /treasury/status
```
```json
{
  "walletBalance": "518509278",
  "aaveDeposited": "0",
  "totalTreasury": "618509278",
  "outstandingLoans": "100000000",
  "loanUtilization": 0.1616,
  "availableForLoans": "209254639"
}
```

---

## 12. Frontend — Borrower Portal & Treasury Dashboard

**Framework:** Next.js 15 + TypeScript + Tailwind CSS + RainbowKit + wagmi

### 12.1 Pages

| Page | URL | Purpose |
|------|-----|---------|
| Landing | `/` | Overview, stats, feature cards |
| Borrower Portal | `/borrower` | Connect wallet, request loans, draw, repay |
| Treasury Dashboard | `/treasury` | Treasury status, decision log, event timeline |

### 12.2 Borrower Portal (`/borrower`)

- **Connect Wallet:** RainbowKit integration with MetaMask, WalletConnect, Coinbase
- **Credit Score:** Visual gauge showing current score and tier
- **Loan Request Form:** Amount (USDT), duration, purpose
- **Active Loans:** Draw/Repay buttons for funded/drawn loans
- **Loan History:** Complete table with status, terms, rationale, vault links

### 12.3 Treasury Dashboard (`/treasury`)

- **Treasury Panel:** Wallet balance, Aave deposits, utilization gauge
- **Risk Policy:** Current limits and score tiers
- **Decision Log:** Agent's past decisions with rationale
- **Event Timeline:** Chronological treasury events (fund, repay, default, rebalance)
- **Rebalance Button:** Manual trigger for treasury rebalancing

### 12.4 Wallet Integration

- **RainbowKit** for wallet connection UI
- **wagmi** for React hooks (useAccount, useWalletClient)
- **Chain:** Base Sepolia (84532)
- **WalletConnect** project ID configured for cross-wallet support

---

## 13. Loan Lifecycle — End to End

```
1. REQUEST
   Borrower submits via Frontend / Agent API / MCP
   → LoanRequest created in DB (status: PENDING)

2. AI EVALUATION (within 30 seconds)
   Agent polls /loans/pending
   → Fetches borrower score (on-chain via CreditScoreOracle)
   → Fetches treasury status (via WDK wallet)
   → LLM evaluates risk, sets terms
   → Posts decision with rationale

3. POLICY VALIDATION
   Backend validates decision against hard limits
   → If violation: auto-reject with explanation
   → If valid: status → APPROVED

4. VAULT DEPLOYMENT (automatic)
   Agent triggers /loans/:id/fund
   → LoanVaultFactory.createVault() via WDK
   → New LoanVault deployed on Base Sepolia
   → USDT approved and transferred to vault via WDK
   → Status → FUNDED

5. DRAW
   Borrower calls vault.draw() via frontend
   → USDT transferred from vault to borrower
   → Status → DRAWN

6. REPAY
   Borrower approves USDT spending, calls vault.repay()
   → Principal + interest transferred from borrower to lender (treasury)
   → Frontend calls /loans/:id/notify-repay
   → Backend calls CreditScoreOracle.bumpOnRepaid() via WDK
   → Status → REPAID, Score +10

7. DEFAULT (alternative path)
   Monitoring loop detects overdue loan
   → vault.markDefault() called via WDK
   → CreditScoreOracle.bumpOnDefault() called via WDK
   → Status → DEFAULTED, Score -50, BLACKLISTED
```

---

## 14. Database Schema

### LoanRequest
```prisma
model LoanRequest {
  id                       String     @id @default(uuid())
  borrowerAddress          String     @db.VarChar(42)
  requestedAmount          BigInt
  requestedDurationSeconds Int
  purpose                  String
  status                   LoanStatus @default(PENDING)
  loanVaultAddress         String?    @db.VarChar(42)
  termsPrincipal           BigInt?
  termsAprBps              Int?
  dueTimestamp             Int?
  decisionRationale        String?
  deployTxHash             String?
  fundTxHash               String?
  fundedAt                 DateTime?
  drawnAt                  DateTime?
  repaidAt                 DateTime?
  defaultedAt              DateTime?
  createdAt                DateTime   @default(now())
  updatedAt                DateTime   @updatedAt
}

enum LoanStatus {
  PENDING    // Awaiting agent decision
  APPROVED   // Agent approved, awaiting funding
  REJECTED   // Agent rejected
  FUNDED     // Vault deployed and funded
  DRAWN      // Borrower withdrew funds
  REPAID     // Borrower repaid principal + interest
  DEFAULTED  // Past due, marked default
}
```

### TreasuryEvent
```prisma
model TreasuryEvent {
  id            String   @id @default(uuid())
  type          String   // FUND_LOAN, REPAYMENT_RECEIVED, DEFAULT_MARKED, etc.
  amount        BigInt
  relatedLoanId String?
  txHash        String?
  metadata      Json?
  timestamp     DateTime @default(now())
}
```

### BorrowerScoreCache
```prisma
model BorrowerScoreCache {
  address        String   @id @db.VarChar(42)
  scoreValue     Int
  loansTaken     Int      @default(0)
  loansRepaid    Int      @default(0)
  loansDefaulted Int      @default(0)
  lastSyncedAt   DateTime @default(now())
}
```

---

## 15. Deployed Contracts & Addresses

**Network:** Base Sepolia (Chain ID 84532)

| Contract | Address |
|----------|---------|
| LoanVaultFactory | `0xd8dCAB1bAE33077a902f51db8DdB22F743FDdb2A` |
| CreditScoreOracle | `0xA6258913049D79E9BD2Bf2CdD9924CFE1188FD57` |
| USDT (MockERC20) | `0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a` |
| Aave V3 Pool | `0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27` |

**Treasury Wallet:** `0xE74686Fd89ACB480B3903724C367395d86ED4519`

---

## 16. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Blockchain | Base Sepolia (EVM L2) | Fast, cheap transactions |
| Wallet | `@tetherto/wdk-wallet-evm` | WDK-first wallet management |
| DeFi | `@tetherto/wdk-protocol-lending-aave-evm` | Aave V3 yield optimization |
| Contracts | Solidity 0.8.24 + Hardhat | On-chain enforcement |
| Backend | Express.js + TypeScript | API coordination layer |
| ORM | Prisma | Database access |
| Database | PostgreSQL (Supabase) | Persistent storage |
| Frontend | Next.js 15 + Tailwind CSS | Web interface |
| Wallet UI | RainbowKit + wagmi | Wallet connection |
| AI | Groq (Llama 3.3 70B) | Autonomous underwriting |
| Agent Framework | OpenClaw | Markdown-driven agent workspace (SOUL.md, HEARTBEAT.md, Skills) |
| Agent Skills | OpenClaw Skills | WDK skill, ACD API skill, on-chain analytics, treasury rebalance |
| Interop | MCP Server + REST API | Agent-to-agent communication |
| ABI | ethers.js v6 | Encoding/decoding only |

---

## 17. Setup & Running Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL database (or Supabase account)
- Base Sepolia ETH for gas
- Groq API key (free tier works)

### 1. Smart Contracts
```bash
cd contracts
npm install
npx hardhat compile
npx hardhat test                                    # 27 tests pass
npx hardhat run scripts/deploy.ts --network baseSepolia  # Deploy
node scripts/copy-abis.js                           # Copy ABIs to backend
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env                                # Configure env vars
npx prisma generate
npx prisma db push                                  # Push schema to database
npm run dev                                         # Starts on port 3001
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                                         # Starts on port 3000
```

### 4. AI Agent
```bash
cd agent
cp .env.example .env                                # Set GROQ_API_KEY
node agent-loop.mjs                                 # Starts autonomous loop
```

### 5. MCP Server (optional)
```bash
cd backend
npm run mcp                                         # Starts stdio MCP server
```

---

## 18. API Reference

### Loan Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/loans/request` | Submit loan request |
| `GET` | `/loans/pending` | Get pending loans (agent) |
| `POST` | `/loans/:id/decision` | Post decision (agent) |
| `POST` | `/loans/:id/fund` | Deploy vault + fund |
| `GET` | `/loans/:id` | Get loan details |
| `GET` | `/loans/:id/vault-info` | Get on-chain vault state |
| `POST` | `/loans/:id/notify-repay` | Notify backend of repayment |
| `GET` | `/loans` | List all loans |
| `GET` | `/loans/stats/summary` | Loan statistics |

### Borrower Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/borrowers/:address/score` | Credit score + profile |
| `GET` | `/borrowers/:address/loans` | Borrower's loan history |
| `GET` | `/borrowers/scores/all` | All cached scores |

### Treasury Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/treasury/status` | Treasury status (wallet + Aave + loans) |
| `GET` | `/treasury/events` | Treasury event timeline |
| `GET` | `/treasury/policy` | Risk policy + score tiers |
| `POST` | `/treasury/rebalance` | Trigger rebalancing |

### Agent-to-Agent API (X-Agent-Key required)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/agent-api/capabilities` | Service discovery |
| `GET` | `/agent-api/credit/:address` | Credit pre-check |
| `POST` | `/agent-api/loans` | Submit loan request |
| `GET` | `/agent-api/loans/:id` | Poll loan status |
| `GET` | `/agent-api/loans?borrower=0x` | List borrower loans |
| `GET` | `/agent-api/treasury` | Treasury capacity |

---

## 19. Security & Economic Design

### Smart Contract Security
- **Access control:** `onlyLender` / `onlyBorrower` modifiers on all state-changing functions
- **State machine:** `inState(expected)` prevents invalid transitions
- **SafeERC20:** OpenZeppelin's safe transfer wrappers prevent silent failures
- **Immutable parameters:** Loan terms cannot be modified after deployment
- **Interest cap:** Interest stops accruing after `dueTimestamp`

### Backend Security
- **Policy enforcement:** Hard limits validated server-side (agent can't bypass)
- **Input validation:** Zod schemas on all endpoints
- **API key auth:** Agent-to-Agent API requires X-Agent-Key header
- **Address normalization:** All addresses lowercased before DB storage

### Economic Safeguards
- **50% max exposure:** Treasury never overextends
- **10% per-borrower cap:** No single borrower can drain the treasury
- **Zero tolerance defaults:** One default = permanent blacklist
- **Tiered risk pricing:** Higher risk = higher APR = higher return for risk taken
- **Utilization targeting:** 60-80% keeps capital productive without over-lending
- **Aave yield:** Idle capital earns instead of sitting dormant

### WDK Security
- **Self-custodial:** Treasury wallet keys never leave the backend
- **No ethers signing:** ethers.js is never used for transaction signing
- **NonceManager:** Prevents nonce conflicts in sequential transactions

---

## 20. Future Roadmap

### Short-term (Post-hackathon)
- Deploy to mainnet with real USDT
- Multi-chain support (Ethereum, Polygon, Arbitrum) via WDK
- Webhook callbacks for Agent API (push vs poll)
- Collateral support (over-collateralized loans for new borrowers)

### Medium-term
- Cross-protocol credit scoring (read scores from other protocols)
- Loan syndication (multiple lenders per vault)
- Dynamic APR adjustment based on market conditions
- Agent reputation scores (for Agent-to-Agent API consumers)

### Long-term
- Credit default swaps (agents insuring each other's loans)
- Autonomous credit markets (agents competing as both lenders and borrowers)
- Zero-knowledge credit proofs (prove creditworthiness without revealing history)

---

## Summary

Agent Credit Desk is not a proof-of-concept. It's a working, tested, end-to-end autonomous lending system:

- **7 smart contract functions** enforce loan terms on-chain
- **18+ API endpoints** serve humans and agents
- **5 MCP tools** enable AI agent discovery
- **30-second heartbeat** processes loans autonomously
- **Tether WDK** powers every wallet operation
- **Zero human intervention** in the underwriting loop

**Builders defined the rules. The agent does the work. Value settles onchain.**

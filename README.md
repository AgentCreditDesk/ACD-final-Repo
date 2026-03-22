<p align="center">
  <img src="frontend/public/logo.png" alt="Agent Credit Desk" width="160" />
</p>

<h1 align="center">Agent Credit Desk (ACD)</h1>

<p align="center"><strong>Autonomous Credit Infrastructure for the Agent Economy</strong></p>

> An AI agent that autonomously manages a USDT treasury, underwrites loan requests, deploys on-chain escrows, and exposes its lending functions to other agents   all powered by Tether WDK.

Built for [Tether Hackathon Galáctica: WDK Edition 1](https://tether.to)

<p align="center">
  <a href="https://youtu.be/8seBNLSvE6M">
    <img src="https://img.youtube.com/vi/8seBNLSvE6M/maxresdefault.jpg" alt="ACD Demo Video" width="45%" />
  </a>
  &nbsp;&nbsp;
  <a href="https://youtu.be/5TQml6rN8RI">
    <img src="https://img.youtube.com/vi/5TQml6rN8RI/maxresdefault.jpg" alt="ACD Pitch Video" width="45%" />
  </a>
</p>

<p align="center">
  <a href="https://youtu.be/8seBNLSvE6M"><strong>Watch Demo</strong></a>
  &nbsp;•&nbsp;
  <a href="https://youtu.be/5TQml6rN8RI"><strong>Watch Pitch</strong></a>
</p>

---

## The Problem

As AI agents become economic actors   paying for compute, APIs, data   they need access to credit. Today, there's no way for an agent to programmatically request, receive, and repay a loan without a human in the loop.

## The Solution

Agent Credit Desk is a fully autonomous lending protocol where:

1. **An AI agent acts as the lender**   evaluating creditworthiness, setting terms, and making lending decisions without human intervention
2. **On-chain escrows enforce the deal**   LoanVault smart contracts hold funds, track interest, and handle repayment/default
3. **Other agents can borrow programmatically**   via REST API or MCP tools, any agent can request a loan, check their credit, and track repayment
4. **The treasury self-manages**   idle capital earns yield on Aave V3, automatically rebalancing between lending and yield farming

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Credit Desk                         │
│                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ OpenClaw │◄──►│  Backend API  │◄──►│  Tether WDK      │   │
│  │ Agent    │    │  (Express)   │    │  Wallet + Aave   │   │
│  │ (Groq)   │    │              │    │                  │   │
│  └──────────┘    └──────┬───────┘    └────────┬─────────┘   │
│                         │                      │             │
│  ┌──────────┐    ┌──────┴───────┐    ┌────────┴─────────┐   │
│  │ MCP      │    │  PostgreSQL  │    │  Base Sepolia     │   │
│  │ Server   │    │  (Supabase)  │    │  Smart Contracts  │   │
│  └──────────┘    └──────────────┘    └──────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Agent-to-Agent REST API                   │   │
│  │     POST /agent-api/loans  GET /agent-api/credit      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Borrower Portal (Next.js)                 │   │
│  │     Connect Wallet → Request Loan → Draw → Repay      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### WDK-First Wallet Layer
All treasury operations use **Tether WDK EVM** as the primary wallet layer:
- Wallet management via `@tetherto/wdk-wallet-evm`
- Aave V3 yield via `@tetherto/wdk-protocol-lending-aave-evm`
- Token transfers, approvals, and contract interactions through WDK
- Ethers.js used only for ABI encoding/decoding   never for key management

### Autonomous AI Underwriter (OpenClaw + Groq)
The agent is built on **OpenClaw**, Tether's official agent framework, with a full markdown-driven workspace:
- **SOUL.md**   Agent persona, decision framework, and risk philosophy
- **HEARTBEAT.md**   Autonomous loop: poll → evaluate → decide → fund every 30s
- **OpenClaw Skills**   WDK skill for wallet knowledge, ACD API skill for backend integration
- **Groq LLM** (Llama 3.3 70B)   Reasons about each loan individually, not hardcoded rules
- **On-chain credit scoring**   CreditScoreOracle tracks borrower history
- **Risk policy engine**   Enforces exposure limits, per-borrower caps, and score-based tiers
- **Zero tolerance defaults**   A single default permanently blacklists a borrower
- **Treasury-aware decisions**   Agent knows available liquidity before approving

### On-Chain Escrow (LoanVault)
Each approved loan deploys a dedicated smart contract:
- Funds locked in escrow until borrower draws
- Interest accrues on-chain
- Automatic default detection if past due
- Repayment flows back to treasury

### Agent-to-Agent Lending API
RESTful API for other AI agents to interact programmatically:
```bash
# Check if a borrower is eligible
curl -H "X-Agent-Key: $KEY" /agent-api/credit/0x...

# Request a loan
curl -X POST -H "X-Agent-Key: $KEY" /agent-api/loans \
  -d '{"borrowerAddress":"0x...","amount":"10000000","durationSeconds":604800,"purpose":"API costs"}'

# Check loan status
curl -H "X-Agent-Key: $KEY" /agent-api/loans/$LOAN_ID
```

### MCP Tools (Model Context Protocol)
Expose lending operations as MCP tools for agent discovery:
- `acd_request_loan`   Submit a loan request
- `acd_check_credit`   Pre-check borrower creditworthiness
- `acd_loan_status`   Track loan lifecycle
- `acd_treasury_info`   Query lending capacity
- `acd_list_loans`   Portfolio view

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

### Treasury Management
Automated capital allocation:
- Idle USDT → Aave V3 supply for yield
- Withdraw from Aave when lending demand rises
- Target 60–80% utilization rate
- 50% max exposure cap

## Credit Scoring & Risk Tiers

| Score Range | Max Duration | Max Principal | APR Range |
|------------|-------------|---------------|-----------|
| 800–1000   | 30 days     | 10% treasury  | 5–8%      |
| 600–799    | 21 days     | 5% treasury   | 8–12%     |
| 0–599      | 14 days     | 2% treasury   | 12–20%    |

- New borrowers start at score **500**
- Repayment: **+10 points**
- Default: **permanent blacklist** (zero tolerance)

## Smart Contracts (Base Sepolia)

| Contract | Address |
|----------|---------|
| LoanVaultFactory | `0xd8dCAB1bAE33077a902f51db8DdB22F743FDdb2A` |
| CreditScoreOracle | `0xA6258913049D79E9BD2Bf2CdD9924CFE1188FD57` |
| USDT (Mock) | `0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a` |

## Tech Stack

- **Blockchain**: Base Sepolia (EVM L2)
- **Wallet**: Tether WDK EVM (`@tetherto/wdk-wallet-evm`)
- **DeFi**: Tether WDK Aave (`@tetherto/wdk-protocol-lending-aave-evm`)
- **Contracts**: Solidity + Hardhat
- **Backend**: Express.js + TypeScript + Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **Frontend**: Next.js 14 + RainbowKit + wagmi
- **Agent Framework**: OpenClaw (markdown-driven workspace with SOUL.md, HEARTBEAT.md, Skills)
- **AI**: Groq (Llama 3.3 70B) for autonomous underwriting
- **Agent Skills**: WDK skill, ACD API skill, on-chain analytics, treasury rebalance
- **Interop**: MCP Server + Agent-to-Agent REST API

## Complete Local Setup Guide

### Prerequisites

| Requirement | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime for backend, frontend, agent |
| npm | 9+ | Package manager |
| Git | any | Clone the repo |
| MetaMask | latest | Browser wallet for testing |
| jq | any | JSON formatting for demo script (optional) |

**Accounts needed (all free):**
- **Supabase** account → PostgreSQL database ([supabase.com](https://supabase.com))
- **Groq** API key → AI agent LLM ([console.groq.com](https://console.groq.com))
- Base Sepolia ETH → Gas for transactions ([faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet))

### Step 1: Clone the Repository

```bash
git clone https://github.com/ACD-tether/acd-tether.git
cd acd-tether
```

### Step 2: Deploy Smart Contracts (or use existing)

> Skip this step if you want to use the already-deployed contracts on Base Sepolia (addresses in `.env`).

```bash
cd contracts
npm install

# Run tests (27 should pass)
npx hardhat test

# Deploy to Base Sepolia
cp .env.example .env
# Edit .env → set DEPLOYER_PRIVATE_KEY (needs Base Sepolia ETH for gas)
npx hardhat run scripts/deploy.ts --network baseSepolia

# Copy ABIs to backend
node scripts/copy-abis.js
cd ..
```

**Deployed contract addresses** (save these for backend .env):
- LoanVaultFactory: `0xd8dCAB1bAE33077a902f51db8DdB22F743FDdb2A`
- CreditScoreOracle: `0xA6258913049D79E9BD2Bf2CdD9924CFE1188FD57`
- USDT (MockERC20): `0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a`

### Step 3: Set Up the Database

1. Create a new project on [Supabase](https://supabase.com)
2. Go to **Settings → Database** and copy:
   - `Connection string (URI)` → this is your `DATABASE_URL`
   - `Direct connection` → this is your `DIRECT_URL`

### Step 4: Configure & Start the Backend

```bash
cd backend
npm install
```

Create `backend/.env` with all required variables:

```env
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:5432/postgres"

# Blockchain
RPC_URL="https://sepolia.base.org"
CHAIN_ID=84532

# Treasury Wallet (private key of the wallet that holds USDT and pays gas)
TREASURY_PRIVATE_KEY="your-private-key-here"
TREASURY_MNEMONIC=""

# Smart Contract Addresses
LOAN_VAULT_FACTORY_ADDRESS="0xd8dCAB1bAE33077a902f51db8DdB22F743FDdb2A"
CREDIT_SCORE_ORACLE_ADDRESS="0xA6258913049D79E9BD2Bf2CdD9924CFE1188FD57"
USDT_ADDRESS="0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a"
AAVE_POOL_ADDRESS="0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27"

# Server
PORT=3001

# Agent API Key (for Agent-to-Agent API authentication)
AGENT_API_KEY="acd-test-key-hackathon-2026"
```

Push the database schema and start:

```bash
# Generate Prisma client
npx prisma generate

# Push schema to Supabase (creates tables)
npx prisma db push

# Start the backend
npm run dev
```

Verify: `curl http://localhost:3001/health` should return `{"status":"ok"}`

### Step 5: Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on **http://localhost:3000**

**MetaMask Setup:**
1. Add Base Sepolia network to MetaMask:
   - Network Name: `Base Sepolia`
   - RPC URL: `https://sepolia.base.org`
   - Chain ID: `84532`
   - Currency Symbol: `ETH`
   - Explorer: `https://sepolia.basescan.org`
2. Get testnet ETH from the [Base Sepolia faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
3. Add the USDT token to MetaMask: `0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a`

### Step 6: Start the AI Agent (OpenClaw)

```bash
cd agent
npm install
```

Create `agent/.env`:

```env
ACD_BACKEND_URL=http://localhost:3001
GROQ_API_KEY="your-groq-api-key-here"
RPC_URL=https://sepolia.base.org
```

Start the autonomous agent:

```bash
# Run the agent (logs to terminal)
node agent-loop.mjs

# Or run in background with logging
node agent-loop.mjs > /tmp/agent.log 2>&1 &
tail -f /tmp/agent.log
```

You should see the heartbeat banner and `[UNDERWRITE] No pending loans. HEARTBEAT_OK` every 30 seconds.

**OpenClaw setup (optional   for full agent workspace):**
```bash
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard --install-daemon
openclaw onboard --groq-api-key "$GROQ_API_KEY"
openclaw agents add acd-underwriter --workspace ./agent
openclaw gateway start
```

### Step 7: Start the MCP Server (Optional)

```bash
cd backend
npm run mcp
```

This starts the MCP server on stdio transport. Configure your MCP client (Claude, etc.) with:

```json
{
  "mcpServers": {
    "agent-credit-desk": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "cwd": "/path/to/acd-tether/backend"
    }
  }
}
```

### Verify Everything is Running

| Service | URL / Command | Expected |
|---------|--------------|----------|
| Backend | `curl http://localhost:3001/health` | `{"status":"ok"}` |
| Frontend | Open http://localhost:3000 | Landing page loads |
| Agent | Check terminal or `tail /tmp/agent.log` | Heartbeat messages |
| Treasury | `curl http://localhost:3001/treasury/status` | JSON with balances |
| Agent API | `curl -H "X-Agent-Key: acd-test-key-hackathon-2026" http://localhost:3001/agent-api/capabilities` | Capabilities JSON |

---

## Demo Guide

### Frontend Demo (Browser)

1. Open **http://localhost:3000**
2. **Connect MetaMask** (Base Sepolia network)
3. Go to **/borrower** → Submit a loan request (e.g., 5 USDT for 7 days)
4. **Wait ~30 seconds**   the agent auto-evaluates and funds the loan
5. Click **"Draw Funds"** to withdraw USDT from the vault
6. Click **"Repay"** to pay back principal + interest
7. Watch your **credit score increase** (+10 points)
8. Visit **/treasury** to see the decision log, treasury status, and event timeline

### Full System Demo (Terminal)

Run the interactive demo script that showcases all backend features:

```bash
chmod +x demo.sh
./demo.sh
```

This walks through 10 sections:
1. Health check
2. Treasury status via WDK
3. Risk policy & credit tiers
4. On-chain credit scoring
5. Loan statistics
6. Agent-to-Agent API (9 scenarios: auth, discovery, credit check, loan request, polling, validation, over-capacity)
7. MCP Server tool listing
8. On-chain vault state
9. Treasury event audit trail
10. Autonomous agent log

### Agent-to-Agent API Demo (curl)

```bash
# 1. Discover what ACD can do
curl -s -H "X-Agent-Key: acd-test-key-hackathon-2026" \
  http://localhost:3001/agent-api/capabilities | jq '.'

# 2. Check if a borrower is eligible
curl -s -H "X-Agent-Key: acd-test-key-hackathon-2026" \
  http://localhost:3001/agent-api/credit/0x73a5021c0935b79d46c2d650821b212dc5b3b9eb | jq '.'

# 3. Submit a loan request
curl -s -X POST \
  -H "X-Agent-Key: acd-test-key-hackathon-2026" \
  -H "Content-Type: application/json" \
  http://localhost:3001/agent-api/loans \
  -d '{"borrowerAddress":"0x73a5021c0935b79d46c2d650821b212dc5b3b9eb","amount":"5000000","durationSeconds":604800,"purpose":"API compute costs"}' | jq '.'

# 4. Poll for the decision (wait 30s for agent to process)
curl -s -H "X-Agent-Key: acd-test-key-hackathon-2026" \
  http://localhost:3001/agent-api/loans/LOAN_ID_HERE | jq '.'

# 5. Check treasury capacity
curl -s -H "X-Agent-Key: acd-test-key-hackathon-2026" \
  http://localhost:3001/agent-api/treasury | jq '.'
```

### MCP Demo

```bash
# List all MCP tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npx tsx src/mcp/server.ts 2>/dev/null | jq '.result.tools[] | {name, description}'

# Call a tool (check credit)
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"acd_check_credit","arguments":{"borrowerAddress":"0x73a5021c0935b79d46c2d650821b212dc5b3b9eb"}}}' | npx tsx src/mcp/server.ts 2>/dev/null | jq '.'
```

---

## Loan Lifecycle

```
Request → AI Review → Approve/Reject → Deploy Vault → Fund → Draw → Repay/Default
   │          │            │                │           │       │         │
   └──────────┴────────────┴────────────────┴───────────┴───────┴─────────┘
              Fully autonomous   no human in the loop
```

1. **Request**: Borrower submits via frontend, agent API, or MCP
2. **AI Review**: OpenClaw agent (Groq LLM) evaluates risk using credit score, treasury capacity, and policy rules
3. **Decision**: Approve with terms or reject with rationale
4. **Deploy**: LoanVault contract deployed via WDK
5. **Fund**: Treasury transfers USDT to vault via WDK
6. **Draw**: Borrower withdraws funds from vault
7. **Repay**: Borrower repays principal + interest → credit score increases
8. **Default**: Missed deadline → marked on-chain → borrower blacklisted forever

<p align="center">
  <img src="frontend/public/logo.png" alt="ACD" width="120" />
</p>

## Why Agent Credit Desk?

This isn't just a lending protocol with an AI chatbot bolted on. The agent **is** the lender:

- It's built on **OpenClaw** with a full agent workspace (SOUL.md, HEARTBEAT.md, Skills)
- It manages real capital (WDK treasury)
- It makes real credit decisions (Groq LLM + on-chain scoring)
- It deploys real smart contracts (LoanVault escrows)
- It talks to other agents (MCP + REST API)
- It earns yield on idle capital (Aave V3 via WDK)
- Its personality, rules, and skills are **human-readable markdown**   judges can read exactly how it thinks

**ACD is autonomous credit infrastructure for a world where agents are the new economic actors.**

## Project Structure

```
acd-tether/
├── contracts/           # Solidity smart contracts (Hardhat)
│   ├── contracts/       # LoanVault, LoanVaultFactory, CreditScoreOracle
│   ├── test/            # 27 passing tests
│   └── scripts/         # Deploy + ABI copy scripts
├── backend/             # Express.js API + WDK integration
│   ├── src/
│   │   ├── routes/      # loans, borrowers, treasury, agent-api
│   │   ├── services/    # loan, policy, chain, scoring, treasury
│   │   ├── wdk/         # WDK wallet + Aave integration
│   │   ├── mcp/         # MCP server (5 tools)
│   │   └── utils/       # Contract wrappers, logger
│   ├── prisma/          # Database schema
│   └── abis/            # Contract ABIs
├── frontend/            # Next.js 15 + RainbowKit
│   └── src/
│       ├── app/         # Pages: /, /borrower, /treasury
│       ├── components/  # UI components
│       └── lib/         # API client, contracts, web3 provider
├── agent/               # OpenClaw agent workspace
│   ├── SOUL.md          # Agent persona & decision framework
│   ├── HEARTBEAT.md     # Autonomous loop definition
│   ├── AGENTS.md        # Operating rules
│   ├── skills/          # wdk, acd-api, onchain-analytics, treasury-rebalance
│   ├── scripts/         # Shell API wrappers
│   └── agent-loop.mjs   # Standalone heartbeat runtime
├── demo.sh              # Interactive full-system demo script
├── mcp-config.json      # MCP server configuration
├── DOCUMENTATION.md     # Comprehensive technical documentation
└── README.md            # This file
```

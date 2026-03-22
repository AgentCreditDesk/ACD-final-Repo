# Tools & API Reference

## Backend API

Base URL: `$ACD_BACKEND_URL` (default: http://localhost:3001)

All amounts are strings representing BigInt values in USDT base units (6 decimals).
- 1 USDT = "1000000"
- 1000 USDT = "1000000000"

### Loan Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | /loans/pending | Pending requests to underwrite |
| POST | /loans/:id/decision | Post approve/reject decision |
| POST | /loans/:id/fund | Deploy vault + fund on-chain |
| GET | /loans/:id | Get loan details |
| GET | /loans | All loans (?borrower=0x... filter) |
| GET | /loans/stats/summary | Loan count stats |

### Borrower Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | /borrowers/:address/score | Credit score + profile + tier |

### Treasury Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | /treasury/status | Balance, Aave, utilization |
| GET | /treasury/policy | Risk policy + score tiers |
| POST | /treasury/rebalance | Auto rebalance Aave allocation |
| GET | /treasury/events | Event timeline |

## Shell Scripts

All scripts are in `./scripts/` and executable:
- `fetch-pending.sh` — GET /loans/pending
- `get-score.sh <address>` — GET /borrowers/:address/score
- `get-treasury.sh` — GET /treasury/status
- `post-decision.sh <loanId> '<json>'` — POST /loans/:id/decision
- `fund-loan.sh <loanId>` — POST /loans/:id/fund
- `rebalance.sh` — POST /treasury/rebalance

## On-Chain (via RPC)

- `eth_getTransactionCount` — proxy for address age/activity
- `eth_getBalance` — native token balance

---
name: acd-api
description: Interact with the Agent Credit Desk backend API to manage loans, borrower scores, and treasury operations. Use this skill whenever you need to read or write loan data, check borrower creditworthiness, or manage the treasury.
metadata:
  author: acd-team
  version: "1.0"
requires:
  env:
    - ACD_BACKEND_URL
  bins:
    - curl
    - jq
---

# ACD Backend API Skill

Base URL: `$ACD_BACKEND_URL` (default: http://localhost:3001)

All monetary amounts are strings representing BigInt values in USDT base units (6 decimals).
1 USDT = "1000000". 1000 USDT = "1000000000".

## Get Pending Loan Requests

Returns an array of loan requests awaiting underwriting decision.

```bash
curl -s "$ACD_BACKEND_URL/loans/pending" | jq '.'
```

Response fields per request:
- `id` — UUID, use this for decision/fund calls
- `borrowerAddress` — 0x... Ethereum address
- `requestedAmount` — string, USDT base units
- `requestedDurationSeconds` — integer, loan duration
- `purpose` — string, borrower's stated reason
- `status` — "PENDING"
- `createdAt` — ISO timestamp

## Get Borrower Credit Score

```bash
curl -s "$ACD_BACKEND_URL/borrowers/$ADDRESS/score" | jq '.'
```

Response:
- `score` — 0-1000, higher is better
- `loansTaken`, `loansRepaid`, `loansDefaulted` — integers
- `tier` — object with `maxDurationDays`, `maxPrincipalPct`, `minAprBps`, `maxAprBps`

## Get Treasury Status

```bash
curl -s "$ACD_BACKEND_URL/treasury/status" | jq '.'
```

Response:
- `walletBalance` — USDT in wallet (string)
- `aaveDeposited` — USDT in Aave (string)
- `totalTreasury` — wallet + aave + outstanding (string)
- `outstandingLoans` — total principal in active loans (string)
- `loanUtilization` — float 0.0-1.0
- `availableForLoans` — max new lending capacity (string)

## Get Risk Policy

```bash
curl -s "$ACD_BACKEND_URL/treasury/policy" | jq '.'
```

Returns `riskPolicy` (global limits) and `scoreTiers` (per-score-range limits).

## Post Underwriting Decision

```bash
curl -s -X POST "$ACD_BACKEND_URL/loans/$LOAN_ID/decision" \
  -H "Content-Type: application/json" \
  -d '{
    "approve": true,
    "principal": "500000000",
    "aprBps": 900,
    "durationSeconds": 1209600,
    "rationale": "Explanation here"
  }'
```

The backend validates the decision against policy. If terms violate limits, the loan is auto-rejected with an explanation.

## Fund an Approved Loan

Deploys a LoanVault smart contract on-chain and transfers principal from the treasury.

```bash
curl -s -X POST "$ACD_BACKEND_URL/loans/$LOAN_ID/fund"
```

Returns `vaultAddress`, `deployTxHash`, `fundTxHash`.

## Trigger Treasury Rebalancing

Automatically decides whether to supply idle USDT to Aave or withdraw for lending.

```bash
curl -s -X POST "$ACD_BACKEND_URL/treasury/rebalance"
```

Returns `action` ("supply_aave", "withdraw_aave", or "none"), `amount`, `txHash`.

## Get All Loans

```bash
curl -s "$ACD_BACKEND_URL/loans" | jq '.'
```

## Get Treasury Event Timeline

```bash
curl -s "$ACD_BACKEND_URL/treasury/events" | jq '.'
```

## Health Check

```bash
curl -s "$ACD_BACKEND_URL/health" | jq '.'
```

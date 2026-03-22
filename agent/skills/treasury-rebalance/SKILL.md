---
name: treasury-rebalance
description: Manage treasury capital allocation between direct USDT lending and Aave V3 yield deposits. Use this to check utilization and decide when to supply or withdraw from Aave.
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

# Treasury Rebalancing Skill

The treasury has three capital pools:
1. **Wallet balance** — liquid USDT available for immediate loan funding
2. **Aave deposits** — USDT earning yield in Aave V3 (can be withdrawn)
3. **Outstanding loans** — principal locked in active LoanVault contracts

## Check Current State

```bash
curl -s "$ACD_BACKEND_URL/treasury/status" | jq '.'
```

Key field: `loanUtilization` (0.0 to 1.0)
- Target band: 0.60 to 0.80

## Decision Logic

### Utilization Below Target (<0.60)
Too much idle capital. Either:
- More loans should be approved (be more lenient in underwriting)
- Idle wallet balance should be supplied to Aave for yield

Action:
```bash
curl -s -X POST "$ACD_BACKEND_URL/treasury/rebalance" | jq '.'
```

### Utilization Above Target (>0.80)
Treasury is over-exposed to direct loans. Either:
- Be more conservative in underwriting (reject more or reduce principals)
- Withdraw from Aave to increase liquidity buffer

Action:
```bash
curl -s -X POST "$ACD_BACKEND_URL/treasury/rebalance" | jq '.'
```

### Utilization In Target (0.60 - 0.80)
Healthy state. No rebalancing needed.

## Manual Supply/Withdraw

If finer control is needed:

Supply specific amount to Aave:
```bash
curl -s -X POST "$ACD_BACKEND_URL/treasury/wdk-supply" \
  -H "Content-Type: application/json" \
  -d '{"amount": "10000000000"}'
```

Withdraw specific amount from Aave:
```bash
curl -s -X POST "$ACD_BACKEND_URL/treasury/wdk-withdraw" \
  -H "Content-Type: application/json" \
  -d '{"amount": "5000000000"}'
```

## View Recent Treasury Events

```bash
curl -s "$ACD_BACKEND_URL/treasury/events?limit=10" | jq '.'
```

Shows fund, supply, withdraw, repayment, and default events chronologically.

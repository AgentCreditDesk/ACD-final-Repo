---
name: onchain-analytics
description: Query on-chain blockchain data to assess borrower creditworthiness. Use this to check address activity, balance, and transaction history as supplementary risk signals beyond the credit score.
metadata:
  author: acd-team
  version: "1.0"
requires:
  env:
    - RPC_URL
  bins:
    - curl
    - jq
---

# On-Chain Analytics Skill

Query blockchain data directly via JSON-RPC for borrower risk assessment.
Use `$RPC_URL` (default: https://sepolia.base.org).

## Get Address Transaction Count

Proxy for address age and activity level. Higher count = more established.

```bash
curl -s -X POST "$RPC_URL" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getTransactionCount","params":["'"$ADDRESS"'","latest"],"id":1}' | jq -r '.result'
```

Result is hex. Convert: `printf "%d\n" <hex_value>`

## Get Address Native Balance (ETH)

```bash
curl -s -X POST "$RPC_URL" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["'"$ADDRESS"'","latest"],"id":1}' | jq -r '.result'
```

Result is hex wei. To get ETH: divide by 10^18.

## Get ERC-20 Token Balance (USDT)

Call `balanceOf(address)` on the USDT contract:

```bash
# Encode balanceOf(address) call data
# Function selector: 0x70a08231
# Pad address to 32 bytes
PADDED=$(printf '%064s' "${ADDRESS#0x}" | tr ' ' '0')
DATA="0x70a08231${PADDED}"

curl -s -X POST "$RPC_URL" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_call","params":[{"to":"'"$USDT_ADDRESS"'","data":"'"$DATA"'"},"latest"],"id":1}' | jq -r '.result'
```

## Get Latest Block Number

```bash
curl -s -X POST "$RPC_URL" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | jq -r '.result'
```

## Interpretation Guide

When assessing a borrower address:

- **High tx count (>100) + established** → lower risk, likely experienced user/agent
- **Low tx count (<10) + new address** → unknown risk, be conservative with terms
- **Has native balance** → can pay gas, active on-chain
- **Zero native balance** → may have trouble interacting with vault (draw/repay need gas)
- **Has USDT balance** → potential to repay, positive signal
- **Zero USDT + requesting large loan** → high risk flag

Use these signals to supplement the credit score when writing the rationale.

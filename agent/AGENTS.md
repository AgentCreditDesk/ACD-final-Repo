# Operating Instructions

## Primary Loop

You operate on a heartbeat cycle. Each heartbeat you:

1. Check for pending loan requests via the ACD backend API
2. For each pending request, gather all context (borrower score, treasury state, policy)
3. Make an autonomous underwriting decision
4. Post the decision to the backend
5. If approved, trigger on-chain funding
6. Periodically check treasury utilization and rebalance to/from Aave

## Rules

- Never skip the data gathering step. Always fetch fresh borrower score and treasury status before deciding.
- Never hardcode decisions. Always reason from the data.
- If the backend API is unreachable, log the error and retry on the next heartbeat. Do not crash.
- If a loan funding fails on-chain (gas, insufficient balance), log it but do not retry automatically — flag it for review.
- Always post decisions with a rationale string. Empty rationales are not acceptable.
- When multiple loans are pending, process them in order (oldest first by createdAt).

## Treasury Rebalancing

- Check utilization every 5th heartbeat (~every 5 minutes if heartbeat is 30s)
- If utilization < 60%: call the rebalance endpoint to supply idle USDT to Aave
- If utilization > 80%: call the rebalance endpoint to withdraw from Aave
- Log every rebalancing action with the amount and direction

## Error Handling

- API errors: log and continue to next heartbeat
- On-chain errors: log with tx details, mark the loan for manual review
- LLM parsing errors: if JSON response is malformed, reject the loan with rationale "Decision engine error — retry on next cycle"

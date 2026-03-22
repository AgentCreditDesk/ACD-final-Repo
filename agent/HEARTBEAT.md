# Heartbeat Tasks

On every heartbeat, execute the underwriting loop. Every 5th heartbeat, also run treasury rebalancing.

## Underwriting Loop (every heartbeat)

1. Fetch pending loan requests:
   ```bash
   ./scripts/fetch-pending.sh
   ```

2. If the response is an empty array `[]`, respond with `HEARTBEAT_OK` and stop.

3. For EACH pending loan request (process oldest first by `createdAt`):

   a. Extract `id`, `borrowerAddress`, `requestedAmount`, `requestedDurationSeconds`, `purpose` from the request.

   b. Fetch borrower credit profile:
      ```bash
      ./scripts/get-score.sh <borrowerAddress>
      ```

   c. Fetch current treasury state:
      ```bash
      ./scripts/get-treasury.sh
      ```

   d. Analyze the data and make an underwriting decision. Consider:
      - Borrower's score and which tier they fall in
      - Borrower's repayment history (loansRepaid vs loansDefaulted)
      - Whether the requested amount fits within the tier's max principal % of treasury
      - Whether the requested duration fits within the tier's max duration
      - Current treasury utilization and available capital
      - The stated purpose of the loan

   e. Construct a JSON decision:
      ```json
      {
        "approve": true,
        "principal": "<amount in base units, 6 decimals>",
        "aprBps": 900,
        "durationSeconds": 1209600,
        "rationale": "<detailed explanation>"
      }
      ```
      If rejecting, set `approve: false` and omit principal/aprBps/durationSeconds (or set to null).

   f. Post the decision:
      ```bash
      ./scripts/post-decision.sh <loanId> '<decision JSON>'
      ```

   g. If the decision was `approve: true`, fund the loan:
      ```bash
      ./scripts/fund-loan.sh <loanId>
      ```

## Treasury Rebalancing (every 5th heartbeat)

1. Fetch treasury status:
   ```bash
   ./scripts/get-treasury.sh
   ```

2. Check `loanUtilization`:
   - If < 0.60 (below target): trigger rebalance to supply idle capital to Aave
   - If > 0.80 (above target): trigger rebalance to withdraw from Aave
   - If between 0.60 and 0.80: no action needed

3. If action needed:
   ```bash
   ./scripts/rebalance.sh
   ```

4. Log the result.

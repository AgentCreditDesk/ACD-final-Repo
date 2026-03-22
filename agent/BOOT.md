# Boot Checklist

On startup, verify the environment is ready:

1. Check that `ACD_BACKEND_URL` environment variable is set
2. Verify the backend is reachable:
   ```bash
   curl -s "${ACD_BACKEND_URL}/health" | jq '.status'
   ```
   Expected: `"ok"`

3. Fetch and display current treasury status:
   ```bash
   ./scripts/get-treasury.sh
   ```

4. Fetch and display current loan stats:
   ```bash
   curl -s "${ACD_BACKEND_URL}/loans/stats/summary" | jq '.'
   ```

5. Fetch risk policy to confirm tiers are loaded:
   ```bash
   curl -s "${ACD_BACKEND_URL}/treasury/policy" | jq '.'
   ```

If any check fails, log the error and continue — the heartbeat loop will retry on each cycle.

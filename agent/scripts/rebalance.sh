#!/bin/bash
curl -s -X POST "${ACD_BACKEND_URL:-http://localhost:3001}/treasury/rebalance" | jq '.'

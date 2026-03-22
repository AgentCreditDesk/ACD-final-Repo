#!/bin/bash
if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: post-decision.sh <loan_id> '<decision_json>'"
  exit 1
fi
curl -s -X POST "${ACD_BACKEND_URL:-http://localhost:3001}/loans/$1/decision" \
  -H "Content-Type: application/json" \
  -d "$2"

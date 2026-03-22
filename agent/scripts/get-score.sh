#!/bin/bash
if [ -z "$1" ]; then
  echo "Usage: get-score.sh <borrower_address>"
  exit 1
fi
curl -s "${ACD_BACKEND_URL:-http://localhost:3001}/borrowers/$1/score" | jq '.'

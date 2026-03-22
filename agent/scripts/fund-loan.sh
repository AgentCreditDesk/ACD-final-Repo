#!/bin/bash
if [ -z "$1" ]; then
  echo "Usage: fund-loan.sh <loan_id>"
  exit 1
fi
curl -s -X POST "${ACD_BACKEND_URL:-http://localhost:3001}/loans/$1/fund"

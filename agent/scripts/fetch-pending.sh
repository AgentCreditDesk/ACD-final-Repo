#!/bin/bash
curl -s "${ACD_BACKEND_URL:-http://localhost:3001}/loans/pending" | jq '.'

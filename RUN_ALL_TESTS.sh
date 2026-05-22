#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

npm run phase280:final

echo "PASS: PHASE280 product-agent insight package final gate"

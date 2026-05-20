#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

npm run phase273:final

echo "PASS: PHASE273 100-point package final gate"

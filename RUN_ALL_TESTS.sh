#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

npm run phase270:final

echo "PASS: PHASE270 full package final gate"

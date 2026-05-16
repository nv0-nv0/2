#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

npm run phase265:final

echo "PASS: PHASE265 dashboard portal final gate"

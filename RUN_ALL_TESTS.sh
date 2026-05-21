#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

npm run phase278:final

echo "PASS: PHASE277 VERIDION function/menu locked package final gate"

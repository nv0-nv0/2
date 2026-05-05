#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "[GOLDEN_CORE] intent firewall regression"
node tests/phase203-intent-firewall.mjs

echo "[STATIC_UI] render safety"
node scripts/check-client-render-safety.mjs

echo "[PHASE203_FINAL] structure/system engine gate"
node scripts/run-phase203-final.mjs

echo "PASS: GOLDEN_CORE, STATIC_UI, PHASE203_FINAL"

#!/usr/bin/env sh
set -eu

RUNTIME_DIR="${NV0_RUNTIME_DIR:-/app/runtime}"
mkdir -p "$RUNTIME_DIR/data" "$RUNTIME_DIR/uploads" "$RUNTIME_DIR/backups" "$RUNTIME_DIR/reports"

if [ "${NV0_RUN_PREFLIGHT:-false}" = "true" ]; then
  node scripts/preflight.mjs
fi

exec node server/index.mjs

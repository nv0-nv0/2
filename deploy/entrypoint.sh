#!/usr/bin/env sh
set -eu

RUNTIME_DIR="${NV0_RUNTIME_DIR:-/app/runtime}"
mkdir -p "$RUNTIME_DIR/data" "$RUNTIME_DIR/uploads" "$RUNTIME_DIR/backups" "$RUNTIME_DIR/reports"

# Coolify/Docker named volumes can be created as root. Fix ownership before dropping privileges.
if [ "$(id -u)" = "0" ]; then
  chown -R nv0:nv0 "$RUNTIME_DIR" 2>/dev/null || true
  chmod -R u+rwX "$RUNTIME_DIR" 2>/dev/null || true
  if [ "${NV0_RUN_PREFLIGHT:-false}" = "true" ]; then
    su-exec nv0:nv0 node scripts/preflight.mjs
  fi
  exec su-exec nv0:nv0 node server/index.mjs
fi

if [ "${NV0_RUN_PREFLIGHT:-false}" = "true" ]; then
  node scripts/preflight.mjs
fi

exec node server/index.mjs

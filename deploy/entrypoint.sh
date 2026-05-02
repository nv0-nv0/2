#!/usr/bin/env sh
set -eu

log() {
  printf '%s\n' "$*" >&2
}

warn() {
  log "nv0 entrypoint warning: $*"
}

info() {
  log "nv0 entrypoint: $*"
}

RUNTIME_DIR="${NV0_RUNTIME_DIR:-/app/runtime}"
FALLBACK_RUNTIME_DIR="${NV0_FALLBACK_RUNTIME_DIR:-/tmp/nv0-runtime}"
APP_USER="${NV0_APP_USER:-nv0}"
APP_GROUP="${NV0_APP_GROUP:-nv0}"

prepare_runtime_tree() {
  dir="$1"
  mkdir -p "$dir/data" "$dir/uploads" "$dir/backups" "$dir/reports" 2>/dev/null || return 1
  if [ "$(id -u)" = "0" ]; then
    chown -R "$APP_USER:$APP_GROUP" "$dir" 2>/dev/null || true
    chmod -R u+rwX,g+rwX "$dir" 2>/dev/null || true
  fi
  return 0
}

runtime_writable() {
  dir="$1"
  probe="$dir/reports/.entrypoint-write-probe-$$"
  (umask 077 && printf 'ok' > "$probe") 2>/dev/null || return 1
  rm -f "$probe" 2>/dev/null || true
  return 0
}

if ! prepare_runtime_tree "$RUNTIME_DIR" || ! runtime_writable "$RUNTIME_DIR"; then
  warn "runtime dir '$RUNTIME_DIR' is not writable by uid=$(id -u); falling back to '$FALLBACK_RUNTIME_DIR'. Persistent local files may be ephemeral until the volume permission is fixed."
  RUNTIME_DIR="$FALLBACK_RUNTIME_DIR"
  if ! prepare_runtime_tree "$RUNTIME_DIR" || ! runtime_writable "$RUNTIME_DIR"; then
    warn "fallback runtime dir '$RUNTIME_DIR' is also not writable; continuing so external PostgreSQL/object-storage deployments can still boot."
  fi
fi

export NV0_RUNTIME_DIR="$RUNTIME_DIR"

if [ "${NV0_RUN_PREFLIGHT:-false}" = "true" ]; then
  node scripts/preflight.mjs
fi

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

exec node server/index.mjs

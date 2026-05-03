#!/usr/bin/env sh
set -eu

log() { printf '%s\n' "$*" >&2; }
warn() { log "nv0 entrypoint warning: $*"; }
info() { log "nv0 entrypoint: $*"; }

PLATFORM_TARGET="${NV0_PLATFORM_TARGET:-commercial}"
PERSISTENCE_MODE="${NV0_PERSISTENCE_MODE:-postgres_primary}"
STORAGE_MODE="${NV0_STORAGE_MODE:-s3}"
FALLBACK_RUNTIME_DIR="${NV0_FALLBACK_RUNTIME_DIR:-/tmp/nv0-runtime}"
APP_USER="${NV0_APP_USER:-nv0}"
APP_GROUP="${NV0_APP_GROUP:-nv0}"

external_durable_mode() {
  [ "$PLATFORM_TARGET" = "commercial" ] && [ "$PERSISTENCE_MODE" = "postgres_primary" ] && [ "$STORAGE_MODE" != "local_fs" ]
}

persistent_runtime_required() {
  [ "${NV0_REQUIRE_PERSISTENT_RUNTIME:-auto}" = "true" ] && return 0
  [ "${NV0_REQUIRE_PERSISTENT_RUNTIME:-auto}" = "false" ] && return 1
  external_durable_mode && return 1
  return 0
}

if [ -n "${NV0_RUNTIME_DIR:-}" ]; then
  RUNTIME_DIR="$NV0_RUNTIME_DIR"
elif external_durable_mode; then
  RUNTIME_DIR="$FALLBACK_RUNTIME_DIR"
else
  RUNTIME_DIR="/app/runtime"
fi

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
  if persistent_runtime_required; then
    warn "persistent runtime dir '$RUNTIME_DIR' is not writable by uid=$(id -u); trying fallback '$FALLBACK_RUNTIME_DIR'. For json/local_fs mode, fix the Docker volume before production."
  else
    info "runtime dir '$RUNTIME_DIR' is not writable by uid=$(id -u); using ephemeral scratch runtime '$FALLBACK_RUNTIME_DIR' because durable state is external ($PERSISTENCE_MODE/$STORAGE_MODE)."
  fi
  RUNTIME_DIR="$FALLBACK_RUNTIME_DIR"
  if ! prepare_runtime_tree "$RUNTIME_DIR" || ! runtime_writable "$RUNTIME_DIR"; then
    if persistent_runtime_required && [ "${NV0_ALLOW_UNWRITABLE_RUNTIME_BOOT:-false}" != "true" ]; then
      warn "fallback runtime dir '$RUNTIME_DIR' is also not writable; refusing to boot because local persistent runtime is required."
      exit 70
    fi
    warn "fallback runtime dir '$RUNTIME_DIR' is also not writable; continuing only because durable state is external or NV0_ALLOW_UNWRITABLE_RUNTIME_BOOT=true."
  fi
fi

export NV0_RUNTIME_DIR="$RUNTIME_DIR"
if external_durable_mode && [ "$RUNTIME_DIR" = "$FALLBACK_RUNTIME_DIR" ]; then
  export NV0_RUNTIME_EPHEMERAL="true"
fi

if [ "${NV0_RUN_PREFLIGHT:-false}" = "true" ]; then
  node scripts/preflight.mjs
fi

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

exec node server/index.mjs

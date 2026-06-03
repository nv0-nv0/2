#!/usr/bin/env sh
set -eu

log() { printf '%s\n' "$*" >&2; }
warn() { log "nv0 entrypoint warning: $*"; }
info() { [ "${NV0_ENTRYPOINT_VERBOSE:-false}" = "true" ] && log "nv0 entrypoint: $*" || true; }

PLATFORM_TARGET="${NV0_PLATFORM_TARGET:-commercial}"
PERSISTENCE_MODE="${NV0_PERSISTENCE_MODE:-postgres_primary}"
STORAGE_MODE="${NV0_STORAGE_MODE:-s3}"
FALLBACK_RUNTIME_DIR="${NV0_FALLBACK_RUNTIME_DIR:-/tmp/nv0-runtime}"
APP_USER="${NV0_APP_USER:-nv0}"
APP_GROUP="${NV0_APP_GROUP:-nv0}"
FORCE_RUNTIME_DIR="${NV0_FORCE_RUNTIME_DIR:-false}"

normalize_mode_value() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

PLATFORM_TARGET="$(normalize_mode_value "$PLATFORM_TARGET")"
PERSISTENCE_MODE="$(normalize_mode_value "$PERSISTENCE_MODE")"
STORAGE_MODE="$(normalize_mode_value "$STORAGE_MODE")"

# Commercial MFA is a non-optional security invariant. Coolify can retain an older
# explicit NV0_ADMIN_MFA_REQUIRED=false value, which overrides Compose defaults.
# Normalize that stale value to true inside the container so prelaunch can recover
# without weakening the commercial MFA requirement. The operator must still save
# NV0_ADMIN_MFA_REQUIRED=true in Coolify to remove this warning permanently.
ADMIN_MFA_REQUIRED_NORMALIZED="$(normalize_mode_value "${NV0_ADMIN_MFA_REQUIRED:-}")"
if [ "$PLATFORM_TARGET" = "commercial" ] && [ "$ADMIN_MFA_REQUIRED_NORMALIZED" != "true" ]; then
  warn "commercial profile forces NV0_ADMIN_MFA_REQUIRED=true; stale or missing Coolify value was normalized in-container. Save NV0_ADMIN_MFA_REQUIRED=true in Coolify and redeploy to remove this warning."
  export NV0_ADMIN_MFA_REQUIRED="true"
  export NV0_ADMIN_MFA_RECOVERY_NORMALIZED="true"
fi

external_durable_mode() {
  [ "$PLATFORM_TARGET" = "commercial" ] && [ "$PERSISTENCE_MODE" = "postgres_primary" ] && [ "$STORAGE_MODE" != "local_fs" ]
}

persistent_runtime_required() {
  [ "${NV0_REQUIRE_PERSISTENT_RUNTIME:-auto}" = "true" ] && return 0
  [ "${NV0_REQUIRE_PERSISTENT_RUNTIME:-auto}" = "false" ] && return 1
  external_durable_mode && return 1
  return 0
}

is_legacy_runtime_dir() {
  [ "$1" = "/app/runtime" ] || [ "$1" = "/app/runtime/" ]
}

runtime_env_is_set() {
  [ "${NV0_RUNTIME_DIR+x}" = "x" ] && [ -n "${NV0_RUNTIME_DIR:-}" ]
}

if runtime_env_is_set; then
  RUNTIME_DIR="$NV0_RUNTIME_DIR"
else
  RUNTIME_DIR="/app/runtime"
fi

# Coolify can preserve an older NV0_RUNTIME_DIR=/app/runtime override even after the
# image and env examples changed. In commercial postgres+s3 mode the durable state is
# already external, so treat that legacy override as scratch-runtime auto mode unless
# the operator explicitly forces it.
if external_durable_mode && ! persistent_runtime_required && [ "$FORCE_RUNTIME_DIR" != "true" ] && is_legacy_runtime_dir "$RUNTIME_DIR"; then
  RUNTIME_DIR="$FALLBACK_RUNTIME_DIR"
  info "using ephemeral scratch runtime '$RUNTIME_DIR' for external durable mode; legacy /app/runtime override ignored."
elif ! runtime_env_is_set && external_durable_mode; then
  RUNTIME_DIR="$FALLBACK_RUNTIME_DIR"
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

ADMIN_AUTH_MODE_NORMALIZED="$(normalize_mode_value "${NV0_ADMIN_AUTH_MODE:-account_rbac}")"
DEPLOYMENT_STAGE_NORMALIZED="$(normalize_mode_value "${NV0_DEPLOYMENT_STAGE:-prelaunch}")"
COMMERCIAL_LAUNCH_READY_NORMALIZED="$(normalize_mode_value "${NV0_COMMERCIAL_LAUNCH_READY:-false}")"
if [ "$PLATFORM_TARGET" = "commercial" ] && [ "$ADMIN_AUTH_MODE_NORMALIZED" = "account_rbac" ] && [ -n "${NV0_ADMIN_KEY:-}" ]; then
  warn "legacy NV0_ADMIN_KEY is set in commercial account_rbac mode; unsetting it so preflight and the server cannot use the deprecated shared-key admin path."
  unset NV0_ADMIN_KEY
  export NV0_LEGACY_ADMIN_KEY_SANITIZED="true"
fi

# Always validate the finalized commercial TOTP secret before importing the server.
# Safely normalize only transport mistakes that preserve the same Base32 value:
# KEY=value pasted into a Value field, wrapping quotes, spaces, CRLF, or visual hyphens.
# Never coerce a different application secret into a TOTP key.
normalize_totp_transport_value() {
  raw="${NV0_ADMIN_TOTP_SECRET:-}"
  normalized="$(printf '%s' "$raw" \
    | sed -e 's/^NV0_ADMIN_TOTP_SECRET[[:space:]]*=[[:space:]]*//' \
          -e 's/^[[:space:]]*["'"'"']//; s/["'"'"'][[:space:]]*$//' \
    | tr -d '[:space:]-' \
    | tr '[:lower:]' '[:upper:]')"
  if [ -n "$normalized" ] && [ "$normalized" != "$raw" ]; then
    export NV0_ADMIN_TOTP_SECRET="$normalized"
    export NV0_ADMIN_TOTP_TRANSPORT_NORMALIZED="true"
    warn "normalized NV0_ADMIN_TOTP_SECRET transport formatting before validation; save the raw Base32 value only in Coolify Normal View."
  fi
}

handle_commercial_totp_preflight_failure() {
  mode="$(normalize_mode_value "${NV0_TOTP_PREFLIGHT_FAILURE_MODE:-auto}")"
  delay="${NV0_PREFLIGHT_FAILURE_DELAY_SECONDS:-15}"
  case "$delay" in *[!0-9]*|'') delay=15 ;; esac
  if [ "$mode" = "auto" ]; then
    if [ "$DEPLOYMENT_STAGE_NORMALIZED" = "prelaunch" ] && [ "$COMMERCIAL_LAUNCH_READY_NORMALIZED" != "true" ]; then
      mode="hold"
    else
      mode="exit"
    fi
  fi
  case "$mode" in
    hold)
      warn "commercial TOTP preflight failed; refusing to start the application and entering safe configuration hold mode. The container stays alive without serving traffic so Coolify does not create a restart-log storm. Save a dedicated Base32 NV0_ADMIN_TOTP_SECRET Runtime Variable and redeploy."
      exec tail -f /dev/null
      ;;
    exit)
      warn "commercial TOTP preflight failed; refusing to start the application. Waiting ${delay}s before exit."
      sleep "$delay"
      exit 78
      ;;
    *)
      warn "invalid NV0_TOTP_PREFLIGHT_FAILURE_MODE='$mode'; allowed values are auto, hold, exit. Failing closed after ${delay}s."
      sleep "$delay"
      exit 78
      ;;
  esac
}

handle_commercial_runtime_preflight_failure() {
  mode="$(normalize_mode_value "${NV0_RUNTIME_PREFLIGHT_FAILURE_MODE:-${NV0_TOTP_PREFLIGHT_FAILURE_MODE:-auto}}")"
  delay="${NV0_PREFLIGHT_FAILURE_DELAY_SECONDS:-15}"
  case "$delay" in *[!0-9]*|'') delay=15 ;; esac
  if [ "$mode" = "auto" ]; then
    if [ "$DEPLOYMENT_STAGE_NORMALIZED" = "prelaunch" ] && [ "$COMMERCIAL_LAUNCH_READY_NORMALIZED" != "true" ]; then
      mode="hold"
    else
      mode="exit"
    fi
  fi
  case "$mode" in
    hold)
      warn "commercial runtime configuration preflight failed; refusing to start the application and entering safe configuration hold mode. The container stays alive without serving traffic. Run npm run secrets:generate locally, finalize the reported Coolify Runtime Variables, and redeploy."
      exec tail -f /dev/null
      ;;
    exit)
      warn "commercial runtime configuration preflight failed; refusing to start the application. Waiting ${delay}s before exit."
      sleep "$delay"
      exit 79
      ;;
    *)
      warn "invalid NV0_RUNTIME_PREFLIGHT_FAILURE_MODE='$mode'; allowed values are auto, hold, exit. Failing closed after ${delay}s."
      sleep "$delay"
      exit 79
      ;;
  esac
}

if [ "$PLATFORM_TARGET" = "commercial" ]; then
  normalize_totp_transport_value
  if ! node scripts/check-commercial-totp-preflight.mjs; then
    handle_commercial_totp_preflight_failure
  fi
  if ! node scripts/check-commercial-runtime-startup-preflight.mjs; then
    handle_commercial_runtime_preflight_failure
  fi
fi

if [ "${NV0_RUN_PREFLIGHT:-false}" = "true" ]; then
  if ! node scripts/preflight.mjs; then
    if [ "$PLATFORM_TARGET" = "commercial" ]; then
      handle_commercial_runtime_preflight_failure
    fi
    exit 1
  fi
fi

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

exec node server/index.mjs

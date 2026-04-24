#!/usr/bin/env sh
set -eu

mkdir -p /app/runtime/data /app/runtime/uploads /app/runtime/backups /app/runtime/reports

node scripts/preflight.mjs
exec node server/index.mjs

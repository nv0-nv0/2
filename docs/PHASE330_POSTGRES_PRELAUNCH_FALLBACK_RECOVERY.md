# PHASE330 PostgreSQL Prelaunch Fallback Recovery

## Problem

Coolify prelaunch deployments can pass config validation and then crash during startup when the application is configured with:

- `NV0_PERSISTENCE_MODE=postgres_primary`
- `NV0_DATABASE_URL=postgres://...@postgres:5432/...`
- boot-safe compose files that do not start a `postgres` service

The observed crash was:

```text
PostgreSQL schema bootstrap failed: psql: error: could not translate host name "postgres" to address: Try again
```

## Fix

Phase330 separates prelaunch reachability from strict commercial launch persistence:

1. Prelaunch can continue with JSON runtime fallback when PostgreSQL DNS/connection/bootstrap fails.
2. The fallback writes both database snapshots and sessions to the JSON runtime store.
3. `commercial_launch` remains strict and does not fall back to JSON.
4. `NV0_PRELAUNCH_DB_FALLBACK=true` is exposed in root/Coolify compose and environment examples.
5. Preflight and runtime validation no longer hard-fail on a missing/placeholder PostgreSQL URL during prelaunch when fallback is enabled.
6. A regression validator simulates the exact `postgres` DNS failure by injecting a fake `psql` binary.

## Operational rule

Use this mode only while `NV0_DEPLOYMENT_STAGE=prelaunch` and `NV0_COMMERCIAL_LAUNCH_READY=false`.

Before real commercial launch:

- Configure reachable PostgreSQL.
- Set `NV0_DEPLOYMENT_STAGE=commercial_launch`.
- Set `NV0_COMMERCIAL_LAUNCH_READY=true`.
- Set `NV0_PRELAUNCH_DB_FALLBACK=false` or leave the commercial launch strict default in place.

## Validation

```bash
npm run validate:phase330
npm run phase330:final
```

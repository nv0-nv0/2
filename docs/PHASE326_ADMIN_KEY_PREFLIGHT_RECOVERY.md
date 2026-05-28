# PHASE326 Admin Key Preflight Recovery

## Problem

Coolify/prelaunch deployments could repeatedly fail with:

```json
{
  "ok": false,
  "commercial": true,
  "deploymentStage": "prelaunch",
  "errors": ["NV0_ADMIN_KEY must not be used for commercial launch"]
}
```

The root cause was a legacy MVP shared admin key (`NV0_ADMIN_KEY`) remaining in the environment while the deployment was already marked as `NV0_PLATFORM_TARGET=commercial`.

## Fix

- Boot-safe compose files no longer inject `NV0_ADMIN_KEY` by default.
- The entrypoint sanitizes `NV0_ADMIN_KEY` when `NV0_PLATFORM_TARGET=commercial` and `NV0_ADMIN_AUTH_MODE=account_rbac`.
- Preflight now blocks `NV0_ADMIN_KEY` only for the actual commercial launch state (`NV0_COMMERCIAL_LAUNCH_READY=true` or `NV0_DEPLOYMENT_STAGE=commercial_launch`).
- In commercial prelaunch, the legacy key is reported as a warning and ignored by the container entrypoint.

## Required Coolify cleanup

For commercial/prelaunch, remove this variable from Coolify if it exists:

```text
NV0_ADMIN_KEY
```

Use these instead:

```text
NV0_ADMIN_AUTH_MODE=account_rbac
NV0_BOOTSTRAP_ADMIN_EMAIL=admin@nv0.kr
NV0_BOOTSTRAP_ADMIN_PASSWORD=<long-random-password>
```

## Rule

- MVP/boot-only shared admin: `NV0_PLATFORM_TARGET=mvp`, `NV0_ADMIN_AUTH_MODE=shared_key`, optional `NV0_ADMIN_KEY`.
- Commercial/prelaunch: `NV0_PLATFORM_TARGET=commercial`, `NV0_ADMIN_AUTH_MODE=account_rbac`, no `NV0_ADMIN_KEY`.
- Commercial launch: `NV0_ADMIN_KEY` is a hard blocker.

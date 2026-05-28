# PHASE326 Admin Key Preflight Report

## Result

The repeated preflight response below is fixed at package level:

```json
{
  "ok": false,
  "commercial": true,
  "deploymentStage": "prelaunch",
  "errors": ["NV0_ADMIN_KEY must not be used for commercial launch"]
}
```

## What changed

1. Boot-safe compose no longer injects `NV0_ADMIN_KEY`.
2. The container entrypoint sanitizes `NV0_ADMIN_KEY` when commercial mode uses `account_rbac`.
3. Preflight now allows commercial `prelaunch` to continue with a warning if a legacy admin key remains.
4. Actual commercial launch still fails if `NV0_ADMIN_KEY` exists.
5. phase326 validation proves both cases.

## Correct Coolify configuration

Remove `NV0_ADMIN_KEY` from Coolify for commercial/prelaunch.

Use:

```text
NV0_PLATFORM_TARGET=commercial
NV0_DEPLOYMENT_STAGE=prelaunch
NV0_COMMERCIAL_LAUNCH_READY=false
NV0_ADMIN_AUTH_MODE=account_rbac
NV0_BOOTSTRAP_ADMIN_EMAIL=admin@nv0.kr
NV0_BOOTSTRAP_ADMIN_PASSWORD=<long-random-password>
```

## Commercial launch rule

Before setting `NV0_COMMERCIAL_LAUNCH_READY=true`, ensure `NV0_ADMIN_KEY` is absent. The final commercial launch gate intentionally blocks legacy shared-key admin access.

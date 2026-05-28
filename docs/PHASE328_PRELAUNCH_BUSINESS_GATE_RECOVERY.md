# PHASE328 Prelaunch Business Gate Recovery

## Problem

Commercial prelaunch deployments were blocked by the following preflight errors before the server could boot:

- `NV0_BUSINESS_TRADE_NAME is required`
- `NV0_BUSINESS_REPRESENTATIVE is required`
- `NV0_BUSINESS_REGISTRATION_NUMBER is required`
- `NV0_BUSINESS_ADDRESS is required`

Those values are legally required for a real commercial launch, but they should not prevent a private prelaunch environment from booting for operational checks.

## Fix

The runtime gate is now split into two stages:

1. **Commercial prelaunch**
   - Core production safety keys remain hard-required.
   - Missing business profile values become warnings.
   - The server can boot for private prelaunch verification.

2. **Commercial launch**
   - Business profile values are hard-required.
   - `NV0_MAIL_ORDER_REGISTRATION_NUMBER` is also hard-required.
   - Launch remains blocked until legal/commercial values are finalized.

## Files changed

- `server/config/validation.mjs`
- `scripts/preflight.mjs`
- `scripts/validate-prod-env.mjs`
- `scripts/validate-phase328-prelaunch-business-gate.mjs`
- `package.json`

## Operator note

For prelaunch, the missing business profile warning is acceptable only when the environment is private and not processing real customer payments.

Before setting `NV0_COMMERCIAL_LAUNCH_READY=true` or `NV0_DEPLOYMENT_STAGE=commercial_launch`, configure real values:

```env
NV0_BUSINESS_TRADE_NAME=
NV0_BUSINESS_REPRESENTATIVE=
NV0_BUSINESS_REGISTRATION_NUMBER=
NV0_BUSINESS_ADDRESS=
NV0_MAIL_ORDER_REGISTRATION_NUMBER=
```

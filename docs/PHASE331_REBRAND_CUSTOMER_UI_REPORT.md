# PHASE331 Rebrand Customer UI Delivery Report

## Scope

This package applies the selected C-plan rebranding direction to the customer-facing VERIDION experience while preserving the existing package functionality and deployment safeguards.

## Applied changes

- Rebuilt the public homepage as a premium B2B SaaS landing page.
- Rebuilt the customer portal as a dark executive-style dashboard.
- Rebuilt the free diagnosis entry page as a report-centered experience.
- Removed internal operating language from customer-facing portal surfaces.
- Removed public exposure of terms such as internal stage markers, sentinel, rollback, canary, launch-control wording, operational queue wording, and internal handoff wording.
- Kept required functional DOM ids for the existing diagnosis, account, site-save, and board integrations.
- Simplified the portal client script so it uses only customer-facing account and board endpoints.
- Added a dedicated v331 design system layer to the existing shared stylesheet.
- Added design reference images under `docs/design-reference/` for the homepage, customer portal, and report page.
- Added `validate:phase331` and `phase331:final` package scripts.

## Main files changed

- `apps/public/home/index.html`
- `apps/public/portal/index.html`
- `apps/public/portal/app.js`
- `apps/public/veridion-demo/index.html`
- `apps/public/demo/index.html`
- `apps/public/veridion-demo/app.js`
- `apps/public/demo/app.js`
- `shared/veridion-clean-v311.css`
- `scripts/smoke.mjs`
- `scripts/test-all.mjs`
- `tests/e2e.mjs`
- `scripts/validate-phase331-rebrand-customer-ui.mjs`
- `package.json`

## Verification completed

Final command executed:

```bash
npm run phase331:final
```

Passed gates:

- `validate:phase331`
- `check:syntax`
- `npm test`
- `test:e2e`
- `check:pages`
- `test:routes`
- `check:links`
- `smoke`
- `check:responsive-contract`
- `check:performance-budget`
- `verify:security`
- `validate:deploy`
- `check:release-secret-hygiene`
- `validate:phase325`
- `validate:phase326`
- `validate:phase328`
- `validate:phase329`
- `validate:phase330`
- `clean:runtime`
- `check-runtime-clean`

## Deployment note

This remains a prelaunch-safe package. If `NV0_DEPLOYMENT_STAGE=prelaunch` and `NV0_PRELAUNCH_DB_FALLBACK=true`, PostgreSQL unavailability will not block private prelaunch startup. Commercial launch remains strict and still requires the real database and the missing mail-order registration number.

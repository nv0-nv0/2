# VERIDION Phase303 Live Evidence Handoff Report

## 1. Current judgement

Phase303 is a final closeout refinement over Phase302. Phase302 correctly separated package readiness from live readiness, but one operational gap remained: after `release:postdeploy` ran `verify:prod`, the following `ops:production-matrix` command did not ingest the generated live verification report. As a result, a successful live public smoke check could still leave the operational matrix showing `liveVerifiedCount: 0`.

Phase303 fixes that gap without overstating commercial readiness. A successful live `verify:prod` now counts only the public live smoke evidence item. Payment, SMTP, storage, backup, monitoring, visual QA, and other operational checks still remain separately required.

## 2. Changes applied

- Added `live-public-smoke` to the final delivery operational matrix.
- Updated `scripts/ops-production-verification.mjs` to read `docs/current/VERIFY_PROD_REPORT.json`.
- The live public smoke item is marked verified only when all conditions are true:
  - `NV0_VERIFY_MODE=live` is set for the matrix run.
  - `VERIFY_PROD_REPORT.json` exists.
  - the report has `ok: true`.
  - the report mode is `live`.
  - the base URL is `https://nv0.kr` or `https://www.nv0.kr`.
- Updated `release:postdeploy` so the live mode is passed to both the verification and matrix commands.
- Added `scripts/validate-phase303-live-evidence-handoff.mjs`.
- Updated `delivery:final` and `release:predeploy` to point to `phase303:final`.
- Reduced duplicated `check:links --summary --summary` command noise by using the package-level `check:links` script.
- Cleaned public README headings from legacy NV0 product label to VERIDION while preserving the `NV0_` environment variable namespace.

## 3. Score logic

Default package state remains honest:

```json
{
  "packageScore": 100,
  "liveScore": 0,
  "goLiveScore": 70,
  "finalJudgement": "package-delivery-ready-live-verification-required"
}
```

After a successful live `verify:prod` and `ops:production-matrix` run, only the live public smoke item should be credited. This raises the live evidence count but does not make the service commercially live-ready by itself.

## 4. Commands

Pre-deploy package validation:

```bash
npm run release:predeploy
```

Post-deploy live validation:

```bash
npm run release:postdeploy
```

Manual equivalent:

```bash
NV0_VERIFY_MODE=live NV0_BASE_URL=https://www.nv0.kr npm run verify:prod
NV0_VERIFY_MODE=live npm run ops:production-matrix
```

## 5. Remaining live-only requirements

The following cannot be honestly completed inside a static package:

- production `.env` real values
- PortOne sandbox/production payment and webhook proof
- SMTP real delivery proof
- R2/S3 upload/download probe
- Turnstile real challenge verification
- mobile and desktop browser visual QA evidence
- 20-minute autopublish observation twice or more
- backup/restore drill on production data
- monitoring alert receipt proof
- CDN/cache purge proof

## 6. Final judgement

Phase303 is the recommended handoff package because it keeps the package score high while preventing a common post-deploy reporting mistake: live verification evidence no longer disappears from the final operational matrix.

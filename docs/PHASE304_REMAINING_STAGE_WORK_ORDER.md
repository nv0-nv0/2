# Phase304 Remaining Stage Work Order

## 1. Current judgement

This phase is a final remaining-stage closeout. Phase303 already made the package deployable, but the final commercial-live-ready decision still depends on live server and external-provider evidence.

## 2. Remaining element count

- Total go-live elements tracked: **총 13개**
- Package-side controls applied: **13 / 13 적용 완료**
- Live/external confirmation still required: **13 / 13 실서버에서만 완료** in a clean package environment
- Package judgement: `package-delivery-ready-live-verification-required`

## 3. Work order

| ID | Element | Package-side action | Live completion condition |
|---|---|---|---|
| P0-01 | Live public smoke verification | `verify:prod` checks public/legal/price/admin routes | `NV0_VERIFY_MODE=live NV0_BASE_URL=https://www.nv0.kr npm run verify:prod` succeeds |
| P0-02 | Production environment values | `validate:env`, `validate:env:ci`, strict placeholder gates | Real `.env.production` values are injected and approved |
| P0-03 | Legacy data/content migration | Package gates keep new public copy clean | Live DB dry-run/migration removes old public content |
| P0-04 | Deploy cache purge | Runbook and postdeploy commands fixed | CDN/browser cache shows new VERIDION pages |
| P0-05 | Desktop visual QA | Static page/link/layout gates pass | Chrome, Edge, Safari are checked on the live domain |
| P0-06 | Mobile visual QA | Responsive guards and route coverage pass | 360/390/430px real-device or emulator QA is recorded |
| P0-07 | Autopublish observation | 20-minute cadence logic remains locked | Two or more production autopublish cycles are observed |
| P0-08 | PortOne payment | Catalog/checkout/provider gates are fixed | Sandbox/production payment and webhook logs pass |
| P0-09 | SMTP delivery | SMTP env gate and mail operation paths exist | Production inbox receives expected messages |
| P0-10 | R2/S3 object storage | Storage config checker blocks placeholders | Upload and download probes pass on real storage |
| P0-11 | HTTPS cookie/session | Security headers and route guards exist | Login/session persists on `https://www.nv0.kr` |
| P0-12 | Backup/restore drill | Runtime backup and restore drill scripts exist | Production backup restore rehearsal is approved |
| P0-13 | Monitoring/alert receipt | Monitoring and rollback gates exist | Operator alert channel receives test notification |

## 4. Scope applied in Phase304

- Created a machine-readable remaining-stage inventory.
- Created a human-readable remaining-stage inventory.
- Added a Phase304 validator that verifies the exact 13-item count.
- Updated final delivery scripts so `delivery:final` and `release:predeploy` point to Phase304.
- Updated `release:postdeploy` so live verification also refreshes the remaining-stage inventory.
- Updated the final ops engine to expose the 13 remaining items and category counts.

## 5. Excluded live-only scope

The following are intentionally not marked complete in the package because they require server credentials, external account access, or real browser/device evidence:

- Real nv0.kr deployment
- Real production environment values
- PortOne account and webhook proof
- SMTP provider proof
- R2/S3 bucket proof
- Turnstile/live browser session proof
- Production backup/restore proof
- Monitoring alert receipt proof

## 6. Completion rule

The package can be delivered when `npm run phase304:final` passes. The service can only be marked `commercial-live-ready` when all 13 live signals are verified after deployment.

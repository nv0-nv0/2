# Phase305 Final Integrity Closeout Report

## Summary

Phase305 closes the final consistency issue found during the whole-package re-audit. The package now keeps postdeploy live evidence consistent across:

- `docs/current/VERIFY_PROD_REPORT.json`
- `docs/current/PHASE305_OPERATIONAL_MATRIX.json`
- `docs/current/PHASE304_REMAINING_STAGE_INVENTORY.json`

## Fixed issue

Phase304 `release:postdeploy` refreshed the remaining-stage inventory after live verification, but the generator did not ingest live verification evidence. Therefore, a successful public live smoke check could be counted by the operational matrix while the inventory still showed all 13 live tasks as outstanding.

## Applied fix

The remaining-stage generator now reads `VERIFY_PROD_REPORT.json` when `NV0_VERIFY_MODE=live` and credits only the `live-public-smoke` item if the report is successful, live-mode, and targeted at `https://nv0.kr` or `https://www.nv0.kr`.

## Final rule

- Default package validation: 13 live items remain required.
- After successful live public smoke: 12 live items remain required.
- Commercial live ready: only when all 13 live signals are verified.

## Validation

Run:

```bash
npm run phase305:final
```

Post-deploy:

```bash
npm run release:postdeploy
```

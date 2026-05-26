# Phase305 Integrity Closeout Work Order

## Current judgement

Phase304 package gates passed, but the post-deploy flow had one remaining integrity collision: live verification evidence was reflected in the operational matrix while the remaining-stage inventory could still be regenerated without that evidence.

## Goal

Close the mismatch between postdeploy live proof, operational matrix, and remaining-stage inventory. live 검증 결과가 운영 매트릭스와 남은 단계 인벤토리에 동일하게 반영되도록 고정합니다.

## Scope

1. Propagate `VERIFY_PROD_REPORT.json` live evidence into the remaining-stage generator.
2. Ensure `release:postdeploy` passes `NV0_VERIFY_MODE=live` into the generator.
3. Add a Phase305 validation gate that simulates live public smoke evidence and verifies that inventory counts drop from 13 remaining live actions to 12.
4. Keep commercial-live-ready blocked until all 13 live signals are verified.

## Excluded scope

Actual nv0.kr deployment, PortOne live payment, SMTP delivery, R2/S3 probe, Turnstile verification, and browser-device QA remain live-environment tasks.

## Risk and rollback

- Risk: regenerated inventory could overstate live readiness.
- Guard: Phase305 only credits one live public smoke item for `VERIFY_PROD_REPORT.json`; all other live items remain explicit external signals.
- Rollback: revert `scripts/generate-phase304-remaining-stage-inventory.mjs`, `server/core/final-delivery-ops-engine.mjs`, `package.json`, and docs added in Phase305.

## Definition of Done

- [x] Phase305 validator added.
- [x] Postdeploy command updated.
- [x] Remaining-stage generator reads live proof safely.
- [x] Local default remains honest: 13 live actions required.
- [x] Simulated live public smoke reduces required live actions to 12 only.
- [x] Full phase305 final gate passes.

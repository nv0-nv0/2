# PHASE353 변경 파일 목록

원본 `veridion_phase352_closeout_final_20260601.zip`과 PHASE353 최종 납품 작업 트리의 파일 해시를 비교한 결과다. 활성 런타임 상태는 배송 ZIP에서 의도적으로 제거한다.

- 신규 파일: **19개**
- 삭제 파일: **3개**
- 변경 파일: **41개**

## 신규 파일

- `.env.coolify.example`
- `.env.example`
- `docs/PHASE353_CHANGED_FILES.md`
- `docs/PHASE353_FULL_PACKAGE_CLOSEOUT.md`
- `docs/PHASE353_FULL_PACKAGE_WORK_ORDER.md`
- `docs/PHASE353_GLOBAL_AUDIT_REPORT.md`
- `docs/PHASE353_REMEDIATION_MATRIX.md`
- `docs/current/PHASE353_ALIAS_VERIFICATION.json`
- `docs/current/PHASE353_COMPAT_PHASE351_VALIDATION.json`
- `docs/current/PHASE353_CUSTOMER_JOURNEY_CONTRACT.json`
- `docs/current/PHASE353_DIAGNOSIS_COPY_CONTRACT.json`
- `docs/current/PHASE353_FINAL_GATE_REPORT.json`
- `docs/current/PHASE353_GLOBAL_AUDIT.json`
- `docs/current/PHASE353_GLOBAL_CTA_SEMANTICS_CONTRACT.json`
- `docs/current/PHASE353_PROMPT_DOD_CONTRACT.json`
- `docs/current/PHASE353_RESULT_ACTION_STATE_CONTRACT.json`
- `runtime/data/db.seed.json`
- `scripts/run-phase353-audit.mjs`
- `scripts/run-phase353-final.mjs`

## 삭제 파일 — 배송 ZIP 정리 대상

- `runtime/data/db.json`
- `runtime/data/secure-records/secure-records.dev.json`
- `runtime/data/sessions.json`

## 변경 파일

- `README.md`
- `RUN_ALL_TESTS.sh`
- `deploy/coolify.env.example`
- `deploy/env.commercial.template`
- `deploy/env.production.nv0.kr.example`
- `deploy/env.production.template`
- `docs/PHASE352_UNIQUE_REMEDIATION_MATRIX.md`
- `docs/current/PHASE310_SECRET_HYGIENE_AUDIT.json`
- `docs/current/PHASE334_RESPONSIVE_CONTRACT.json`
- `docs/current/PHASE335_TEST_SUMMARY.json`
- `docs/current/PHASE343_OPERATIONAL_READINESS_CONTRACT.json`
- `docs/current/PHASE348_RESULT_ACTION_STATE_CONTRACT.json`
- `docs/current/PHASE349_CUSTOMER_JOURNEY_CONTRACT.json`
- `docs/current/PHASE349_DIAGNOSIS_COPY_CONTRACT.json`
- `docs/current/PHASE350_GLOBAL_CTA_SEMANTICS_CONTRACT.json`
- `docs/current/PHASE351_FINAL_GATE_REPORT.json`
- `docs/current/PHASE351_PROMPT_DOD_CONTRACT.json`
- `docs/current/PHASE351_UI_GLOBAL_SWEEP.json`
- `package.json`
- `scripts/check-customer-journey-contract.mjs`
- `scripts/check-diagnosis-copy-contract.mjs`
- `scripts/check-global-cta-semantics.mjs`
- `scripts/check-operational-readiness-contract.mjs`
- `scripts/check-prompt-dod-contract.mjs`
- `scripts/check-public-product-pipeline.mjs`
- `scripts/check-release-currentness.mjs`
- `scripts/check-result-action-state-contract.mjs`
- `scripts/check-ui-global-sweep.mjs`
- `scripts/run-phase352-check.mjs`
- `scripts/test-all.mjs`
- `scripts/validate-phase340-redteam-closeout.mjs`
- `scripts/validate-phase350-global-cta-semantics.mjs`
- `scripts/validate-phase351-prompt-full-sweep.mjs`
- `server/routes/public.mjs`
- `tests/e2e.mjs`
- `tests/trustops-100-final.mjs`
- `tests/trustops-autopilot.mjs`
- `tests/trustops-final-handoff.mjs`
- `tests/trustops-growth.mjs`
- `tests/trustops-launch-control.mjs`
- `tests/trustops-production-sentinel.mjs`

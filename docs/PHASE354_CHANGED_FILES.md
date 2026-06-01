# PHASE354 변경 파일 목록

PHASE353 ZIP 기준 신규 **18개**, 변경 **32개**, 삭제 **0개**입니다.

## 신규 파일
- `.gitignore`
- `docs/PHASE354_CHANGED_FILES.md`
- `docs/PHASE354_DEPLOYMENT_SECURITY_CLOSEOUT.md`
- `docs/PHASE354_DEPLOYMENT_SECURITY_WORK_ORDER.md`
- `docs/PHASE354_FULL_PACKAGE_CLOSEOUT.md`
- `docs/PHASE354_OPERATOR_CONFIRMATION_CHECKLIST.md`
- `docs/PHASE354_REMEDIATION_MATRIX.md`
- `docs/current/PHASE354_ALIAS_VERIFICATION.json`
- `docs/current/PHASE354_COMPOSE_ENV_FORWARDING.json`
- `docs/current/PHASE354_DELIVERY_INVENTORY.json`
- `docs/current/PHASE354_DELIVERY_MANIFEST.txt`
- `docs/current/PHASE354_FINAL_GATE_REPORT.json`
- `docs/current/PHASE354_GLOBAL_AUDIT.json`
- `docs/current/PHASE354_OPERATOR_CONFIRMATION_RISK.json`
- `scripts/check-compose-env-forwarding.mjs`
- `scripts/run-phase354-audit.mjs`
- `scripts/run-phase354-final.mjs`
- `tests/public-probe-minimal-contract.mjs`

## 변경 파일
- `.env.coolify.example`
- `.env.example`
- `README.md`
- `RUN_ALL_TESTS.sh`
- `deploy/coolify.env.bulk.txt`
- `deploy/coolify.env.example`
- `deploy/docker-compose.coolify.yml`
- `deploy/env.commercial.template`
- `deploy/env.production.nv0.kr.ci-check.env`
- `deploy/env.production.nv0.kr.example`
- `deploy/env.production.template`
- `docker-compose.yml`
- `docs/PHASE353_GLOBAL_AUDIT_REPORT.md`
- `docs/current/PHASE310_SECRET_HYGIENE_AUDIT.json`
- `docs/current/PHASE335_TEST_SUMMARY.json`
- `docs/current/PHASE343_OPERATIONAL_READINESS_CONTRACT.json`
- `docs/current/PHASE351_FINAL_GATE_REPORT.json`
- `docs/current/PHASE353_FINAL_GATE_REPORT.json`
- `docs/current/PHASE353_GLOBAL_AUDIT.json`
- `package.json`
- `scripts/check-operational-readiness-contract.mjs`
- `scripts/check-prompt-dod-contract.mjs`
- `scripts/check-release-currentness.mjs`
- `scripts/generate-commercial-secrets.mjs`
- `scripts/generate-r2-coolify-env.mjs`
- `scripts/run-phase353-audit.mjs`
- `scripts/test-all.mjs`
- `scripts/validate-phase340-redteam-closeout.mjs`
- `scripts/validate-phase350-global-cta-semantics.mjs`
- `scripts/validate-phase351-prompt-full-sweep.mjs`
- `server/index.mjs`
- `tests/e2e.mjs`

## 삭제 파일
- 없음

## 변경 원칙

- 활성 DB, 세션, 보안 레코드는 배송 ZIP에서 제외합니다.
- 사업자 공개 정보는 자동 삭제하지 않고 운영자 확인 대상으로 분리합니다.
- DB 스키마와 결제 로직은 변경하지 않았습니다.

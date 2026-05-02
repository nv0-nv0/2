# Phase167 납품 매니페스트

- 패키지: `nv0_full_p167_native_http_load_security_delivery.zip`
- 기준: `phase166-native-http-route-split`
- Phase: `phase167-native-http-load-security-50`
- 생성: `2026-05-02T10:03:13Z`

## 주요 변경 파일

- `package.json`
- `server/index.mjs`
- `server/core/native-route-state.mjs`
- `server/middleware/security.mjs`
- `server/routes/public.mjs`
- `server/routes/admin.mjs`
- `server/routes/payment.mjs`
- `server/routes/account.mjs`
- `server/routes/ops.mjs`
- `scripts/validate-phase167-native-http-load-security.mjs`
- `tests/e2e.mjs`
- `tests/routes-smoke.mjs`
- `docs/PHASE167_NATIVE_HTTP_LOAD_SECURITY_REPORT_20260502_KO.md`
- `docs/PHASE167_NATIVE_HTTP_LOAD_SECURITY_VALIDATION_20260502.json`
- `docs/PHASE167_NV0_NATIVE_HTTP_LOAD_SECURITY_50_WORK_ORDER_KO.md`

## 검증

- `npm run check:syntax`: 통과 — 191 source files checked
- `npm run test:all`: 통과 — 88 passed / 0 failed
- `npm run test:e2e`: 통과 — E2E passed
- `npm run test:routes`: 통과 — 24 routes checked
- `npm run test:security-stateful`: 통과 — 5 security checks passed
- `npm run validate:phase166`: 통과 — phase166 compatibility retained
- `npm run validate:phase167`: 통과 — 15 phase167 checks passed
- `npm run check:links`: 통과 — 149 links checked / 0 errors
- `npm run stress:smoke`: 통과 — 56 requests / 0 failures
- `npm run phase167:final`: 통과 — final gate passed after runtime report cleanup

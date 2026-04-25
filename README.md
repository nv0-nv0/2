# NV0 / Veridion Commercial Launch Build

이 패키지는 공개 런칭 기준을 기본값으로 정리한 상용화 보강본입니다. 운영 모드는 `NV0_PLATFORM_TARGET=commercial`이며, shared admin key, demo payment, JSON primary persistence, builtin scan, local filesystem storage는 상용 런칭 경로에서 차단됩니다.

## Commercial quick gate

```bash
npm run validate:commercial
npm run validate:pipeline
npm run test:all
npm run ci:strict
```

실서버에서는 PortOne 운영키, PostgreSQL, Redis, S3-compatible storage, 외부 scan provider를 연결한 뒤 `/readyz`가 200을 반환해야 공개 전환합니다.

# NV0 / Veridion Cleanroom Rebuild Starter

이 패키지는 기존 `site.js`, `site.css`, `site-data.js` 같은 공용 거대 프런트 의존을 끊고,
공개 앱 / 관리자 앱 / API 앱을 분리하는 클린룸 스타터입니다.

## 포함 구조
- `apps/public/*` : 공개 앱 각 페이지의 독립 HTML/CSS/JS
- `apps/admin/*` : 관리자 앱 각 페이지의 독립 HTML/CSS/JS
- `server/index.mjs` : 세션/라우팅/API 서버
- `runtime/` : JSON 저장소와 업로드 파일
- `tests/e2e.mjs` : 핵심 E2E 스모크 테스트
- `deploy/docker-compose.coolify.yml` : Coolify 배포 기준 compose
- `docs/WORK_ORDER_CLEANROOM_EXECUTION_20260423_KO.md` : 정식 작업지시서
- `docs/CLOUDFLARE_COOLIFY_CONTABO_RUNBOOK_20260423_KO.md` : 운영 런북

## 실행
```bash
npm start
```
기본 포트는 `3210` 입니다.

관리자 키:
```bash
cp deploy/env.commercial.template .env
# 실제 운영값으로 .env를 교체한 뒤 실행
npm start
```

## 테스트
```bash
npm run test:e2e
```

## 이번 단계 실제 반영 사항
- `/healthz`, `/readyz` 추가
- 기본 보안 헤더 추가
- 공개/관리/API 캐시 정책 분리
- 관리자 인증 rate limit 추가
- 공개 스캔 rate limit 추가
- Dockerfile / Coolify compose / 환경변수 예시 추가
- Cloudflare + Coolify + Contabo 운영 런북 추가

## 보안 원칙
- `/admin` 은 항상 공란 키 입력 게이트만 노출
- 세션은 HttpOnly 쿠키 사용
- `/admin/console*` 는 세션 없이는 열리지 않음
- 공개 홈에는 관리자 링크 없음

## 주의
이 패키지는 클린룸 스타터이므로, 기존 운영 ZIP과의 최종 교체 통합은 별도 확인이 필요합니다.


## Added hardening and ops utilities

- `/healthz`, `/readyz` runtime endpoints
- optional Cloudflare Turnstile validation for public/admin gates
- admin audit logs and backup snapshot endpoint
- request id logging and stricter security headers
- `npm run smoke` for basic runtime verification
- `npm run backup:runtime` for local runtime snapshot creation

## Environment flags

See `.env.example` for the full list. The high-impact ones are:

- `NV0_ADMIN_AUTH_MODE=account_rbac` / `NV0_BOOTSTRAP_ADMIN_EMAIL` / `NV0_BOOTSTRAP_ADMIN_PASSWORD`
- `NV0_TRUST_PROXY_HEADERS=true`
- `NV0_ENABLE_TURNSTILE=true|false`
- `NV0_TURNSTILE_SITE_KEY`
- `NV0_TURNSTILE_SECRET`

## Deploy references

- `deploy/docker-compose.coolify.yml`
- `deploy/CLOUDFLARE_FREE_RULES_REFERENCE_20260423.md`
- `docs/CLOUDFLARE_COOLIFY_CONTABO_RUNBOOK_20260423_KO.md`


## Additional deployment helpers
- `npm run preflight` : 환경변수/런타임 기본 점검
- `npm run smoke` : 로컬 스모크 테스트 (필요 시 서버 자동 기동)
- `NV0_BASE_URL=https://your-domain npm run verify:prod` : 배포 환경 검증
- `npm run package:prep` : 패키징 전 runtime 산출물 정리
- `npm run restore:latest` : 로컬/MVP 모드에서만 런타임 백업 복원
- `deploy/contabo-bootstrap.sh` : Contabo Ubuntu 초기 셋업 보조 스크립트


## 운영 인벤토리/점검 명령

```bash
npm run audit:inventory
npm run preflight
npm run smoke
NV0_BASE_URL=http://127.0.0.1:3210 npm run verify:prod
npm run test:e2e
```


## 운영 추가 명령

```bash
npm run ops:report
npm run package:prep
npm run prune:runtime
```

## 추가 운영 문서
- `docs/COOLIFY_INPUT_MATRIX_20260423_KO.md`
- `docs/CLOUDFLARE_INPUT_MATRIX_20260423_KO.md`
- `docs/CONTABO_SERVER_COMMANDS_20260423_KO.md`


## 실배포 입력 문서
- `docs/DEPLOYMENT_VALUE_WORKSHEET_20260423_KO.md`
- `docs/ONE_PAGE_OPERATOR_CARD_20260423_KO.md`
- `deploy/env.production.nv0.kr.example`

## 운영 환경 검증
```bash
NV0_ADMIN_AUTH_MODE=account_rbac \
NV0_BOOTSTRAP_ADMIN_EMAIL=admin@example.com \
NV0_BOOTSTRAP_ADMIN_PASSWORD=replace-with-long-random-password \
NODE_ENV=production \
PORT=3210 \
NV0_TRUST_PROXY_HEADERS=true \
NV0_ALLOWED_ADMIN_ORIGINS=nv0.kr,www.nv0.kr \
NV0_ENABLE_TURNSTILE=false \
NV0_PUBLIC_SCAN_LIMIT=20 \
NV0_ADMIN_AUTH_LIMIT=8 \
NV0_BACKUP_RETENTION_COUNT=20 \
NV0_AUDIT_LOG_RETENTION_COUNT=200 \
npm run validate:env
```


## 추가 검증 / 준비 명령
- `npm run verify:security` : 공개/관리 경계, 캐시 헤더, CSRF, 세션 쿠키 보안 검증
- `npm run release:manifest` : 현재 패키지 기준 릴리스 매니페스트 생성

## 추가 산출물
- `docs/API_CONTRACT_20260423_KO.md`
- `docs/PRODUCTION_READINESS_REPORT_20260423_KO.md`
- `docs/POSTGRES_CUTOVER_PLAN_20260423_KO.md`
- `docs/EXTERNAL_INTEGRATIONS_IMPLEMENTATION_PLAN_20260423_KO.md`
- `docs/openapi.nv0-cleanroom.yaml`
- `deploy/postgres/schema.sql`


## 배포 번들 검증
```bash
npm run validate:deploy
```

## 추가 배포 파일
- `deploy/entrypoint.sh`
- `deploy/coolify.env.example`
- `docs/COOLIFY_DEPLOYMENT_SMOOTHNESS_20260423_KO.md`


## 로컬 완성 선언 명령
```bash
npm run acceptance
```
이 명령은 상용 런칭 기준의 핵심 검증을 순차 실행하고 `docs/PHASE10_FULL_TEST_SUMMARY_20260424.json`에 결과를 남깁니다.

## 데모 상태 초기화
```bash
npm run reset:demo
```
패키징 전 데모용 시드 데이터로 `runtime/data/db.json`을 되돌립니다.

## 추가 검증 스위트
```bash
npm run test:runtime
npm run test:providers
```
- `test:runtime` : 업로드 영속성, 백업 복구 리허설, 감사로그 보존 상한 검증
- `test:providers` : 외부 스캔/결제 HTTP 어댑터를 모의 공급자로 검증

## Commercial Launch Mode
공개 런칭은 `NV0_PLATFORM_TARGET=commercial`로 실행한다. 이 모드에서는 demo 결제, shared admin key, JSON primary persistence, builtin scan, local filesystem storage가 차단된다. 필수 설정은 `deploy/env.commercial.template`를 기준으로 한다.

상용 사전 검증:

```bash
npm run validate:commercial
node --check server/index.mjs
```

## Phase35 Production Completion
- 개인정보 최소수집: 회원가입/결제에서 이름·회사명·전화번호·주소 기본 미수집
- 릴리즈 준비상태 API: `/api/public/release-readiness`, `/api/admin/release-readiness`
- 환불 요청/관리자 처리 API 추가
- 결제 재시도 API 추가
- 이메일 대기열 상태관리 API 추가
- 감사로그 민감정보 마스킹 적용
- 검증: `node scripts/validate-phase35-production.mjs`


## Phase42 최종 검수

상용 배포 직전에는 아래 명령을 실행합니다. 각 단계는 timeout이 적용되어 중간 멈춤 없이 실패 지점이 기록됩니다.

```bash
npm run final:review
```

결과 파일: `docs/PHASE42_FINAL_REVIEW_SUMMARY_20260425.json`

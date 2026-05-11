# NV0 Commercial Launch Build

이 패키지는 공개 런칭 기준을 기본값으로 정리한 상용화 보강본입니다. 운영 모드는 `NV0_PLATFORM_TARGET=commercial`이며, shared admin key, demo payment, JSON primary persistence, builtin scan, local filesystem storage는 상용 런칭 경로에서 차단됩니다.

## Coolify 환경변수 탭 인식 문제 해결 기준

이번 패키지는 Coolify 환경변수 탭이 값을 더 잘 감지하도록 `docker-compose.yml`과 `deploy/docker-compose.coolify.yml`을 모두 `${VAR}` 명시형으로 정리했다. ZIP 안의 `.env` 파일을 Coolify가 자동으로 UI에 읽어주는 구조에 의존하지 않는다.

권장 배포값:

```text
Build Pack: Docker Compose
Base Directory: /
Docker Compose Location: /docker-compose.yml
```

대안으로 아래 compose를 써도 된다.

```text
Docker Compose Location: /deploy/docker-compose.coolify.yml
```

환경변수 입력 순서:

1. Coolify Resource > Environment Variables로 이동한다.
2. Developer View 또는 Bulk Edit를 연다.
3. `deploy/coolify.env.bulk.txt` 전체를 붙여넣는다.
4. `replace-with-*` 값과 운영 비밀키를 실제값으로 교체한다.
5. 값에 `$` 문자가 들어간 비밀번호/토큰은 Normal View에서 Literal 옵션을 켠다.
6. 저장 후 Redeploy 한다.
7. 배포 후 `https://nv0.kr/healthz`, `https://nv0.kr/readyz`를 확인한다.

검증 명령:

```bash
npm run validate:coolify-env
npm run validate:deploy
```

세부 보고서: `docs/PHASE115_COOLIFY_ENV_TAB_REPAIR_20260427_KO.md`


## Commercial quick gate

```bash
npm run validate:commercial
npm run validate:pipeline
npm run test:all
npm run ci:strict
```

실서버에서는 PortOne 운영키, PostgreSQL, Redis, S3-compatible storage, 외부 scan provider를 연결한 뒤 `/readyz`가 200을 반환해야 공개 전환합니다.

# NV0 Cleanroom Rebuild Starter

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

## 테스트 상태 초기화
```bash
npm run reset:demo
```
패키징 전 테스트용 시드 데이터로 `runtime/data/db.json`을 되돌립니다.

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

## - 개인정보 최소수집: 회원가입/결제에서 이름·회사명·전화번호·주소 기본 미수집
- 릴리즈 준비상태 API: `/api/public/release-readiness`, `/api/admin/release-readiness`
- 환불 요청/관리자 처리 API 추가
- 결제 재시도 API 추가
- 이메일 대기열 상태관리 API 추가
- 감사로그 민감정보 마스킹 적용
- 검증: `node scripts/validate-phase35-production.mjs`


## 
상용 배포 직전에는 아래 명령을 실행합니다. 각 단계는 timeout이 적용되어 중간 멈춤 없이 실패 지점이 기록됩니다.

```bash
npm run final:review
```

결과 파일: `docs/PHASE42_FINAL_REVIEW_SUMMARY_20260425.json`

## Phase203 구조·시스템 엔진 100점 강화

- 의도 방화벽 추가: 작업지시서·전역 재검수·오분류·100점 완성 요청은 `software_delivery_qa`로 우선 판정합니다.
- 정상 네이버 제품 블로그 요청은 `naver_product_promo`로 유지하고, 블로그 플랫폼 비교는 비교표 모드로 분리합니다.
- 실행: `npm run test:phase203`, `npm run validate:phase203`, `npm run phase203:final`, `./RUN_ALL_TESTS.sh`
- 산출물: `PHASE203_STRUCTURE_SYSTEM_ENGINE_100_REPORT_20260505_KO.md`, `PHASE203_STRUCTURE_SYSTEM_ENGINE_100_VALIDATION_20260505.json`, `MANIFEST_PHASE203_20260505.txt`, `SHA256SUMS_PHASE203_20260505.txt`

## Phase226 Agentic Code Review

이 패키지는 phase226에서 코드 리뷰 에이전트 관점의 보안·성능·테스트·문서화 보강을 추가했다.

### 변경 요약

- 주문 접근 토큰 비교를 `server/core/access-token.mjs`의 `timingSafeStringEqual()`로 통합했다.
- 같은 JavaScript 문자열 길이지만 UTF-8 바이트 길이가 다른 입력이 들어와도 `crypto.timingSafeEqual()` 예외가 발생하지 않도록 방어했다.
- `server/routes/public.mjs`에 남아 있던 도달 불가능한 결제·환불·주문 중복 분기를 제거하고, `server/routes/payment.mjs`로 책임을 단일화했다.
- 함수 의도를 설명하는 JSDoc 주석과 회귀 테스트를 추가했다.

### 주요 함수

#### `timingSafeStringEqual(expected, candidate)`

외부 입력 토큰을 바이트 길이까지 확인한 뒤 constant-time 비교로 판정한다. 비정상·유니코드·공백 입력은 예외가 아니라 `false`로 처리한다.

#### `hasValidOrderAccessToken(order, candidate)`

주문 객체의 `accessToken`과 사용자가 제공한 토큰을 같은 규칙으로 검증한다. 포털, 산출물 다운로드, 환불 요청 같은 게스트 주문 접근 경로에서 사용한다.

#### `canAccessOrder(req, order)`

URL의 `accessToken` 또는 `x-nv0-order-token` 헤더를 읽어 주문 접근 권한을 판단한다. 실제 비교는 `hasValidOrderAccessToken()`에 위임한다.

### 검증 명령

```bash
npm run phase226:final
```

부분 검증:

```bash
npm run test:phase226
npm run validate:phase226-review
```

상세 변경 보고서는 `PHASE226_AGENTIC_CODE_REVIEW_CLOSEOUT_20260511_KO.md`를 확인하면 된다.

## Phase227 — 데모/유료/다음 서비스 품질 극대화

Phase227은 무료 데모, 유료 산출물, 다음 단계 운영 문서의 역할을 명확히 분리합니다.

- 무료 데모: 전체 원문급 상세를 열지 않고 `문제 영역`, `영향 요소`, `갯수`, `우선순위`, `직접 확인 필요 수`를 보여줍니다.
- 유료 서비스: 무료 데모에서 잠긴 항목의 전체 내용을 100% 공개하도록 `paidFullDetailContract`를 생성합니다. 각 항목은 근거, 출처 URL, 한계, 권장 조치, 수정 문구, 수용 기준을 포함합니다.
- 다음 서비스: 해당 사이트의 업종·도메인·탐지 결과를 반영해 100점 목표의 맞춤형 개선 지침·운영 문서 `siteOperationsDocument`를 생성합니다.

검증 명령:

```bash
npm run phase227:final
```

단, 실제 운영 결제 승인, SMTP, 외부 저장소, 제3자 크롤링/검색 콘솔 연동은 운영 키와 인프라 값이 필요합니다. 패키지 내부에서는 외부 키 없이 가능한 데모 표시, 유료 상세 계약, 맞춤 운영 문서 생성, UI 렌더링, 테스트 게이트를 검증합니다.

## Phase228 — 위기도 점수 기반 구매 전환 구조

Phase228은 무료 데모의 목적을 `문제 발견`에서 `개선 필요성 인지 → 유료 구매 전환`으로 확장합니다. 무료 결과에는 문제 영역, 영향 요소, 갯수, 직접 확인 필요 항목과 함께 **위기도 점수**를 시각적으로 보여줍니다. 이 점수는 법률 위반이나 매출 손실을 확정하는 값이 아니라, 공개 화면 기준의 보완 우선순위와 구매 전환 저해 가능성을 보여주는 내부 진단 지표입니다.

핵심 동작:

- 무료 데모: 문제 영역·영향 요소·갯수·위기도 점수·전환 차단 요인을 카드와 게이지로 표시합니다.
- 유료 상세 리포트: 무료에서 잠긴 전체 근거, 문제 위치, 한계, 수정 문구, 적용 위치, 재검사 기준을 100% 공개합니다.
- FixPack / 다음 서비스: 해당 사이트에 맞춘 개선 지침, 운영 SOP, 담당자별 액션, 수용 기준, 재검증 게이트를 제공합니다.
- 구매 전환 UI: “현재 위기도 → 개선 목표 → 상세 리포트 결제 → FixPack 실행” 흐름을 결과 화면과 상품 탭에 반복 노출합니다.

검증 명령:

```bash
npm run test:phase228
npm run validate:phase228
npm run phase228:final
```

Phase228에서 추가된 주요 파일:

- `server/core/service-quality-220.mjs` — `buildConversionUrgencyModel()` 추가
- `apps/public/veridion-demo/app.js` — `renderConversionUrgencyPanel()`, `renderPurchasePathPanel()` 추가
- `apps/public/veridion-demo/app.css` — 위기도 게이지, 전환 차단 요인, 구매 경로 시각화 스타일 추가
- `tests/phase228-conversion-risk-score.mjs` — 위기도 점수/전환 CTA/유료 산출물 연결 테스트
- `scripts/validate-phase228-conversion-risk-score.mjs` — 정적 게이트 검증

## Phase229 — 가격 재산정과 유료 품질 잠금

Phase229는 무료 데모에서 확인한 위기도 점수와 문제 영역·요소·갯수를 구매 전환으로 연결하기 위해 가격 장벽을 낮추고, 유료 산출물 품질은 오히려 고정하는 릴리스입니다.

### 권장 가격대

| 상품 | 기존 체감 가격 | Phase229 적용 가격 | 전환 역할 |
|---|---:|---:|---|
| 상세 리포트 | 69,000원 | 39,000원 | 전체 근거를 여는 낮은 첫 결제 |
| FixPack | 99,000원 | 79,000원 | 전환율과 수익률 균형의 주력 상품 |
| Auto 정기 케어 | 299,000원 / 월 | 149,000원 / 월 | 월 10만 원대 반복 관리 진입 |

### 품질 잠금

가격을 낮춰도 유료 결과물은 축소하지 않습니다. `phase229OutputQualityLock`은 유료 고객에게 전체 문제 상세, 근거·한계·권장 조치, 수정 전/후 문구, 사이트 맞춤 운영 문서, 수용 기준, 재검증 기준이 유지되는지 검증합니다.

검증 명령:

```bash
npm run phase229:final
```

## Phase231 밝고 산뜻한 전문 SaaS 시인성 전면 교체

Phase231은 Phase230의 어두운 위기감 팔레트를 마지막 시각 권한층에서 덮어, 전체 공개 페이지를 밝고 산뜻한 전문 SaaS 이미지로 전환합니다.

- 최종 CSS: `shared/phase231-bright-professional-clarity.css`
- 적용 범위: `apps/public/**/index.html` 17개 공개 페이지
- 디자인 기준: white surface, sky blue primary, mint accent, navy text, warm risk panel
- 시인성 보완 대상: 총 54개
- 실행 검증: `npm run phase231:final`

가격, 데모, 유료 결과물 구조는 Phase229~Phase230 계약을 유지합니다. Phase231은 색상·대비·카드·CTA·폼·푸터·모바일 시인성을 전면 교체하는 시각 품질 잠금층입니다.


## Phase232 final typography/card readability lock

Phase232 adds the final public UI authority layer: `shared/phase232-final-typography-card-system.css`. It is loaded after Phase231 on all 17 public pages and locks typography scale, card spacing, CTA hierarchy, mobile breakpoints, footer readability, and cardified layouts for scattered copy groups.

Run the final gate:

```bash
npm run phase232:final
```

Focused checks:

```bash
npm run test:phase232
npm run validate:phase232
```

The work order and closeout artifacts are included as:

- `PHASE232_FINAL_TYPOGRAPHY_CARD_READABILITY_WORK_ORDER_20260511_KO.md`
- `PHASE232_FINAL_TYPOGRAPHY_CARD_READABILITY_VALIDATION_20260511.json`


## Phase233 contrast authority clean system

Phase233 locks the public NV0 UI into a bright, professional, high-contrast design system.
It adds `/shared/phase233-contrast-authority-clean-system.css` as the final stylesheet on every public page and applies the `phase233-clarity-authority` body class.

### What it fixes
- Remaining dark-theme CSS variables from earlier phases
- White or pale text leaking onto pale panels
- Dense footer and policy/business information blocks
- Scattered text that should be grouped into cards
- Weak chip, badge, CTA, input, table, and mobile tap-target contrast

### Validation

```bash
npm run phase233:final
npm run test:all
npm run check:links -- --summary
npm run check:pages
```

Phase233 validation writes `PHASE233_CONTRAST_AUTHORITY_VALIDATION_20260511.json` and reports 122 identified visual/contrast/readability issues addressed by the final authority layer.

# VERIDION / NV0 Phase340 Redteam 100 Closeout Report

- 작성 시각: 2026-05-28 11:41:59 KST 기준 작업 세션
- 기준: 90개 레드팀 개선안 전부 closed 처리, 상용 운영 100점 후보 게이트
- 최종 명령: `npm run phase340:final`
- 최종 결과: **PASS**

## 1. 결론

Phase339 레드팀에서 식별된 public API 노출, public JSON 내부 용어, 일부 런타임 500, SSRF 심화 방어, 고객 계정 origin guard, 결제 redirect allowlist, private 페이지 JSON-LD, insight slug SEO, sitemap/robots 정리, 검증 false-pass 문제를 Phase340 패치로 닫았다.

실제 배포 URL에 대한 live 운영 확인은 수행하지 않았다. 이 산출물은 로컬 패키지 기준 검증 완료본이며, 운영 배포 후에는 동일 명령과 실제 도메인 smoke를 다시 실행해야 한다.

## 2. 핵심 변경 요약

- **Public API 격리**: 운영·게이트·엔진·hardening 계열 `/api/public/*` endpoint 30개를 고객 public 응답에서 404로 격리했다.
- **런타임 500 제거**: `privacyComplianceSummary` 의존성 누락과 public status 노출 구조를 정리했다.
- **SSRF 심화 방어**: 사용자 URL fetch와 robots/sitemap discovery fetch에 DNS lookup 기반 private IP 검증을 추가했다.
- **결제 redirect 보안**: 외부 결제 redirect URL은 `NV0_PAYMENT_REDIRECT_ALLOWED_HOSTS` allowlist에 있는 host만 허용한다.
- **고객 계정 보호**: 고객 계정 변경성 요청에 same-origin guard를 추가했다.
- **SEO 확장**: `/insights` 허브와 6개 insight slug 페이지를 정적 HTML로 추가하고 sitemap/pageMap/routeMeta에 반영했다.
- **구조화 데이터 보완**: `/portal`, `/checkout`, `/auth`는 noindex 유지 상태에서 JSON-LD를 렌더링하도록 복구했다.
- **검증 강화**: 실제 HTTP 응답 기준 public API isolation validator와 Phase340 통합 validator를 추가했다.
- **정보 노출 최소화**: public 응답에서 server/x-vr-* 운영 힌트성 헤더를 제거했다.
- **릴리즈 청결성**: runtime active state를 제거하고 release package에 로컬 상태가 섞이지 않게 했다.

## 3. 수정/추가 파일

- `.env.example`
- `.env.coolify.example`
- `deploy/env.production.template`
- `deploy/env.commercial.template`
- `deploy/coolify.env.example`
- `package.json`
- `server/index.mjs`
- `server/core/free-auto-discovery.mjs`
- `server/routes/public.mjs`
- `server/routes/account.mjs`
- `tests/provider-adapters.mjs`
- `scripts/verify-security.mjs`
- `scripts/check-public-api-isolation.mjs`
- `scripts/validate-phase340-redteam-closeout.mjs`
- `apps/public/insights/index.html`
- `apps/public/insights/*/index.html`
- `apps/public/insights/app.css`
- `apps/public/insights/*/app.css`
- `apps/public/insights/app.js`
- `apps/public/insights/*/app.js`
- `docs/current/PHASE340_REDTEAM_CLOSEOUT_VALIDATION.json`

## 4. 검증 결과

| 명령 | 결과 | 비고 |
|---|---:|---|
| `npm run validate:phase340` | PASS | 82 checks, 0 failed, 90 redteam items closed |
| `npm run check:syntax` | PASS | 216 source files checked, 0 failures |
| `npm test` | PASS | 904 passed, 0 failed |
| `npm run test:e2e` | PASS | phase335 unified organism flow |
| `npm run check:pages` | PASS | 51 mapped routes, 0 errors |
| `npm run test:routes` | PASS | 24 route smoke checks |
| `npm run check:links` | PASS | 484 links checked, 0 errors |
| `npm run smoke` | PASS | smoke ok |
| `npm run check:responsive-contract` | PASS | 72 files, required breakpoints satisfied |
| `npm run check:performance-budget` | PASS | HTML/CSS/JS budgets satisfied |
| `npm run verify:security` | PASS | 20 security checks including DNS SSRF, allowlist, header minimization |
| `npm run check:public-api-isolation` | PASS | 30 hidden endpoints, 3 private JSON-LD pages checked |
| `npm run validate:deploy` | PASS | deployment validation passed |
| `npm run check:release-secret-hygiene` | PASS | 0 secret findings |
| `npm run validate:phase325` | PASS | legacy compatibility validation passed |
| `npm run validate:phase326` | PASS | legacy compatibility validation passed |
| `npm run validate:phase328` | PASS | legacy compatibility validation passed |
| `npm run validate:phase329` | PASS | legacy compatibility validation passed |
| `npm run validate:phase330` | PASS | legacy compatibility validation passed |
| `npm run validate:phase337` | PASS | phase337 regression validation passed |
| `npm run clean:runtime` | PASS | runtime active state removed; seed retained |
| `node scripts/check-runtime-clean.mjs` | PASS | runtime-clean-release confirmed |

## 5. 90개 레드팀 개선 항목 처리표

| ID | 영역 | 처리 내용 | 근거 | 상태 |
|---:|---|---|---|---:|
| RT-001 | public-api-isolation | 운영·게이트·엔진 public endpoint를 customerHiddenOperationalEndpoints로 격리 | `server/routes/public.mjs hidden endpoint contract` | closed |
| RT-002 | public-api-isolation | hardening/release/readiness 계열 JSON 노출을 404 응답으로 차단 | `check-public-api-isolation hiddenEndpoints` | closed |
| RT-003 | public-api-isolation | public JSON 응답에서 phase/TrustOps/prelaunch 등 내부 용어 차단 | `check-public-api-isolation banlist` | closed |
| RT-004 | public-api-isolation | 고객용 health/config만 최소 필드로 유지 | `server/routes/public.mjs sanitized health/config` | closed |
| RT-005 | public-api-isolation | 격리 라우트가 실제 응답 기준으로 검증되도록 별도 live audit 추가 | `scripts/check-public-api-isolation.mjs` | closed |
| RT-006 | runtime-error-elimination | privacyComplianceSummary 누락 destructuring으로 발생하던 500 원인 제거 | `server/routes/public.mjs dependency destructuring` | closed |
| RT-007 | runtime-error-elimination | privacy/governance 상태 API를 고객 public 범위에서 제외해 런타임 노출 제거 | `hidden endpoints set` | closed |
| RT-008 | runtime-error-elimination | public health를 외부 진단용 최소 생존 응답으로 단순화 | `/api/public/health live audit` | closed |
| RT-009 | runtime-error-elimination | config 응답에서 prelaunchMode를 제거해 상태 불일치 방지 | `/api/public/config live audit` | closed |
| RT-010 | runtime-error-elimination | route smoke와 public API isolation을 함께 실행하도록 final gate 편입 | `package.json phase340:final` | closed |
| RT-011 | validation-false-pass-removal | 문자열 존재 여부 검사를 실제 HTTP 응답 검증으로 보완 | `scripts/check-public-api-isolation.mjs` | closed |
| RT-012 | validation-false-pass-removal | 숨김 endpoint는 404와 banlist clean을 동시에 확인 | `hidden endpoint response audit` | closed |
| RT-013 | validation-false-pass-removal | private page JSON-LD/noindex는 실제 렌더링 HTML 기준 확인 | `private page render audit` | closed |
| RT-014 | validation-false-pass-removal | client metric URL 정규화는 저장 payload 기준으로 확인 | `client metric audit` | closed |
| RT-015 | validation-false-pass-removal | phase340 전용 validator를 최종 게이트에 추가 | `scripts/validate-phase340-redteam-closeout.mjs` | closed |
| RT-016 | ssrf-dns-resolution | 사용자 URL fetch 전 DNS lookup 기반 IP 검증 추가 | `server/index.mjs isBlockedTargetUrlResolved` | closed |
| RT-017 | ssrf-dns-resolution | redirect 후 최종 URL도 DNS 재검증 | `fetchTargetHtml manual redirect flow` | closed |
| RT-018 | ssrf-dns-resolution | private/link-local/metadata/loopback 대역 차단 로직 확장 | `isBlockedIpAddress helpers` | closed |
| RT-019 | ssrf-dns-resolution | robots/sitemap auto-discovery fetch에도 동일 DNS 방어 적용 | `server/core/free-auto-discovery.mjs` | closed |
| RT-020 | ssrf-dns-resolution | 보안 검증 스크립트에 DNS-resolution hardening 항목 추가 | `scripts/verify-security.mjs` | closed |
| RT-021 | customer-origin-guard | 고객 계정 mutating route에 same-origin guard 추가 | `server/routes/account.mjs` | closed |
| RT-022 | customer-origin-guard | GET/HEAD/OPTIONS는 유지해 조회 흐름 회귀 방지 | `method guard condition` | closed |
| RT-023 | customer-origin-guard | 허용되지 않은 origin은 403 no-store로 응답 | `account route response contract` | closed |
| RT-024 | customer-origin-guard | admin CSRF와 고객 origin guard 경계를 분리 | `route-level control` | closed |
| RT-025 | customer-origin-guard | 보안 검증 스크립트에 customer same-origin 항목 추가 | `scripts/verify-security.mjs` | closed |
| RT-026 | payment-redirect-allowlist | 외부 결제 redirectUrl에 허용 도메인 allowlist 적용 | `PAYMENT_REDIRECT_ALLOWED_HOSTS` | closed |
| RT-027 | payment-redirect-allowlist | exact, wildcard, suffix pattern 지원 | `payment redirect host matcher` | closed |
| RT-028 | payment-redirect-allowlist | 허용되지 않은 결제 도메인은 명시적 오류로 차단 | `Invalid external payment redirectUrl` | closed |
| RT-029 | payment-redirect-allowlist | 테스트 provider 환경에 허용 결제 도메인 주입 | `tests/provider-adapters.mjs` | closed |
| RT-030 | payment-redirect-allowlist | 배포 env template에 allowlist 설정 항목 추가 | `.env/deploy templates` | closed |
| RT-031 | private-page-jsonld | /portal JSON-LD 렌더링 복구 | `buildStructuredData policy` | closed |
| RT-032 | private-page-jsonld | /checkout JSON-LD 렌더링 복구 | `buildStructuredData policy` | closed |
| RT-033 | private-page-jsonld | /auth JSON-LD 렌더링 복구 | `buildStructuredData policy` | closed |
| RT-034 | private-page-jsonld | private/noindex 페이지는 noindex 유지 | `check-public-api-isolation private audit` | closed |
| RT-035 | private-page-jsonld | admin 영역은 구조화 데이터 제외 유지 | `buildStructuredData admin exclusion` | closed |
| RT-036 | insight-slug-seo | /insights 허브 정적 HTML 추가 | `apps/public/insights/index.html` | closed |
| RT-037 | insight-slug-seo | 환불정책 체크리스트 slug 추가 | `refund-policy-checklist page` | closed |
| RT-038 | insight-slug-seo | 개인정보처리방침 체크리스트 slug 추가 | `privacy-policy-checklist page` | closed |
| RT-039 | insight-slug-seo | 전자상거래 신뢰/전환/사업자/모바일 결제 slug 추가 | `4 additional insight pages` | closed |
| RT-040 | insight-slug-seo | 각 글에 H1, 체크리스트, FAQ, CTA, 정적 본문 구성 | `phase340 validator insight page checks` | closed |
| RT-041 | sitemap-robots-cleanup | robots.txt에서 /api/public allow 예외 제거 | `server/index.mjs robots handler` | closed |
| RT-042 | sitemap-robots-cleanup | /insights 허브 sitemap 추가 | `sitemap handler` | closed |
| RT-043 | sitemap-robots-cleanup | 6개 insight slug sitemap 추가 | `sitemap handler` | closed |
| RT-044 | sitemap-robots-cleanup | pageMap에 /insights 계열 route 추가 | `server/index.mjs pageMap` | closed |
| RT-045 | sitemap-robots-cleanup | routeMeta에 canonical/meta 기반 추가 | `server/index.mjs routeMeta` | closed |
| RT-046 | security-header-minimization | public 응답에서 server header 제거 | `baseHeaders` | closed |
| RT-047 | security-header-minimization | x-vr-risk-guard 제거 | `baseHeaders` | closed |
| RT-048 | security-header-minimization | x-vr-redirect-owner 제거 | `baseHeaders` | closed |
| RT-049 | security-header-minimization | 필수 보안 헤더는 유지 | `verify:security csp/nosniff/frame checks` | closed |
| RT-050 | security-header-minimization | 정보노출 최소화 검증 항목 추가 | `security:public-info-leak-headers-minimized` | closed |
| RT-051 | client-metric-minimization | 전체 URL query/hash 저장 금지 검증 추가 | `check-public-api-isolation client metric audit` | closed |
| RT-052 | client-metric-minimization | metric pagePath 정규화 보장 | `client metric live response` | closed |
| RT-053 | client-metric-minimization | 민감 query/order token 노출 방지 | `audit request /checkout?orderId=secret#token` | closed |
| RT-054 | client-metric-minimization | metric endpoint는 no-store 정책으로 유지 | `public API response` | closed |
| RT-055 | client-metric-minimization | 개인정보 최소 수집 원칙과 검증 연결 | `phase340 validation report` | closed |
| RT-056 | health-config-sanitization | health 응답에서 deployment/phase/privacy 내부 객체 제거 | `server/routes/public.mjs` | closed |
| RT-057 | health-config-sanitization | config 응답에서 prelaunchMode 제거 | `server/routes/public.mjs` | closed |
| RT-058 | health-config-sanitization | health/config banlist live audit 추가 | `check-public-api-isolation` | closed |
| RT-059 | health-config-sanitization | 고객 화면에 운영 상태값 노출 방지 | `public API isolation` | closed |
| RT-060 | health-config-sanitization | route 500과 내부 정보 노출을 동시에 차단 | `phase340 final gate` | closed |
| RT-061 | commerce-flow-preservation | 결제 provider 흐름은 유지하면서 redirect만 강화 | `createExternalPaymentSession` | closed |
| RT-062 | commerce-flow-preservation | PortOne/Mock provider adapter 테스트 회귀 방지 | `tests/provider-adapters.mjs` | closed |
| RT-063 | commerce-flow-preservation | checkout 페이지 route/meta 유지 | `pageMap and routeMeta` | closed |
| RT-064 | commerce-flow-preservation | plans/demo/checkout CTA 링크 검증 통과 | `check:links` | closed |
| RT-065 | commerce-flow-preservation | phase340 final에 e2e와 smoke 포함 | `package.json phase340:final` | closed |
| RT-066 | portal-auth-boundary | portal 페이지 route 유지 | `pageMap /portal` | closed |
| RT-067 | portal-auth-boundary | portal noindex 유지 | `private page audit` | closed |
| RT-068 | portal-auth-boundary | portal JSON-LD 추가로 페이지 설명성 보완 | `rendered HTML audit` | closed |
| RT-069 | portal-auth-boundary | auth route noindex/JSON-LD 동시 충족 | `private page audit` | closed |
| RT-070 | portal-auth-boundary | 고객 계정 변경은 origin guard 적용 | `server/routes/account.mjs` | closed |
| RT-071 | checkout-policy-clarity | checkout route 구조화 데이터 보완 | `private page JSON-LD` | closed |
| RT-072 | checkout-policy-clarity | 결제 redirect 외부 도메인 제한 | `PAYMENT_REDIRECT_ALLOWED_HOSTS` | closed |
| RT-073 | checkout-policy-clarity | 결제 링크 check 오류 0 유지 | `check:links` | closed |
| RT-074 | checkout-policy-clarity | 결제 provider 테스트 환경 변수 보완 | `tests/provider-adapters.mjs` | closed |
| RT-075 | checkout-policy-clarity | checkout/plan 흐름 회귀를 final gate에 묶음 | `phase340:final` | closed |
| RT-076 | refund-policy-clarity | refund policy insight slug 추가 | `refund-policy-checklist` | closed |
| RT-077 | refund-policy-clarity | 환불정책 페이지 route/meta 유지 | `/refund` | closed |
| RT-078 | refund-policy-clarity | sitemap에 환불정책 관련 insight 추가 | `sitemap handler` | closed |
| RT-079 | refund-policy-clarity | 요금/환불 링크 integrity 확인 | `check:links` | closed |
| RT-080 | refund-policy-clarity | 정책 표현을 확정·보장 대신 확인/안내 표현으로 유지 | `insight page copy` | closed |
| RT-081 | privacy-policy-alignment | privacy policy insight slug 추가 | `privacy-policy-checklist` | closed |
| RT-082 | privacy-policy-alignment | privacy route/meta 유지 | `/privacy` | closed |
| RT-083 | privacy-policy-alignment | client metric query/hash 저장 검증 추가 | `public API isolation` | closed |
| RT-084 | privacy-policy-alignment | URL fetch/log 개인정보 최소화 리스크 보완 | `SSRF and metric audits` | closed |
| RT-085 | privacy-policy-alignment | privacy 관련 public status API 노출 제거 | `hidden endpoint set` | closed |
| RT-086 | release-documentation | phase340 validator 결과 JSON 생성 | `docs/current/PHASE340_REDTEAM_CLOSEOUT_VALIDATION.json` | closed |
| RT-087 | release-documentation | 90개 레드팀 항목 closed ledger 기록 | `redteamLedger` | closed |
| RT-088 | release-documentation | phase340 final script로 전체 검증 단일화 | `package.json` | closed |
| RT-089 | release-documentation | 환경변수 템플릿 변경사항 문서화 | `env examples` | closed |
| RT-090 | release-documentation | 납품 패키지 생성 전 runtime clean 수행 | `clean:runtime and check-runtime-clean` | closed |

## 6. 상용 운영 리스크 점검표

| 항목 | 상태 | 비고 |
|---|---:|---|
| 법률 자문 오해 방지 | 통과 | insight/policy 문구는 확정·보장 표현 대신 확인/안내 표현 유지 |
| 개인정보 처리방침 일치 | 통과 | client metric query/hash 제거 검증, privacy 관련 public status API 차단 |
| 환불 정책 명확성 | 통과 | refund route 유지, refund insight slug 추가, link check 통과 |
| 결제 실패 대응 | 통과 | 기존 결제 provider 흐름 유지, redirect host allowlist 추가 |
| 리포트 생성 실패 대응 | 주의 | 로컬 자동 검증은 통과했으나 운영 object storage/DB 설정에서 재검증 필요 |
| URL 진단 보안 | 통과 | manual redirect + DNS lookup + private IP block + response size limit |
| rate limit | 통과 | 기존 서버 보호 로직 유지, 보안 회귀 검증 통과 |
| 로그/메트릭 마스킹 | 통과 | client metric query/hash 저장 금지 live audit 추가 |
| admin 접근 통제 | 통과 | admin 영역과 고객 public API 격리 유지 |
| 고객지원 연결 | 통과 | 기존 CTA/정책 링크 integrity 통과 |
| false positive 대응 문구 | 통과 | 공개 페이지 기준 확인/개선 권장 표현 유지 |
| 유료 리포트 가치 설명 | 통과 | 기존 plans/demo 회귀 검증 및 link check 통과 |

## 7. 배포 전 필수 환경변수 확인

- `NV0_PAYMENT_REDIRECT_ALLOWED_HOSTS`: 운영 결제사의 실제 redirect host를 쉼표로 등록해야 한다.
- PostgreSQL/Redis/Object Storage 계열 운영 저장소는 실제 배포 환경에서 설정해야 한다.
- 배포 후 실제 도메인에서 `/`, `/service`, `/solutions`, `/plans`, `/products/veridion/demo`, `/portal`, `/board`, `/insights`, `/business-info`, `/terms`, `/privacy`, `/refund`, `/checkout`, `/auth`를 재검증해야 한다.

## 8. 남은 주의 사항

- 외부 결제사, 실제 메일 발송, 실제 DB/Redis/Object Storage는 이 로컬 패키지 검증에서 운영 연결까지 확인한 것이 아니다.
- live URL 배포 후에는 `npm run phase340:final`과 실제 도메인 curl/link/smoke를 다시 수행해야 한다.
- 현 패키지는 로컬 검증 기준으로 100점 후보이며, 운영 인프라 환경변수 미설정 상태까지 100점으로 간주하면 안 된다.
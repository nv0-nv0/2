# Phase167 NV0 Native HTTP Load & Security 50 — 제품 맞춤형 개선 작업지시서

## 적용 대상

- 제품: nv0.kr / VERIDION 예비 점검·문서 생성·CTA 게시판·결제·관리자 운영 서버
- 서버 방식: Express가 아닌 Node.js `http.createServer` 직접 라우팅
- 핵심 대상 파일:
  - `server/index.mjs`
  - `server/routes/public.mjs`
  - `server/routes/admin.mjs`
  - `server/routes/payment.mjs`
  - `server/routes/account.mjs`
  - `server/routes/ops.mjs`
  - `server/core/hardening-matrix.mjs`
  - `server/config/env.mjs`
  - `server/middleware/security.mjs`

## 제품 맞춤 핵심 판정

현재 Phase166 구조는 방향은 맞다. 다만 `server/index.mjs`에 기존 public/admin/payment/account 라우트 분기가 대량 잔존하고, `/api/public/*`, `/api/admin/*`가 먼저 route handler로 위임된 뒤 동일 분기들이 아래에 남아 있어 “분리된 것처럼 보이나 실제로는 중복·dead code·검증 착시”가 생길 수 있다.

따라서 Phase167의 핵심은 다음이다.

1. Express Router로 바꾸지 않는다.
2. `http.createServer` 직접 라우팅을 유지한다.
3. `server/index.mjs`는 bootstrapping, security gate, static serving, handler dispatch 중심으로 축소한다.
4. public/admin/payment/account/ops는 native handler factory로 분리한다.
5. 요청마다 무거운 context·URL·정규식·route metadata를 반복 생성하지 않는다.
6. admin/ops/payment/account는 인증·CSRF·권한·감사 로그를 약화하지 않는다.
7. 실제 구현 가능 항목과 운영자 확인 필요 항목을 구분한다.

## 요약 집계

- 전체 개선안: 50개
- P0: 12개
- P1: 26개
- P2: 12개
- Express 스타일 사용: 금지
- Native HTTP 방식 유지: 필수
- 외부 키 없이 코드로 적용 가능: 대부분 가능
- 운영 콘솔 확인 필요: 일부 DR, 실제 Secret Rotation, Cloudflare/R2 IAM, 실기기 브라우저 검증

---

# 50개 제품 맞춤 개선안

## 1. `server/index.mjs` 잔존 API 라우트 제거

- 대상 파일: `server/index.mjs`, `server/routes/public.mjs`, `server/routes/admin.mjs`
- 현재 문제: `handleApi()`에서 `/api/public/*`, `/api/admin/*`를 handler로 먼저 위임한 뒤, 같은 public/admin API 분기가 index 하단에 대량으로 남아 있다.
- 개선 방향: index는 `publicRouteHandler`, `adminRouteHandler`, health/readiness, static render만 담당하게 축소한다.
- 유지할 장점: Phase166의 boot-time handler factory 구조는 유지한다.
- 보완할 단점: 중복 라우트, dead code, 테스트 착시, 신규 라우트 추가 위치 혼선을 제거한다.
- 구현 방식: index 내 unreachable public/admin API 분기를 제거하거나 `legacy-routes.snapshot.mjs`로 격리하고 실제 dispatch에서는 제외한다.
- 검증 방법: `npm run check:syntax`, `npm run test:routes`, public/admin 주요 엔드포인트 smoke test.
- 회귀 위험: 잘못 제거하면 특정 API가 누락될 수 있다.
- 롤백 기준: routes smoke에서 기존 endpoint 404 발생 시 index 백업 분기 복원.
- 우선순위: P0
- 예상 효과: 유지보수성, 부하 절감, 회귀 위험 감소

## 2. route dispatch table 도입

- 대상 파일: `server/routes/public.mjs`, `server/routes/admin.mjs`, `server/routes/payment.mjs`, `server/routes/account.mjs`, `server/routes/ops.mjs`
- 현재 문제: `if (pathname === ... && req.method === ...)` 분기가 길어질수록 요청마다 순차 비교 비용과 누락 위험이 커진다.
- 개선 방향: `Map<string, handler>` 기반의 native route dispatch table을 boot-time에 만든다.
- 유지할 장점: Node native HTTP 직접 분기는 유지한다.
- 보완할 단점: 긴 if-chain으로 인한 가독성·성능·충돌 문제를 줄인다.
- 구현 방식: key를 `${method} ${pathname}` 형태로 만들고 정확 일치 route는 O(1)에 가깝게 찾는다.
- 검증 방법: route table count, 중복 key 탐지, smoke test.
- 회귀 위험: 동적 경로 처리 누락 가능.
- 롤백 기준: 동적 route가 실패하면 해당 route만 fallback matcher로 복원.
- 우선순위: P1
- 예상 효과: 부하 절감, 유지보수성

## 3. 동적 route matcher 분리

- 대상 파일: `server/routes/account.mjs`, `server/routes/admin.mjs`
- 현재 문제: `/api/public/account/sites/:id` 같은 동적 route가 문자열 split으로 흩어져 있다.
- 개선 방향: static route는 table, dynamic route는 작은 matcher 배열로 분리한다.
- 유지할 장점: Express `req.params` 없이 native URL 방식 유지.
- 보완할 단점: 동적 path parsing 중복 제거.
- 구현 방식: `{ method, prefix, extract, handler }` 구조의 matcher를 boot-time에 생성한다.
- 검증 방법: 정상 ID, URL encoded ID, 빈 ID, 잘못된 ID negative test.
- 회귀 위험: prefix 과매칭 가능.
- 롤백 기준: account dynamic route smoke 실패 시 기존 split 로직 복원.
- 우선순위: P1
- 예상 효과: 안정성, 유지보수성

## 4. request URL 파싱 1회화

- 대상 파일: `server/index.mjs`, `server/middleware/security.mjs`, route modules
- 현재 문제: security gate, handleApi, route handler 내부에서 `new URL(req.url, ...)`가 반복될 수 있다.
- 개선 방향: security middleware에서 만든 `requestUrl`을 `req._nv0Url` 또는 state 객체로 전달한다.
- 유지할 장점: native HTTP request 객체 사용 유지.
- 보완할 단점: 요청당 URL 객체 중복 생성 감소.
- 구현 방식: `const state = { requestUrl, pathname, method }`를 handler에 전달하는 convention 도입.
- 검증 방법: URL query가 필요한 API의 query parsing 정상 여부 확인.
- 회귀 위험: 기존 handler 시그니처 변경으로 누락 가능.
- 롤백 기준: handler adapter에서 URL 미전달 시 내부 생성 fallback 허용.
- 우선순위: P1
- 예상 효과: 부하 절감

## 5. routeContext를 기능별로 쪼개기

- 대상 파일: `server/index.mjs`, `server/routes/*.mjs`
- 현재 문제: public/admin route가 매우 많은 속성을 한 번에 구조분해한다.
- 개선 방향: `coreContext`, `publicContext`, `adminContext`, `paymentContext`, `accountContext`, `opsContext`로 축소 전달한다.
- 유지할 장점: boot-time context 1회 생성 구조는 유지한다.
- 보완할 단점: 불필요한 참조, 실수 import, 라우트 간 결합도를 줄인다.
- 구현 방식: `createRouteContext()`에서 domain별 context를 생성하고 handler에는 필요한 context만 넘긴다.
- 검증 방법: 정적 검사로 미사용 context key 탐지, route tests.
- 회귀 위험: 누락된 의존성으로 런타임 오류.
- 롤백 기준: 빠진 key 발견 시 해당 domain context에만 추가.
- 우선순위: P1
- 예상 효과: 유지보수성, 메모리 참조 정리

## 6. admin gate 중앙화

- 대상 파일: `server/routes/admin.mjs`, `server/routes/ops.mjs`
- 현재 문제: admin session, CSRF, permission check가 route별로 흩어질 가능성이 있다.
- 개선 방향: admin route handler 상단에서 인증 게이트를 중앙화하고 공개 가능한 `/api/admin/session`만 예외 처리한다.
- 유지할 장점: 기존 IP allowlist, session, CSRF, RBAC 구조는 유지한다.
- 보완할 단점: 신규 admin route가 권한 검사를 빼먹는 문제 방지.
- 구현 방식: `requireAdminGate(req, res, { csrf: method !== 'GET', permission })` helper 도입.
- 검증 방법: 비로그인, CSRF 없음, 권한 없음, 정상 권한 케이스 4종 테스트.
- 회귀 위험: GET route에 CSRF 과적용 가능.
- 롤백 기준: route별 permission metadata로 예외 명시.
- 우선순위: P0
- 예상 효과: 보안 강화

## 7. ops route 완전 격리

- 대상 파일: `server/routes/ops.mjs`, `server/routes/admin.mjs`
- 현재 문제: ops는 백업, prune, self-test, report 등 운영 민감 기능을 포함한다.
- 개선 방향: `/api/admin/ops*`, `/api/admin/backups*`, `/api/admin/maintenance*`는 ops handler에서만 처리한다.
- 유지할 장점: admin 인증 흐름은 admin handler에서 선행한다.
- 보완할 단점: 운영 기능이 일반 admin route와 섞이는 문제 제거.
- 구현 방식: admin gate 통과 후 `opsRouteHandler(req, res, state)`로 위임.
- 검증 방법: 인증 없는 ops 요청 403/401, CSRF 없는 POST 403, 권한 없는 계정 403.
- 회귀 위험: 기존 admin backup 화면 API 경로 누락.
- 롤백 기준: ops route map에 누락 경로 추가.
- 우선순위: P0
- 예상 효과: 보안 강화, 운영 안정

## 8. payment route 독립 idempotency gate

- 대상 파일: `server/routes/payment.mjs`
- 현재 문제: 결제 생성·완료·재시도·웹훅은 중복 요청에 민감하다.
- 개선 방향: payment handler 내부에 idempotency key, order state transition, webhook replay guard를 독립 계층으로 둔다.
- 유지할 장점: 기존 PortOne 검증과 주문 상태머신은 유지한다.
- 보완할 단점: 중복 결제 생성, 중복 fulfillment, 웹훅 재처리 위험 감소.
- 구현 방식: `withPaymentIdempotency(handler)` native wrapper 도입.
- 검증 방법: 동일 key 2회 요청, webhook replay, 이미 완료된 order 재완료 negative test.
- 회귀 위험: 정상 재시도까지 막을 가능성.
- 롤백 기준: 상태별 allowlist로 retry 허용.
- 우선순위: P0
- 예상 효과: 결제 안정성

## 9. public scan 고비용 작업 rate limit 강화

- 대상 파일: `server/routes/public.mjs`
- 현재 문제: scan/diagnose는 target fetch, sitemap, robots, rule catalog 등을 포함해 비용이 크다.
- 개선 방향: `/api/public/scan`, `/api/public/diagnose`에 IP+domain 기준 복합 rate limit을 적용한다.
- 유지할 장점: 무료 예비점검 접근성은 유지한다.
- 보완할 단점: 자동화 남용과 CPU/네트워크 부하를 낮춘다.
- 구현 방식: `hitRateLimit('public-scan', clientIp)` + `hitRateLimit('public-scan-domain', normalizedDomain)` 병행.
- 검증 방법: 제한 내 요청 성공, 초과 요청 429, reset header 확인.
- 회귀 위험: 공유 IP 사용자의 제한 체감.
- 롤백 기준: domain 기준은 유지하고 IP limit 완화.
- 우선순위: P1
- 예상 효과: 부하 절감, 남용 방지

## 10. diagnosis cache key 표준화

- 대상 파일: `server/routes/public.mjs`, diagnosis 관련 core
- 현재 문제: 동일 domain 재진단이 반복되면 같은 fetch·분석 작업이 중복될 수 있다.
- 개선 방향: normalize된 target URL과 rules version을 기반으로 scan cache key를 표준화한다.
- 유지할 장점: 최신 진단 필요성은 TTL로 유지한다.
- 보완할 단점: 짧은 시간 반복 요청으로 인한 부하 제거.
- 구현 방식: `scan:${rulesVersion}:${normalizedOrigin}` key 사용.
- 검증 방법: 동일 domain 반복 요청 시 cache hit 기록, TTL 만료 후 재계산.
- 회귀 위험: 사이트 변경 직후 결과 지연.
- 롤백 기준: 강제 재진단 옵션 또는 TTL 축소.
- 우선순위: P1
- 예상 효과: 부하 절감

## 11. sitemap/feed 생성 캐시

- 대상 파일: `server/routes/public.mjs`, `server/index.mjs`
- 현재 문제: `/sitemap.xml`, `/feed.xml` 요청마다 DB를 읽고 문자열을 생성한다.
- 개선 방향: DB 변경 시점 기반의 in-memory snapshot cache를 둔다.
- 유지할 장점: 검색 로봇 친화적인 동적 sitemap/feed 유지.
- 보완할 단점: 크롤러 반복 요청으로 인한 DB I/O 감소.
- 구현 방식: `cacheUntil`, `lastDbUpdatedAt`, `body`를 저장하고 TTL 내 재사용.
- 검증 방법: 첫 요청 miss, 반복 요청 hit, 게시글 추가 후 invalidation.
- 회귀 위험: 신규 게시물 반영 지연.
- 롤백 기준: cache TTL 0 설정으로 비활성화.
- 우선순위: P1
- 예상 효과: 부하 절감, SEO 안정

## 12. OpenAPI/Hardening Matrix 정적 캐시

- 대상 파일: `server/core/hardening-matrix.mjs`, `server/routes/public.mjs`, `server/routes/admin.mjs`
- 현재 문제: openapi와 hardening matrix는 빈번히 바뀌지 않는데 매번 생성될 수 있다.
- 개선 방향: DB 불필요 항목은 boot-time 생성, DB 의존 항목은 짧은 TTL cache 적용.
- 유지할 장점: 공개 투명성 API 유지.
- 보완할 단점: 반복 JSON 빌드 비용 감소.
- 구현 방식: `buildOpenApiSpec()`는 boot-time constant, `buildHardeningMatrix(db)`는 30~60초 cache.
- 검증 방법: 응답 일관성, cache-control header 확인.
- 회귀 위험: 관리자 화면에서 즉시성 저하.
- 롤백 기준: admin endpoint만 no-cache 유지.
- 우선순위: P2
- 예상 효과: 부하 절감

## 13. readyz 고비용 검사 분리

- 대상 파일: `server/index.mjs`, `server/routes/ops.mjs`
- 현재 문제: `/readyz`가 DB, 파일쓰기, Redis ping 등을 수행해 헬스체크 빈도가 높으면 부담이 된다.
- 개선 방향: `/livez`는 초경량, `/readyz`는 TTL cache, `/api/admin/ops/deep-check`는 심층 검사로 분리한다.
- 유지할 장점: 운영 readiness 의미는 유지한다.
- 보완할 단점: 로드밸런서 health check로 인한 I/O 부하 감소.
- 구현 방식: readyz 결과를 2~5초 cache하고 deep check는 admin 인증 후 수동 실행.
- 검증 방법: livez 즉시 응답, readyz TTL, deep-check 인증 필요.
- 회귀 위험: 장애 탐지 지연.
- 롤백 기준: TTL 0 또는 1초로 축소.
- 우선순위: P1
- 예상 효과: 운영 안정, 부하 절감

## 14. body parser route별 제한

- 대상 파일: `server/routes/public.mjs`, `server/routes/admin.mjs`, `server/routes/payment.mjs`, `server/routes/account.mjs`
- 현재 문제: 전역 `MAX_JSON_BODY_BYTES`만 쓰면 작은 API에도 큰 body가 허용될 수 있다.
- 개선 방향: route별 body limit을 metadata로 둔다.
- 유지할 장점: 기존 bodyJson helper 유지.
- 보완할 단점: 불필요한 메모리 사용과 abuse 방지.
- 구현 방식: payment/account/public scan/document preview/admin upload별 limit 분리.
- 검증 방법: 정상 크기 성공, 초과 크기 413.
- 회귀 위험: 실제 문서 preview payload가 제한에 걸릴 수 있음.
- 롤백 기준: route별 limit만 상향.
- 우선순위: P1
- 예상 효과: 보안 강화, 부하 절감

## 15. multipart upload MIME 재검증

- 대상 파일: `server/routes/admin.mjs`
- 현재 문제: admin library upload는 파일명·MIME·크기 검증이 약하면 위험하다.
- 개선 방향: 확장자, MIME, magic byte, size를 함께 검증한다.
- 유지할 장점: 관리자 자료 업로드 기능 유지.
- 보완할 단점: 악성 파일·대용량 파일 리스크 완화.
- 구현 방식: `isAllowedUpload()`에 magic byte 검증 옵션 추가.
- 검증 방법: 허용 파일, 확장자 위장 파일, 초대형 파일 테스트.
- 회귀 위험: 정상 파일이 거부될 수 있음.
- 롤백 기준: MIME allowlist 조정.
- 우선순위: P0
- 예상 효과: 보안 강화

## 16. CORS origin strict mode

- 대상 파일: `server/middleware/security.mjs`, `server/index.mjs`
- 현재 문제: OPTIONS 응답이 단순 allow header 중심이면 origin 정책이 흐릴 수 있다.
- 개선 방향: public/admin origin 정책을 분리한다.
- 유지할 장점: public API 접근성 유지.
- 보완할 단점: admin API의 cross-origin 접근 위험 감소.
- 구현 방식: `baseHeaders(req)`에서 pathname 기준 `Access-Control-Allow-Origin` 제한.
- 검증 방법: 허용 origin, 미허용 origin, admin origin negative test.
- 회귀 위험: 배포 도메인 누락 시 admin UI 실패.
- 롤백 기준: `NV0_ALLOWED_ADMIN_ORIGINS`에 도메인 추가.
- 우선순위: P0
- 예상 효과: 보안 강화

## 17. Host header validation 강화

- 대상 파일: `server/middleware/security.mjs`, `server/config/env.mjs`
- 현재 문제: allowedHosts는 있지만 production alias 누락·proxy 환경에서 오동작 가능성이 있다.
- 개선 방향: host, x-forwarded-host 사용 정책을 명확히 나눈다.
- 유지할 장점: misdirected request 차단 유지.
- 보완할 단점: host header attack과 proxy misconfig 방지.
- 구현 방식: `TRUST_PROXY_HEADERS` false 기본, true일 때 allowlist만 허용.
- 검증 방법: 정상 host 200, unknown host 421, forwarded host negative.
- 회귀 위험: Cloudflare/Coolify 프록시 host 처리 문제.
- 롤백 기준: allowed host 추가 또는 trust proxy 비활성.
- 우선순위: P1
- 예상 효과: 보안 강화

## 18. Security header baseline 확장

- 대상 파일: `server/index.mjs`, `server/middleware/security.mjs`
- 현재 문제: header가 분산돼 있으면 누락 가능성이 있다.
- 개선 방향: 모든 응답에 공통 보안 header를 중앙 적용한다.
- 유지할 장점: native `writeHead` 흐름 유지.
- 보완할 단점: 라우트별 header 누락 방지.
- 구현 방식: `baseHeaders(req)`에 CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy 반영.
- 검증 방법: public/admin/static/API header snapshot.
- 회귀 위험: CSP로 기존 inline script 차단 가능.
- 롤백 기준: report-only → enforce 단계 적용.
- 우선순위: P1
- 예상 효과: 보안 강화

## 19. Admin auth 실패 감사 로그 표준화

- 대상 파일: `server/routes/admin.mjs`
- 현재 문제: 인증 실패, Turnstile 실패, shared key 실패 로그 형식이 분산될 수 있다.
- 개선 방향: 실패 사유를 안전하게 표준화하고 민감정보는 마스킹한다.
- 유지할 장점: 기존 appendAudit 체계 유지.
- 보완할 단점: 감사 추적 품질과 보안성 강화.
- 구현 방식: `appendAdminAuthAudit(db, req, outcome, safePayload)` helper 추가.
- 검증 방법: 실패 로그에 password/key/token 미포함 확인.
- 회귀 위험: 운영 분석 정보 부족.
- 롤백 기준: safe reason code만 추가.
- 우선순위: P1
- 예상 효과: 보안 강화, 운영 안정

## 20. Session TTL sliding 정책 명확화

- 대상 파일: `server/routes/admin.mjs`, session store
- 현재 문제: `lastSeenAt` 갱신과 만료 정책이 불명확하면 세션이 과도하게 유지되거나 빨리 끊길 수 있다.
- 개선 방향: absolute TTL과 idle TTL을 분리한다.
- 유지할 장점: 기존 session cookie 구조 유지.
- 보완할 단점: 세션 탈취 위험과 관리자 불편 균형화.
- 구현 방식: `NV0_ADMIN_SESSION_TTL_MS`, `NV0_ADMIN_IDLE_TTL_MS` 분리.
- 검증 방법: idle 초과 만료, absolute 초과 만료, 정상 활동 연장.
- 회귀 위험: 관리자 작업 중 세션 만료.
- 롤백 기준: idle TTL 상향.
- 우선순위: P1
- 예상 효과: 보안 강화

## 21. Account route ownership guard 공통화

- 대상 파일: `server/routes/account.mjs`
- 현재 문제: account export, deactivate, saved sites, scan detail마다 소유권 검증이 반복될 수 있다.
- 개선 방향: `requireCustomerResource(req, resource)` helper로 공통화한다.
- 유지할 장점: 고객 포털 기능 유지.
- 보완할 단점: IDOR 취약점 방지.
- 구현 방식: order/site/customer lookup 이후 `customer.id` 일치 확인을 중앙화.
- 검증 방법: 타인 siteId/orderId 접근 403, 본인 접근 200.
- 회귀 위험: 과거 비회원 access token 기반 주문 접근과 충돌.
- 롤백 기준: public order access token route는 별도 guard 유지.
- 우선순위: P0
- 예상 효과: 보안 강화

## 22. 개인정보 export/deactivate 비동기화

- 대상 파일: `server/routes/account.mjs`
- 현재 문제: 계정 export나 deactivate가 커지면 요청 시간이 길어질 수 있다.
- 개선 방향: 즉시 완료가 필요한 것은 유지하고, 대용량 export는 job/outbox 기반으로 분리한다.
- 유지할 장점: 고객 권리 행사 기능 유지.
- 보완할 단점: timeout과 DB lock 부담 감소.
- 구현 방식: 작은 데이터는 즉시, 큰 데이터는 export job 생성 후 이메일 알림.
- 검증 방법: 소형 export 즉시, 대형 export job 생성, 개인정보 마스킹 확인.
- 회귀 위험: 사용자 즉시 다운로드 기대와 차이.
- 롤백 기준: 임계값 상향으로 즉시 처리 범위 확대.
- 우선순위: P2
- 예상 효과: 운영 안정

## 23. Payment webhook raw body 보존

- 대상 파일: `server/routes/payment.mjs`
- 현재 문제: 웹훅 서명 검증은 raw body가 필요할 수 있는데 JSON parse 후 검증하면 실패 위험이 있다.
- 개선 방향: webhook endpoint는 raw body → signature verify → JSON parse 순서로 강제한다.
- 유지할 장점: 기존 PortOne webhook verify 로직 유지.
- 보완할 단점: 실제 운영 웹훅 검증 실패 방지.
- 구현 방식: `/api/public/payment/portone/webhook`만 `bodyText` 또는 `bodyBuffer` 우선 사용.
- 검증 방법: 정상 서명, 변조 body, 재전송 테스트.
- 회귀 위험: 테스트 fixture 수정 필요.
- 롤백 기준: verify mode optional 환경에서만 fallback 허용.
- 우선순위: P0
- 예상 효과: 결제 보안

## 24. Order state machine 강제 적용 범위 확대

- 대상 파일: `server/routes/payment.mjs`, `server/routes/admin.mjs`
- 현재 문제: 관리자 수동 상태 변경이 state machine을 우회할 가능성이 있다.
- 개선 방향: 모든 order status 변경은 `canTransition()`을 통과하게 한다.
- 유지할 장점: 기존 PAYMENT/ORDER transition 모델 유지.
- 보완할 단점: 비정상 상태 점프 방지.
- 구현 방식: admin orders/status, payment complete, sync 모두 같은 transition helper 사용.
- 검증 방법: 허용 전이 성공, 금지 전이 실패.
- 회귀 위험: 운영자가 예외 처리 못할 수 있음.
- 롤백 기준: super_admin emergency override를 audit log 필수로 제한 허용.
- 우선순위: P0
- 예상 효과: 결제 안정성

## 25. Fulfillment 중복 생성 방지

- 대상 파일: `server/routes/payment.mjs`, `server/routes/admin.mjs`
- 현재 문제: 결제 완료, 관리자 sync, webhook이 동시에 fulfillment를 만들 수 있다.
- 개선 방향: orderId 기준 distributed lock 또는 idempotency record를 사용한다.
- 유지할 장점: 자동 결과물 생성 흐름 유지.
- 보완할 단점: 중복 파일·중복 이메일·중복 감사 로그 방지.
- 구현 방식: `withOrderLock(orderId, async () => ensureFulfillmentForOrder(...))` 적용.
- 검증 방법: 병렬 5회 complete 요청 시 fulfillment 1개.
- 회귀 위험: lock provider 장애.
- 롤백 기준: lock 실패 시 409 retry-after 반환.
- 우선순위: P0
- 예상 효과: 결제 안정성, 운영 안정

## 26. 환경 변수 placeholder hard fail

- 대상 파일: `server/config/env.mjs`, `server/config/validation.mjs`
- 현재 문제: example 값이나 placeholder가 상용 환경에 남으면 장애·보안 위험이 된다.
- 개선 방향: production/commercial에서 placeholder를 hard fail 처리한다.
- 유지할 장점: prelaunch에서는 필요한 항목만 경고 가능.
- 보완할 단점: 상용 배포 직후 빈 설정으로 장애 나는 문제 방지.
- 구현 방식: `isPlaceholderConfigValue()`를 env validation에 통합.
- 검증 방법: placeholder 포함 production env boot 실패.
- 회귀 위험: 개발환경 진입 차단.
- 롤백 기준: NODE_ENV development에서는 warning만 허용.
- 우선순위: P0
- 예상 효과: 운영 안정, 보안 강화

## 27. env schema export endpoint 제한

- 대상 파일: `server/config/env.mjs`, `server/routes/admin.mjs`
- 현재 문제: 설정 요약을 공개하면 민감한 구성 힌트가 노출될 수 있다.
- 개선 방향: public에는 안전한 feature flag만, admin에는 masked config summary만 제공한다.
- 유지할 장점: 운영 진단 편의 유지.
- 보완할 단점: secret, bucket, provider 세부 정보 노출 방지.
- 구현 방식: `safeConfigSummary({ audience: 'public'|'admin' })` 분리.
- 검증 방법: 응답에 secret/token/key/password 문자열 미포함.
- 회귀 위험: 운영자가 필요한 정보 부족.
- 롤백 기준: admin만 masked hash suffix 제공.
- 우선순위: P1
- 예상 효과: 보안 강화

## 28. request timeout과 slow request 로깅 연동

- 대상 파일: `server/index.mjs`, `server/config/env.mjs`
- 현재 문제: slow threshold와 request timeout이 별도면 실제 지연 원인 파악이 어렵다.
- 개선 방향: request start time, route key, status, duration을 구조화해 기록한다.
- 유지할 장점: 기존 slow request warn 유지.
- 보완할 단점: 병목 API 추적 강화.
- 구현 방식: 응답 finish 시점에 duration을 계산하고 threshold 초과 시 log.
- 검증 방법: 인위적 slow route fixture에서 warn 발생.
- 회귀 위험: 로그 과다.
- 롤백 기준: threshold 상향 또는 sampling 적용.
- 우선순위: P1
- 예상 효과: 운영 안정

## 29. JSON 응답 압축 조건화

- 대상 파일: `server/index.mjs`
- 현재 문제: 큰 diagnosis/report JSON이 반복되면 네트워크 비용이 커진다.
- 개선 방향: Node 기본 zlib를 사용해 큰 JSON만 gzip/br 조건부 압축한다.
- 유지할 장점: 외부 의존성 없이 zero-cost 유지.
- 보완할 단점: 작은 응답 압축 오버헤드는 피한다.
- 구현 방식: `Accept-Encoding` 확인 후 2KB 이상 JSON만 gzip.
- 검증 방법: gzip header, body decode, small response no-gzip.
- 회귀 위험: 일부 프록시와 header 충돌.
- 롤백 기준: `NV0_RESPONSE_COMPRESSION=false` 비활성화.
- 우선순위: P2
- 예상 효과: 네트워크 부하 절감

## 30. static asset immutable cache

- 대상 파일: `server/index.mjs`, public asset serving
- 현재 문제: 정적 JS/CSS/image가 매번 재검증되면 트래픽이 증가한다.
- 개선 방향: fingerprint가 있는 asset은 immutable cache, HTML은 no-cache로 분리한다.
- 유지할 장점: 배포 후 최신 HTML 반영 유지.
- 보완할 단점: 반복 asset 다운로드 감소.
- 구현 방식: `/assets/*`, hash filename detect 시 `cache-control: public, max-age=31536000, immutable`.
- 검증 방법: HTML no-cache, hashed JS immutable.
- 회귀 위험: hash 없는 파일 캐시 고착.
- 롤백 기준: hash 없는 파일은 짧은 TTL 유지.
- 우선순위: P1
- 예상 효과: 프론트 부하 절감

## 31. renderPage 결과 micro-cache

- 대상 파일: `server/index.mjs`
- 현재 문제: 같은 마케팅 페이지가 반복 요청될 때 HTML 렌더 비용이 반복된다.
- 개선 방향: public page는 짧은 micro-cache를 적용하고 로그인/관리자/동적 페이지는 제외한다.
- 유지할 장점: 서버 렌더 흐름 유지.
- 보완할 단점: SEO 크롤러 반복 접근 부하 감소.
- 구현 방식: path별 5~30초 HTML cache, cookie 존재 시 bypass.
- 검증 방법: 익명 요청 cache hit, 로그인 cookie bypass.
- 회귀 위험: 개인화 정보 캐시 노출.
- 롤백 기준: cookie 감지 strict 또는 cache 비활성.
- 우선순위: P1
- 예상 효과: 부하 절감

## 32. CTA board pagination 강제

- 대상 파일: `server/routes/public.mjs`, `server/routes/admin.mjs`
- 현재 문제: 게시판/콘텐츠 API가 전체 배열을 반환하면 데이터 증가 시 응답이 커진다.
- 개선 방향: public/admin 모두 limit, cursor, max cap을 강제한다.
- 유지할 장점: CTA 게시판 노출 유지.
- 보완할 단점: 대량 게시글 응답 부하 감소.
- 구현 방식: `?limit=20&cursor=` 기본값과 최대 100 cap.
- 검증 방법: limit 생략 기본값, limit 초과 cap, cursor 정상.
- 회귀 위험: 프론트가 전체 데이터를 기대할 수 있음.
- 롤백 기준: 프론트 무한스크롤/더보기와 함께 배포.
- 우선순위: P1
- 예상 효과: 부하 절감, UX 안정

## 33. admin list endpoint pagination 통일

- 대상 파일: `server/routes/admin.mjs`
- 현재 문제: orders, customers, audit logs, publications 등 list 응답이 커질 수 있다.
- 개선 방향: admin list API에 공통 pagination helper를 적용한다.
- 유지할 장점: 관리자 대시보드 기능 유지.
- 보완할 단점: 운영 데이터 증가 시 관리자 페이지 지연 방지.
- 구현 방식: `paginateArray(items, { limit, cursor, max })` 사용.
- 검증 방법: 0건, 1건, max 초과, cursor next.
- 회귀 위험: 기존 관리자 UI 수정 필요.
- 롤백 기준: legacy endpoint는 유지하고 v2 endpoint 추가.
- 우선순위: P1
- 예상 효과: 운영 안정

## 34. audit log retention 실제 enforce

- 대상 파일: `server/routes/admin.mjs`, DB write path
- 현재 문제: audit log retention count가 있어도 쓰기 시점에서 정리하지 않으면 무한 증가할 수 있다.
- 개선 방향: audit append 또는 maintenance prune에서 retention을 강제한다.
- 유지할 장점: 감사 추적 유지.
- 보완할 단점: JSON DB/스토리지 비대화 방지.
- 구현 방식: `appendAudit()` 내부에서 count cap 또는 scheduled prune.
- 검증 방법: retention+10개 생성 후 cap 확인.
- 회귀 위험: 오래된 감사 로그 손실.
- 롤백 기준: retention count 상향 및 백업 후 prune.
- 우선순위: P1
- 예상 효과: 운영 안정, 저장소 부하 절감

## 35. email outbox retry backoff 검증

- 대상 파일: `server/routes/admin.mjs`, email outbox core
- 현재 문제: 발송 실패 이메일이 빠르게 반복 재시도되면 외부 API와 서버에 부담을 준다.
- 개선 방향: exponential backoff와 max retry를 강제한다.
- 유지할 장점: transactional email outbox 유지.
- 보완할 단점: 장애 상황의 retry storm 방지.
- 구현 방식: `nextAttemptAt`, `retryCount`, `lastError` 필드 사용.
- 검증 방법: 실패 3회 후 backoff 증가, max retry 후 hold.
- 회귀 위험: 정상 복구 후 발송 지연.
- 롤백 기준: 관리자 수동 process endpoint 제공.
- 우선순위: P1
- 예상 효과: 운영 안정

## 36. backup restore 권한 이중 확인

- 대상 파일: `server/routes/ops.mjs`, `server/routes/admin.mjs`
- 현재 문제: restore는 파괴적 작업이라 단일 권한만으로는 위험하다.
- 개선 방향: restore는 `backup:restore` 권한 + CSRF + confirmation phrase를 요구한다.
- 유지할 장점: 관리자 복구 기능 유지.
- 보완할 단점: 실수 복구로 인한 데이터 손실 방지.
- 구현 방식: body.confirm === backup id 또는 지정 문구 확인.
- 검증 방법: phrase 없음 400, 권한 없음 403, 정상 restore.
- 회귀 위험: 운영 긴급 복구 절차 복잡.
- 롤백 기준: emergency override는 audit 필수.
- 우선순위: P0
- 예상 효과: 운영 안정, 보안 강화

## 37. backup encryption required mode 검증 강화

- 대상 파일: `server/routes/ops.mjs`, backup core, env validation
- 현재 문제: remote backup이 켜졌는데 암호화 secret이 없으면 위험하다.
- 개선 방향: `BACKUP_REMOTE_REQUIRE_ENCRYPTION=true` 또는 commercial target에서는 암호화 미설정 시 readyz fail.
- 유지할 장점: local 개발 backup은 유지.
- 보완할 단점: 원격 백업 평문 저장 방지.
- 구현 방식: env validation과 backup run 전 precheck 이중화.
- 검증 방법: remote on + secret 없음 실패, secret 있음 성공.
- 회귀 위험: 운영 백업이 중단될 수 있음.
- 롤백 기준: 임시 local backup으로 전환 후 secret 주입.
- 우선순위: P0
- 예상 효과: 보안 강화

## 38. R2/S3 object key namespace guard

- 대상 파일: storage helper, `server/routes/admin.mjs`, backup core
- 현재 문제: object key prefix 검증이 약하면 다른 prefix에 쓰기 가능성이 생긴다.
- 개선 방향: 모든 remote object key가 허용 prefix 하위인지 검증한다.
- 유지할 장점: S3 compatible 업로드 기능 유지.
- 보완할 단점: path traversal/object overwrite 위험 감소.
- 구현 방식: `assertObjectKeyWithinPrefix(key, allowedPrefix)` helper.
- 검증 방법: 정상 key 성공, `../`, 선행 slash, 다른 prefix 실패.
- 회귀 위험: 기존 prefix 포맷과 충돌.
- 롤백 기준: prefix normalization 보정.
- 우선순위: P1
- 예상 효과: 보안 강화

## 39. env config와 runtime constants 중복 제거

- 대상 파일: `server/index.mjs`, `server/config/env.mjs`, `server/config/validation.mjs`
- 현재 문제: env 값 일부는 `readEnvConfig`, 일부는 index에서 직접 읽는다.
- 개선 방향: 모든 env parse는 config 모듈로 모으고 index는 config 객체만 사용한다.
- 유지할 장점: 기존 상수명 호환은 alias로 유지한다.
- 보완할 단점: 검증 누락, default 불일치, 테스트 어려움 감소.
- 구현 방식: `readEnvConfig()` 확장 후 index의 직접 `process.env` 접근 단계적 축소.
- 검증 방법: env snapshot test, placeholder test, production required test.
- 회귀 위험: default 변경으로 동작 차이.
- 롤백 기준: 기존 default를 그대로 schema에 반영.
- 우선순위: P1
- 예상 효과: 유지보수성, 운영 안정

## 40. route ownership manifest 생성

- 대상 파일: `server/routes/*.mjs`, `server/core/hardening-matrix.mjs`
- 현재 문제: 어떤 route가 어느 파일 소유인지 추적이 어렵다.
- 개선 방향: route manifest를 boot-time 생성하고 hardening matrix/admin endpoint에 노출한다.
- 유지할 장점: OpenAPI/hardening matrix 투명성 유지.
- 보완할 단점: 중복 route, 미보호 route, 테스트 누락 탐지.
- 구현 방식: route 등록 시 `{ method, path, owner, auth, csrf, permission }` metadata 포함.
- 검증 방법: route manifest에 중복 key 없음, admin/ops auth metadata 필수.
- 회귀 위험: metadata 관리 부담.
- 롤백 기준: build-time validation만 남기고 runtime 노출 축소.
- 우선순위: P1
- 예상 효과: QA 강화, 유지보수성

## 41. route negative test 자동 생성

- 대상 파일: `tests/routes-smoke.mjs`, 신규 test generator
- 현재 문제: smoke test는 정상 응답 중심이면 보안 회귀를 놓칠 수 있다.
- 개선 방향: route manifest 기반으로 auth/csrf/permission negative test를 자동 생성한다.
- 유지할 장점: 기존 smoke test 유지.
- 보완할 단점: 신규 route 보안 누락을 자동 감지.
- 구현 방식: admin POST route는 no session, no csrf, no permission 3종 테스트.
- 검증 방법: 의도적으로 보호 제거 시 테스트 실패.
- 회귀 위험: 테스트 시간이 증가.
- 롤백 기준: P0 route부터 단계 적용.
- 우선순위: P0
- 예상 효과: 보안 회귀 방지

## 42. response contract snapshot

- 대상 파일: tests, `server/routes/*.mjs`
- 현재 문제: 프론트가 기대하는 응답 shape가 바뀌어도 감지하기 어렵다.
- 개선 방향: 핵심 public/account/payment/admin API 응답 shape snapshot을 둔다.
- 유지할 장점: 기존 API endpoint 유지.
- 보완할 단점: 프론트 깨짐 사전 탐지.
- 구현 방식: key 존재·타입 중심 snapshot, 값 자체는 느슨하게 검증.
- 검증 방법: 필수 key 누락 시 실패.
- 회귀 위험: 변경 때마다 snapshot 업데이트 필요.
- 롤백 기준: semver 또는 phase별 contract 변경 문서화.
- 우선순위: P1
- 예상 효과: QA 강화

## 43. route-level error boundary

- 대상 파일: `server/index.mjs`, `server/routes/*.mjs`
- 현재 문제: handler 내부 예외가 응답 없이 터지면 연결이 끊길 수 있다.
- 개선 방향: route handler wrapper에서 예외를 잡고 JSON 500 또는 text 500으로 표준 응답한다.
- 유지할 장점: 기존 handler 함수 구조 유지.
- 보완할 단점: 장애 시 사용자 경험과 로그 추적 개선.
- 구현 방식: `safeHandler(routeKey, handler)` wrapper.
- 검증 방법: throw fixture route에서 500 JSON, audit/log 확인.
- 회귀 위험: 민감 error message 노출.
- 롤백 기준: production에서는 generic error만 반환.
- 우선순위: P1
- 예상 효과: 운영 안정

## 44. graceful shutdown 보강

- 대상 파일: `server/index.mjs`
- 현재 문제: 배포 중 요청 처리·세션 저장·DB write가 중단될 수 있다.
- 개선 방향: SIGTERM/SIGINT에서 server.close, sessions flush, pending write 완료를 기다린다.
- 유지할 장점: Coolify/Docker 배포 흐름 유지.
- 보완할 단점: 배포 중 데이터 손상 위험 감소.
- 구현 방식: shutdown timeout 10~20초, new connection reject, dirty session flush.
- 검증 방법: 실행 중 SIGTERM, 정상 종료 로그, session file write 확인.
- 회귀 위험: 종료 지연.
- 롤백 기준: timeout 축소.
- 우선순위: P1
- 예상 효과: 운영 안정

## 45. DB read/write coalescing

- 대상 파일: persistence layer, route modules
- 현재 문제: 같은 요청에서 `readDb()`가 여러 번 호출될 수 있다.
- 개선 방향: 요청 state에 db snapshot을 캐시하고 쓰기 필요 시 명시적으로 dirty 처리한다.
- 유지할 장점: 기존 JSON/Postgres persistence 추상화 유지.
- 보완할 단점: 요청당 I/O 중복 감소.
- 구현 방식: `state.getDb()` helper가 같은 요청 내 1회만 read.
- 검증 방법: instrumentation으로 요청당 read count 확인.
- 회귀 위험: 오래된 snapshot 사용.
- 롤백 기준: mutation route는 항상 fresh read 강제.
- 우선순위: P1
- 예상 효과: 부하 절감

## 46. public config no-secret hard check

- 대상 파일: `server/routes/public.mjs`
- 현재 문제: public config endpoint가 실수로 내부 상태를 확장하다 secret을 노출할 위험이 있다.
- 개선 방향: public config 응답은 allowlist 방식으로만 구성한다.
- 유지할 장점: 프론트에 필요한 feature flag 제공 유지.
- 보완할 단점: secret/token/provider internal 노출 방지.
- 구현 방식: `buildPublicConfig()` 함수에서 고정 key만 반환.
- 검증 방법: 응답 문자열에 key/secret/token/password 없음.
- 회귀 위험: 프론트 신규 플래그 누락.
- 롤백 기준: allowlist에 명시 추가.
- 우선순위: P0
- 예상 효과: 보안 강화

## 47. rules/catalog build lazy cache

- 대상 파일: diagnosis/rule 관련 core, `server/routes/public.mjs`, `server/routes/admin.mjs`
- 현재 문제: `buildRuleCatalog()`가 여러 endpoint에서 반복 호출될 수 있다.
- 개선 방향: rulesVersion 기준 catalog를 boot-time 또는 lazy singleton으로 캐시한다.
- 유지할 장점: rule catalog 기반 진단 유지.
- 보완할 단점: 반복 배열 생성 감소.
- 구현 방식: `getRuleCatalogSnapshot()` 도입.
- 검증 방법: 동일 참조/동일 길이, rulesVersion 변경 시 invalidation.
- 회귀 위험: 런타임 rule 수정 반영 지연.
- 롤백 기준: admin rules 수정 시 cache clear.
- 우선순위: P2
- 예상 효과: 부하 절감

## 48. SEO bot 전용 lightweight path

- 대상 파일: `server/index.mjs`, `server/routes/public.mjs`
- 현재 문제: 검색 로봇이 sitemap/feed/board/content를 반복 접근하면 DB·렌더 부하가 커진다.
- 개선 방향: bot 트래픽에는 캐시 가능한 read-only endpoint를 우선 제공한다.
- 유지할 장점: 검색 노출 강화 목표 유지.
- 보완할 단점: 크롤링 부하와 일반 사용자 API 경쟁 감소.
- 구현 방식: user-agent 기반 차별이 아니라 cache-control과 static snapshot 위주로 처리.
- 검증 방법: sitemap/feed/cache header, board pagination, HTML 정상.
- 회귀 위험: 검색 반영 지연.
- 롤백 기준: cache TTL 축소.
- 우선순위: P2
- 예상 효과: SEO 안정, 부하 절감

## 49. Phase validation에 “Express 금지” 검사 추가

- 대상 파일: 신규 `scripts/validate-phase167-native-http-product-50.mjs`
- 현재 문제: 향후 개선 과정에서 Express Router 스타일 코드가 다시 들어올 수 있다.
- 개선 방향: `router.use`, `next(`, `req.params`, `express.Router` 패턴을 차단한다.
- 유지할 장점: Native HTTP 구조 유지.
- 보완할 단점: 잘못된 프레임워크 전제 유입 방지.
- 구현 방식: 대상 파일 AST/문자열 검사.
- 검증 방법: 금지 패턴 삽입 시 validator 실패.
- 회귀 위험: 정상 함수명 next가 오탐될 수 있음.
- 롤백 기준: route 파일 범위로만 검사 제한.
- 우선순위: P1
- 예상 효과: 구조 회귀 방지

## 50. Phase167 최종 게이트 패키징

- 대상 파일: `package.json`, `scripts/validate-phase167-native-http-product-50.mjs`, 보고서
- 현재 문제: 개선안이 코드·테스트·문서로 연결되지 않으면 다음 Phase에서 다시 흐려진다.
- 개선 방향: Phase167 전용 final gate를 만들어 납품 기준을 고정한다.
- 유지할 장점: 기존 Phase156~166 검증 계보 유지.
- 보완할 단점: “수정했으나 검증 불명확” 문제 제거.
- 구현 방식: `npm run phase167:final`에 syntax, all tests, e2e, route smoke, links, stress, phase166, phase167 validator 포함.
- 검증 방법: phase167 final 통과 JSON 생성.
- 회귀 위험: 테스트 시간이 증가.
- 롤백 기준: heavy test와 smoke test를 분리하되 final은 유지.
- 우선순위: P1
- 예상 효과: QA 강화, 납품 신뢰도 향상

---

# 최종 적용 순서

## 1단계: P0 보안·결제·운영 차단선

1. index 잔존 API route 정리 전 manifest 작성
2. admin gate 중앙화
3. ops route 격리
4. payment raw webhook 검증
5. order state machine 강제
6. fulfillment 중복 생성 방지
7. upload MIME/magic 검증
8. backup restore 이중 확인
9. public config no-secret 검증
10. route negative test 자동화

## 2단계: P1 부하 절감 구조화

1. route dispatch table
2. dynamic matcher 분리
3. URL parsing 1회화
4. domain별 context 축소
5. public scan 복합 rate limit
6. sitemap/feed cache
7. readyz TTL/deep-check 분리
8. body limit route별 적용
9. static asset cache
10. list pagination
11. graceful shutdown
12. DB read coalescing

## 3단계: P2 품질·확장성

1. OpenAPI/Hardening Matrix cache
2. response compression
3. renderPage micro-cache
4. SEO bot lightweight path
5. rule catalog lazy cache
6. account export job화

---

# 하드 게이트

다음 중 하나라도 실패하면 완료로 표시하지 않는다.

- Express Router 사용 흔적 발견
- `server/index.mjs`에 중복 public/admin API route가 실제 dispatch 경로에 남아 있음
- admin/ops POST route가 session 없이 접근 가능
- CSRF negative test 실패
- payment webhook raw body 검증 실패
- order state transition 우회 가능
- public config에 secret/token/key/password 노출
- route smoke 실패
- syntax check 실패
- 기존 Phase166 검증 실패
- Phase167 validator 실패

---

# 권장 검증 명령

```bash
npm run check:syntax
npm run test:all
npm run test:e2e
npm run test:routes
npm run check:links -- --summary
npm run stress:smoke
npm run validate:phase166
npm run validate:phase167
npm run phase167:final
```

명령이 실제 `package.json`에 없으면 새로 추가하거나 “스크립트 없음”으로 기록한다. 실행하지 않은 검증을 완료로 표기하지 않는다.

---

# 산출물 기준

실제 수정까지 진행하는 경우 납품물은 다음으로 고정한다.

- `nv0_full_p167_native_http_product_load_security_50_delivery.zip`
- `PHASE167_NATIVE_HTTP_PRODUCT_LOAD_SECURITY_50_VALIDATION_20260502.json`
- `PHASE167_NATIVE_HTTP_PRODUCT_LOAD_SECURITY_50_REPORT_20260502_KO.md`
- `PHASE167_DELIVERY_MANIFEST_20260502_KO.md`
- `nv0_full_p167_native_http_product_load_security_50_delivery.sha256`

---

# 자체 검수

자체 검수: 통과

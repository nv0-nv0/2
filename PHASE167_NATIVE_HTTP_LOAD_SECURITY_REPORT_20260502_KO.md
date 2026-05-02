# Phase167 Native HTTP Load/Security 개선 보고서

## 결과

Phase166 기준 Native HTTP 라우팅 구조를 유지하면서, 효과가 확인된 항목만 Phase167로 반영했습니다. Express Router, `router.use()`, `next()`, `req.params` 방식은 도입하지 않았습니다.

## 핵심 반영

1. `server/index.mjs`의 API dispatch 책임을 축소했습니다.
2. `server/routes/public.mjs`, `admin.mjs`, `payment.mjs`, `account.mjs`, `ops.mjs`가 `req._nv0RouteState` 기반의 pre-parsed native route state를 재사용하게 했습니다.
3. route 모듈 내부의 `resolveNativeRouteState(req)` 재호출과 `new URL(req.url...)` 생성을 제거했습니다.
4. root 레벨 `/readyz`, `/robots.txt`, `/sitemap.xml`, `/feed.xml` 처리는 `server/index.mjs` 소유로 정리하고, public route의 도달 불가능한 중복 branch를 제거했습니다.
5. `/readyz`는 TTL cache를 유지하고, sitemap/feed는 짧은 TTL 캐시와 `x-nv0-cache` 헤더를 유지합니다.
6. Phase167 전용 validator를 “route module URL 재파싱 금지” 기준으로 강화했습니다.

## 계량 확인

| 항목 | Phase166 | Phase167 | 판정 |
| - | -: | -: | - |
| `server/index.mjs` 라인 수 | 4,973 | 3,840 | 중복 branch 제거 |
| `handleApi()` 라인 수 | 대형 분기 잔존 | 22 | dispatch 책임 명확화 |
| route 모듈 `new URL(req.url...)` | 존재 가능 | 0 | URL 재파싱 제거 |
| route 모듈 `resolveNativeRouteState(req)` | 5개 | 0 | pre-parsed state 재사용 |
| routes smoke | - | 24개 통과 | 회귀 없음 |
| stress smoke | - | 56 요청 / 0 실패 | 기본 부하 smoke 통과 |

## 검증

- `npm run check:syntax`: 통과 / 191개
- `npm run test:all`: 통과 / 88개
- `npm run test:e2e`: 통과
- `npm run test:routes`: 통과 / 24개
- `npm run test:security-stateful`: 통과 / 5개
- `npm run validate:phase166`: 통과
- `npm run validate:phase167`: 통과 / 15개
- `npm run check:links`: 통과 / 149개 / 오류 0개
- `npm run stress:smoke`: 통과 / 56 요청 / 실패 0개
- `npm run phase167:final`: 통과

## 의도적으로 하지 않은 것

- Express Router 전환은 하지 않았습니다.
- 실제 운영 콘솔 설정, Cloudflare WAF, PG/R2/Redis 실계정 검증은 패키지에서 완료 처리하지 않았습니다.
- 대규모 캐시 계층/Redis 도입은 zero-cost 범위를 벗어나므로 적용하지 않았습니다.

## 롤백 기준

운영 반영 후 아래 중 하나라도 발생하면 Phase166 패키지로 되돌립니다.

- `/api/public/*` 주요 route 5xx 증가
- `/api/admin/session` 또는 admin CSRF negative test 실패
- payment callback/complete route 회귀
- `/readyz`가 정상 의존성에서 503 반환
- route smoke 또는 E2E 실패

## 자체 검수

통과. 다만 운영 실트래픽 부하 검증, 결제 실 webhook 검증, Cloudflare 정책 검증은 운영자 확인 필요 항목입니다.

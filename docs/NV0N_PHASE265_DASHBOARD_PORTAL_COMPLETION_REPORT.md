# NV0 Phase265 Dashboard Portal Completion Report

## 반영 요약
- 업로드된 `dashboard_renewal.html`의 `내 사이트 관리` 대시보드 구조를 `/portal` 실제 화면에 반영했습니다.
- 기존 정적 예시 도메인 3개(`ecommerce-hub.com`, `blog.techinsights.net`, `corporate-portal.io`)는 제거하고, 계정·포털 요약·최근 진단 데이터로 렌더링되도록 변경했습니다.
- 상단 요약 카드 3종(`전체 사이트 수`, `심각한 이슈`, `규제 준수 완료`)을 실제 자산 상태 기준으로 갱신되게 연결했습니다.
- 활성 자산 목록의 `상세 리포트`, `지금 해결하기`, `가이드라인 업데이트`, `다시 진단` 액션을 실제 `/portal`, `/checkout`, `/plans`, `/products/veridion/demo` 흐름에 연결했습니다.
- `새 사이트 추가` 버튼과 사이트 저장 폼을 연결하고, 저장 실패 시 로그인·회원가입 이동 안내가 표시되도록 개선했습니다.
- 기존 버그였던 `.nv74-account.textContent` 대입으로 사이트 등록 폼이 DOM에서 사라지는 문제를 제거했습니다.
- `/plans` 페이지의 요금제 버튼을 실제 결제/진단 링크로 교체했습니다.
- `/portal`, `/plans`의 푸터 정책 링크를 `/privacy`, `/terms`, `/business-info` 실제 경로로 연결했습니다.
- 서버의 `main` 태그 보강 로직과 충돌하지 않도록 `/portal`, `/plans`의 `<main>` 속성 순서를 정리했습니다.
- Phase265 전용 검증 스크립트 `validate:phase265`와 최종 게이트 `phase265:final`을 추가했습니다.

## 변경 파일
- `apps/public/portal/index.html`
- `apps/public/portal/app.js`
- `apps/public/plans/index.html`
- `scripts/validate-phase265-dashboard-portal.mjs`
- `scripts/validate-phase258-structural-hardening.mjs`
- `scripts/validate-phase259-demo-penalty-dashboard.mjs`
- `scripts/validate-phase260-dispute-safe-penalty.mjs`
- `tests/e2e.mjs`
- `package.json`
- `RUN_ALL_TESTS.sh`

## 연결된 주요 기능
- 계정 상태: `GET /api/public/auth/session`
- 내 계정/저장 사이트: `GET /api/public/account`
- 포털 요약: `GET /api/public/portal-summary`
- 사이트 저장: `POST /api/public/account/sites`
- 사이트 삭제: `DELETE /api/public/account/sites/:siteId`
- 재검사: `POST /api/public/account/rescan`
- 결제/산출물 흐름: `/checkout?plan=Report`, `/checkout?plan=Expert`, `/api/public/fulfillment`

## 검증 결과
최종 게이트 `npm run phase265:final` 통과.

통과 항목:
- `check:syntax` — 150개 소스 문법 검사 통과
- `npm test` — 105개 테스트 통과
- `test:e2e` — 통과
- `check:pages` — 44개 라우트 페이지 무결성 통과
- `test:routes` — 24개 라우트 스모크 통과
- `check:links --summary` — 397개 링크 검사 통과
- `validate:phase264` — 통과
- `validate:phase265` — 동적 대시보드/폼 보존/API 연결 검증 통과
- `validate:commercial` — 통과
- `validate:commercial-runtime` — 통과
- `validate:pipeline` — 통과

## 외부 키 필요 사항
아래 항목은 코드 연결은 유지했지만, 실제 운영에서는 환경변수/외부 콘솔 설정이 필요합니다.
- PortOne 실결제 키와 웹훅 시크릿
- SMTP 발송 계정
- Turnstile 사이트 키/시크릿
- 외부 진단 공급자 토큰
- 운영 도메인 배포 후 Cloudflare/리버스 프록시 캐시 정책

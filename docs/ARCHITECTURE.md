# Architecture

## Runtime flow

1. 공개 사용자가 `/products/veridion/demo`에서 URL을 입력합니다.
2. 서버가 입력값과 SSRF 위험을 검증합니다.
3. 공개 페이지 근거를 수집하고 신뢰·고지·전환 위험을 계산합니다.
4. 결과 화면은 위기도, 핵심 KPI, 히트맵, 고객 여정, 우선 해결 항목, 유료 리포트 CTA 순으로 표시합니다.
5. 유료 상품은 서버 고정 상품 카탈로그와 결제 상태 머신을 사용합니다.

## Separation of concerns

- `apps/`: 표시와 사용자 상호작용
- `server/routes/`: 공개·계정·결제·관리자·운영 API
- `server/core/`: 진단, 상품, 위험, 운영 정책
- `server/infrastructure/`: PostgreSQL, Redis, S3, PortOne, 보안 저장소
- `shared/`: 공통 CSS, 브라우저 유틸리티, 상품 단일 소스

## Clean baseline policy

과거 단계별 중첩 게이트와 보고서는 운영 패키지에서 제거했습니다. 현재 패키지는 `scripts/run-release-gate.mjs` 하나를 최종 릴리즈 진입점으로 사용합니다.

## Stitch experience pipeline

Stitch `Executive Trust Framework` 시안 10종은 `shared/stitch-route-manifest.mjs`에서 실제 화면과 연결합니다. 단순 시안 사본이 아니라 아래 5개 레이어로 운영합니다.

1. 디자인 시스템 레이어
2. 라우트 경험 레이어
3. 상태 커버리지 레이어
4. 기능 핸드오프 레이어
5. 릴리즈 계약 레이어

`server/core/stitch-experience-pipeline.mjs`는 매핑 상태를 계산하고, `npm run check:stitch-experience-pipeline`과 `npm run test:stitch-experience-pipeline`은 정적·통합 회귀를 차단합니다. 내부 상태 API는 테스트 모드에서만 열리며 일반 고객 API에서는 404로 격리됩니다.

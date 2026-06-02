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

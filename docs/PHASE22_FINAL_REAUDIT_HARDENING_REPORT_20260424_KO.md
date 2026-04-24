# Phase22 최종 재검수·수정·보완·강화 보고서

## 처리일
2026-04-24

## 핵심 수정
- Dockerfile 및 compose 헬스체크를 `/readyz`에서 `/healthz`로 변경해 롤링 배포가 외부 DB/Redis/S3 준비 상태 때문에 즉시 롤백되지 않도록 조정.
- 상용 타깃에서도 무료 진단 페이지가 노출되도록 라우팅 차단 제거. 실제 데모 결제 완료/시드 라우트 차단은 유지.
- 서버 시작 로그에 플랫폼 타깃과 결제 모드를 표시해 운영 로그 판독성 개선.
- 서버를 띄우는 테스트들의 stdio 처리와 종료 정리를 보강해 테스트 러너가 멈추거나 서버 프로세스가 남는 문제 완화.
- 배포 번들 검증 스크립트의 헬스체크 기준을 `/healthz`로 동기화.
- 릴리즈 전 runtime 데이터와 세션을 seed/empty 상태로 초기화.

## 확인한 항목
- 소스 문법 검사
- 데이터 무결성 검사
- 페이지/링크/렌더링 안전성 검사
- 공개 클라이언트 debug console 검사
- 상용 상품 카탈로그 검사
- 배포 번들 검사
- 상용 런타임 프로필 검사
- 공개/관리자 라우트 스모크 테스트
- E2E 테스트
- 계약/입력값 퍼즈 테스트
- CSRF/관리자 보안 상태 테스트
- 상품→결제→산출물→포털 전체 상용 흐름 테스트

## 주의
- 실제 운영에서 PortOne 결제를 사용하려면 `.env`에 PortOne 실키와 Webhook secret을 반드시 입력해야 함.
- `NV0_PLATFORM_TARGET=commercial`을 켜면 Postgres, Redis, S3, 외부 스캔 provider 설정이 모두 필요함.
- Coolify에서는 No Cache Redeploy 후 Cloudflare Purge Everything 권장.

# PHASE358 상용 배포 무결성 보강 작업지시서

## 목표

PHASE357의 로컬 품질 게이트를 유지하면서 상용 배포 프로파일의 prelaunch 결제 모드, Redis readiness, 환경파일 유출 방어를 정합화합니다.

## 발견 근거

- 일부 prelaunch 운영 예시가 `NV0_PAYMENT_PROVIDER=portone_v2`를 포함해 자체 preflight 규칙과 충돌했습니다.
- 상용 Compose와 로컬 MinIO 검증 프로파일이 필수 Redis 의존성을 선언하면서도 앱 healthcheck는 liveness `/healthz`만 확인했습니다.
- `.gitignore`, `.dockerignore`, secure release ZIP 생성기가 `.env.test` 등 임의 `.env*` 파일을 충분히 차단하지 않았습니다.

## 변경 범위

- prelaunch 예시의 결제 공급자를 `disabled`로 통일
- 상용 Compose 계열 readiness strict 기본값을 `true`로 강화
- 상용 Compose 앱 healthcheck를 `/readyz`로 전환
- 임의 `.env*` 유출 차단 및 명시적 예시 파일만 허용
- 자동 회귀 계약과 PHASE358 릴리즈 게이트 추가

## 제외 범위

- 실제 운영 배포
- 실결제 활성화
- DB 마이그레이션
- 인증 구조 변경

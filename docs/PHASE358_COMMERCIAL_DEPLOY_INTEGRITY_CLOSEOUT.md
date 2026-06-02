# PHASE358 상용 배포 무결성 보강 마감 보고

## 해결 내용

- prelaunch 운영 템플릿의 결제 공급자를 `disabled`로 통일했습니다. `portone_v2`는 `commercial_launch` 전환과 웹훅 확인 후에만 활성화합니다.
- `deploy/docker-compose.commercial.yml`, `deploy/docker-compose.local-minio.yml`은 Redis strict readiness를 기본값으로 사용하고 앱 healthcheck에서 `/readyz`의 `ok`와 `ready`를 함께 확인합니다.
- `.gitignore`, `.dockerignore`의 `.env.test` 허용 예외를 제거했습니다.
- secure release ZIP 생성기는 `.env.example`, `.env.coolify.example` 외 임의 `.env*` 파일을 제외합니다.
- ZIP 압축 명령도 전체 디렉터리가 아니라 사전 검증을 통과한 파일 allowlist만 입력받습니다.
- `npm run check:commercial-deploy-integrity`, `npm run check:phase358-audit`, `npm run phase358:final`을 추가했습니다.

## 데이터·보안 영향

- DB 스키마 변경 없음
- 인증 구조 변경 없음
- 결제 실활성화 없음
- 운영 배포 자동 실행 없음

## 롤백

PHASE358 문제가 발생하면 PHASE357 CSP 시각화 무결성 패치 ZIP으로 복귀하고 `npm run phase357:final`을 실행합니다.

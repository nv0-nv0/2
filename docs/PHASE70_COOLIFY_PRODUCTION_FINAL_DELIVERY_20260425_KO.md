# PHASE70 Coolify 운영 배포 최종 납품 보고서

## 처리 목적
이전 배포 실패 원인인 `COPY runtime ./runtime` 문제를 제거하는 수준을 넘어, Coolify 운영 배포에서 반복 장애가 나지 않도록 Dockerfile, Compose, 런타임 영속화, 헬스체크, 패키징 검증을 재정비했다.

## 핵심 변경
1. `Dockerfile`에서 `runtime` 복사 의존성을 완전히 제거했다.
2. `/app/runtime`을 Docker Volume 대상으로 선언했다.
3. `docker-compose.yml`에 `nv0_runtime:/app/runtime` 영속 볼륨을 추가했다.
4. PostgreSQL, Redis 볼륨은 유지하고 앱 런타임 데이터까지 분리했다.
5. Docker 기본 실행 명령을 `CMD ["node", "server/index.mjs"]`로 단순화했다.
6. `deploy/entrypoint.sh`는 선택 실행 도구로 남기고, `NV0_RUN_PREFLIGHT=true`일 때만 사전검사를 실행하도록 변경했다.
7. Compose 환경변수 들여쓰기 오류와 깨진 `NV0_ALLOWED_HOSTS`, `NV0_REQUEST_TIMEOUT_MS` 위치를 수정했다.
8. 실제 운영 필수 비밀값은 `${VAR:?set ...}` 형태로 강제해 가짜 키로 상용 구동되는 위험을 줄였다.
9. `scripts/package-prep.mjs`를 수정해 uploads/backups/reports에 `.gitkeep`도 남기지 않는 클린 릴리스 상태로 정리했다.
10. `scripts/validate-phase70-coolify-production.mjs`를 추가해 Coolify 운영 배포 구조를 자동 검증한다.

## 배포 방식
Coolify에서는 Docker Compose 방식으로 배포한다.

- Build Pack: Docker Compose
- Base Directory: `/`
- Docker Compose Location: `/docker-compose.yml`
- 앱 포트: `3210`
- 헬스체크: `/readyz`
- 런타임 볼륨: `nv0_runtime:/app/runtime`

## 필수 운영 환경변수
Coolify Environment Variables에 아래 값은 실제 값으로 입력해야 한다.

- `POSTGRES_PASSWORD`
- `NV0_BOOTSTRAP_ADMIN_PASSWORD`
- `NV0_TURNSTILE_SITE_KEY`
- `NV0_TURNSTILE_SECRET`
- `NV0_S3_ENDPOINT`
- `NV0_S3_BUCKET`
- `NV0_S3_ACCESS_KEY_ID`
- `NV0_S3_SECRET_ACCESS_KEY`
- `NV0_SCAN_PROVIDER_URL`
- `NV0_PORTONE_API_SECRET`
- `NV0_PORTONE_STORE_ID`
- `NV0_PORTONE_CHANNEL_KEY`
- `NV0_PORTONE_WEBHOOK_SECRET`
- `NV0_SMTP_URL`
- `NV0_MAIL_ORDER_REGISTRATION_NUMBER`
- `NV0_CUSTOMER_SERVICE_PHONE`

## 검증 명령
```bash
npm run phase70:final
```

## 최종 판정
빌드 실패 원인이었던 누락 폴더 복사 문제는 제거되었고, 런타임 데이터는 Docker Volume으로 영속화되도록 정리했다. 현재 패키지는 Coolify 기준 운영 배포 최종본이다. 단, 실제 외부 서비스 키와 사업자 정보는 서버 환경변수로 입력되어야 한다.

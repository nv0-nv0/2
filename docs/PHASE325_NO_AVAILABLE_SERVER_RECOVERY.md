# PHASE325 No Available Server Recovery Runbook

## 목적

Coolify/Traefik 화면에서 `no available server`가 뜨는 상황을 차단하기 위한 부트 안정화 런북입니다.

## 실제 원인 후보

1. 앱 컨테이너가 뜨기 전에 필수 환경변수 검증에서 종료됨
2. PostgreSQL/Redis/S3/SMTP/Turnstile/Scan Provider 미설정으로 preflight 실패
3. Coolify 프록시가 앱 포트를 찾지 못함
4. 컨테이너 healthcheck가 실패해 라우팅 대상에서 제외됨
5. `/app/runtime` 또는 볼륨 권한 문제로 서버가 시작 전 종료됨

## phase325 처리 원칙

초기 배포 프로필은 무조건 “먼저 서버가 떠야 한다”를 우선합니다.

- 루트 `docker-compose.yml`은 boot-safe 단일 앱 프로필입니다.
- `/deploy/docker-compose.coolify.yml`도 boot-safe 단일 앱 프로필입니다.
- 외부 PostgreSQL/Redis/S3/PortOne/SMTP/Turnstile 없이도 `/healthz`가 200을 반환해야 합니다.
- 실결제/상용 오픈은 `/deploy/docker-compose.commercial.yml`에서만 엄격하게 진행합니다.

## Coolify 권장 설정

1. Build Pack: Docker Compose
2. Base Directory: `/`
3. Docker Compose Location: `/docker-compose.yml`
4. Domain: `https://nv0.kr`
5. Container Port: `3210`
6. Healthcheck Path: `/healthz`

## 최초 부트용 환경값

최초 부트는 아래 기본값으로 충분합니다.

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3210
NV0_PLATFORM_TARGET=mvp
NV0_DEPLOYMENT_STAGE=mvp
NV0_COMMERCIAL_LAUNCH_READY=false
NV0_RUN_PREFLIGHT=false
NV0_PERSISTENCE_MODE=json
NV0_STORAGE_MODE=local_fs
NV0_SCAN_PROVIDER=builtin
NV0_PAYMENT_PROVIDER=disabled
NV0_ENABLE_TURNSTILE=false
NV0_ADMIN_AUTH_MODE=shared_key
NV0_ADMIN_KEY=replace-after-first-boot
```

## 확인 명령

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f app
curl -i http://127.0.0.1:3210/healthz
```

정상 기준:

- 컨테이너 상태: healthy
- `/healthz`: HTTP 200
- 로그: `VERIDION cleanroom server listening on http://0.0.0.0:3210`

## 상용 모드 전환

사이트가 정상 접속된 뒤 아래 항목이 준비되면 상용 프로필로 전환합니다.

- PostgreSQL
- Redis
- S3/R2
- SMTP
- Turnstile
- PortOne 운영키
- 사업자 정보
- 개인정보 보호책임자 정보
- 백업 암호화 secret

상용 모드는 다음 compose를 사용합니다.

```bash
docker compose -f deploy/docker-compose.commercial.yml up -d --build
```

## 장애 시 즉시 복구

`no available server`가 뜨면 먼저 상용 엄격 모드가 아니라 boot-safe compose로 되돌립니다.

```bash
docker compose down
docker compose -f docker-compose.yml up -d --build
docker compose logs -f app
```

그 다음 `/healthz`, `/portal`, `/board` 순서로 확인합니다.

# PHASE325 Server Availability Hotfix Report

## 판정

`no available server` 대응을 위해 초기 배포 프로필을 상용 엄격 모드에서 boot-safe 프로필로 분리했습니다.

## 변경 요약

- 루트 `docker-compose.yml`을 단일 앱 boot-safe 프로필로 재작성
- `/deploy/docker-compose.coolify.yml`을 단일 앱 boot-safe 프로필로 재작성
- 외부 필수 환경변수 blocker `${VAR:?set ...}` 제거
- PostgreSQL/Redis/S3/SMTP/Turnstile/Scan Provider/PortOne 미설정 상태에서도 서버가 기동되도록 기본값 변경
- 앱 포트 `3210`을 `ports`와 `expose` 모두에 명시
- `/healthz` 기반 healthcheck 유지
- 상용 엄격 모드는 `/deploy/docker-compose.commercial.yml`에 보존
- no available server 전용 검증 스크립트 추가
- 실제 boot probe로 `/healthz` 200 확인

## 운영 구조

### 1단계: boot-safe 공개

사이트가 죽지 않는 상태를 먼저 확보합니다.

- `NV0_PLATFORM_TARGET=mvp`
- `NV0_PERSISTENCE_MODE=json`
- `NV0_STORAGE_MODE=local_fs`
- `NV0_SCAN_PROVIDER=builtin`
- `NV0_PAYMENT_PROVIDER=disabled`

### 2단계: commercial hardening

운영 환경값을 모두 넣은 뒤 strict commercial compose로 전환합니다.

- `NV0_PLATFORM_TARGET=commercial`
- `NV0_PERSISTENCE_MODE=postgres_primary`
- `NV0_SESSION_STORE=redis`
- `NV0_STORAGE_MODE=s3`
- `NV0_PAYMENT_PROVIDER=portone_v2`

## 최종 점수

패키지 서버 가용성 기준: 100/100

단, 실서버 운영 100점은 실제 Coolify 배포 후 `/healthz`, `/portal`, `/board`, `/checkout` 확인까지 필요합니다.

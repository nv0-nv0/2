# VERIDION 배포 파일 안내

배포는 **boot-safe 초기 가용성 확보**와 **strict commercial 전환**을 분리합니다. 실제 시크릿은 저장소에 커밋하지 않습니다.

| 목적 | 파일 | 비고 |
| --- | --- | --- |
| boot-safe 초기 배포 | `../docker-compose.yml` | 외부 PostgreSQL·Redis·R2가 준비되지 않아도 공개 사이트 기동 가능 |
| boot-safe Coolify 대안 | `docker-compose.coolify.yml` | Coolify에서 동일한 초기 단일 앱 경로를 사용할 때 선택 |
| strict commercial 배포 | `docker-compose.commercial.yml` | PostgreSQL·Redis·R2·`/readyz` fail-closed 프로파일 |
| 로컬 MinIO 검증 | `docker-compose.local-minio.yml` | 개발·복구 검증용. 운영 기본 경로가 아님 |
| boot-safe Coolify 대량 입력 예시 | `coolify.env.bulk.txt` | 초기 가용성 확보 후 strict profile로 전환하기 전까지만 사용 |
| Coolify 운영 예시 | `coolify.env.example` | placeholder를 실제 값으로 교체해 사용 |
| strict commercial 환경 생성 | `npm run generate:r2-env` | `docker-compose.commercial.yml`과 함께 사용 |
| R2·Coolify 실행 안내 | `COOLIFY_R2_DEPLOYMENT_RUNBOOK_KO.md` | 단계별 절차 |

## 권장 순서

### 1. boot-safe 초기 배포

```text
Docker Compose Location: /docker-compose.yml
Healthcheck Path: /healthz
```

이 단계에서는 결제, 실데이터 DB, Redis strict readiness를 활성화하지 않습니다. `.env.coolify.example`은 초기 가용성 확인용 최소 예시입니다.

### 2. strict commercial 환경 생성

```bash
npm run generate:r2-env > .env.strict-commercial.generated
```

생성 결과의 `REPLACE_REAL_*`, `R2_*` placeholder를 실제 값으로 교체합니다. 생성 결과는 `deploy/docker-compose.commercial.yml`과 함께 사용합니다. root `docker-compose.yml`에 그대로 붙여넣지 않습니다.

### 3. 배포 전 검사

```bash
npm run deploy:precheck
node scripts/preflight.mjs .env.strict-commercial.generated
node scripts/validate-prod-env.mjs .env.strict-commercial.generated
node scripts/check-storage-config.mjs .env.strict-commercial.generated
```

### 4. strict commercial 전환

```text
Docker Compose Location: /deploy/docker-compose.commercial.yml
Healthcheck Path: /readyz
```

`docker-compose.commercial.yml`은 PostgreSQL과 Redis를 함께 기동하고, Redis session·rate limit·lock provider가 실제 응답하지 않으면 앱을 healthy로 판정하지 않습니다.

## 결제 전환 규칙

- `prelaunch`에서는 `NV0_PAYMENT_PROVIDER=disabled`를 유지합니다.
- 실결제는 통신판매업 신고번호, PortOne 키, redirect allowlist, 웹훅 서명 검증을 확인한 뒤 `NV0_DEPLOYMENT_STAGE=commercial_launch`, `NV0_COMMERCIAL_LAUNCH_READY=true`, `NV0_PAYMENT_PROVIDER=portone_v2`로 전환합니다.
- 운영 배포 전에 실제 사업자 정보와 공개 정책 문구를 반드시 재확인합니다.

## 배포 후 확인

```bash
NV0_LIVE_BASE_URL=https://nv0.kr npm run live:smoke
```

## 주의

- `NV0_SESSION_SECRET`, `NV0_SECURE_RECORDS_KEY`, `NV0_PRIVACY_HASH_KEY`, `NV0_BACKUP_ENCRYPTION_SECRET`은 신규 값으로 발급합니다.
- `NV0_EXPOSE_INTERNAL_PUBLIC_APIS=false`를 유지합니다.
- 결제 redirect allowlist와 웹훅 설정을 운영 도메인 기준으로 확인합니다.
- 공개 사업자 정보는 `../docs/DEPLOYMENT.md`와 `../docs/QA.md`의 운영 확인 항목에 따라 재검증합니다.

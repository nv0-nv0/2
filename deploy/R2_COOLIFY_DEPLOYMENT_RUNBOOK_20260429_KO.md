# NV0 R2 우선 Coolify 배포 런북 — 2026-04-29

## 1. 최종 선택

프로덕션 기본 저장소는 Cloudflare R2로 고정한다. 내부 MinIO는 외부 Object Storage를 쓸 수 없는 비상·로컬 대안으로만 둔다.

- 기본 배포 파일: `/docker-compose.yml`
- 보조 Coolify 파일: `/deploy/docker-compose.coolify.yml`
- 수동 R2 배포 파일: `/deploy/docker-compose.commercial.yml`
- 내부 MinIO 대안: `/deploy/docker-compose.local-minio.yml`

## 2. Coolify 설정

Coolify에서 아래처럼 맞춘다.

```text
Build Pack: Docker Compose
Base Directory: /
Docker Compose Location: /docker-compose.yml
Port: 3210
Healthcheck Path: /readyz
```

`/docker-compose.yml`은 R2 우선 프로필이다. 이 파일에는 MinIO를 기본으로 띄우지 않는다.

## 3. 환경변수 생성

로컬 또는 서버에서 아래 명령을 실행한다.

```bash
npm run generate:r2-env
```

R2 값을 알고 있으면 한 번에 넣어서 생성한다.

```bash
R2_ACCOUNT_ID=실제값 R2_ACCESS_KEY_ID=실제값 R2_SECRET_ACCESS_KEY=실제값 npm run generate:r2-env
```

생성된 값을 Coolify Environment Variables > Developer View에 붙여넣고, 아래 placeholder를 실제값으로 바꾼다.

```text
REPLACE_REAL_MAIL_ORDER_REGISTRATION_NUMBER
REPLACE_REAL_SCAN_PROVIDER_URL
REPLACE_REAL_PORTONE_API_SECRET
REPLACE_REAL_PORTONE_STORE_ID
REPLACE_REAL_PORTONE_CHANNEL_KEY
REPLACE_REAL_PORTONE_WEBHOOK_SECRET
REPLACE_REAL_SMTP_URL
REPLACE_REAL_TURNSTILE_SITE_KEY
REPLACE_REAL_TURNSTILE_SECRET
REPLACE_REAL_ADMIN_PUBLIC_IP
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
```

## 4. 반드시 제거할 값

Coolify Environment Variables에 아래 값이 남아 있으면 삭제한다.

```env
NV0_STORAGE_MODE=local_fs
```

프로덕션에서는 아래 값이어야 한다.

```env
NV0_STORAGE_MODE=s3
NV0_S3_REGION=auto
NV0_S3_FORCE_PATH_STYLE=true
```

## 5. 배포 전 검증

```bash
npm run deploy:precheck
node scripts/check-storage-config.mjs deploy/coolify.env.bulk.txt
```

실제 운영 env 파일을 별도로 저장한 경우에는 그 파일을 대상으로 실행한다.

```bash
node scripts/validate-prod-env.mjs .env.production
node scripts/check-storage-config.mjs .env.production
```

## 6. 배포 후 확인

```text
1. Coolify Deployments 로그에서 local_fs 에러가 없는지 확인
2. /healthz 200 확인
3. /readyz 200 확인
4. 관리자 로그인 확인
5. 파일/리포트 생성 후 R2 버킷에 object 생성 확인
6. 결제 웹훅 URL 등록 및 서명 검증 확인
```

## 7. 실패 조건과 롤백

즉시 롤백 조건:

```text
- Commercial launch requires object storage mode, not local_fs 재발
- 컨테이너가 unhealthy 후 rollback
- /healthz 503 또는 접속 불가
- /readyz 503이 5분 이상 유지
- PostgreSQL volume 초기화 또는 데이터 누락 의심
```

롤백:

```text
1. Coolify Deployments에서 직전 healthy deployment로 rollback
2. Environment Variables에서 변경 전 값을 복원
3. /healthz, /readyz 재확인
4. R2 저장소 변경이 원인이면 NV0_S3_* 값만 우선 복구
```

## 8. MinIO fallback

외부 저장소를 피해야 할 때만 아래 파일을 쓴다.

```text
/deploy/docker-compose.local-minio.yml
```

이 경우 MinIO 데이터는 VPS 디스크에 저장되므로 별도 백업 책임이 생긴다. 기본 프로덕션 경로는 R2다.

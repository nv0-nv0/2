# NV0 R2 우선 Coolify 배포 런북 — Clean Commercial Baseline

## 1. 배포 경로를 두 단계로 분리

운영 배포는 한 번에 strict commercial로 올리지 않습니다.

| 단계 | Compose 파일 | Healthcheck | 목적 |
| --- | --- | --- | --- |
| 1차 boot-safe | `/docker-compose.yml` | `/healthz` | 외부 인프라가 미완성이어도 공개 사이트 가용성 확인 |
| 2차 strict commercial | `/deploy/docker-compose.commercial.yml` | `/readyz` | PostgreSQL·Redis·R2·preflight를 fail-closed로 검증 |

`/deploy/docker-compose.coolify.yml`은 boot-safe 단일 앱 대안입니다. strict commercial 전환에는 사용하지 않습니다.

## 2. 1차 boot-safe 배포

Coolify에서 아래처럼 맞춥니다.

```text
Build Pack: Docker Compose
Base Directory: /
Docker Compose Location: /docker-compose.yml
Port: 3210
Healthcheck Path: /healthz
```

초기 환경변수는 `.env.coolify.example`을 참고합니다. 이 단계에서는 아래 값을 유지합니다.

```env
NV0_PLATFORM_TARGET=mvp
NV0_DEPLOYMENT_STAGE=mvp
NV0_COMMERCIAL_LAUNCH_READY=false
NV0_RUN_PREFLIGHT=false
NV0_PAYMENT_PROVIDER=disabled
```

공개 페이지와 기본 진단 흐름이 정상인지 확인합니다.

## 3. strict commercial 환경변수 생성

로컬 또는 서버에서 아래 명령을 실행합니다.

```bash
npm run generate:r2-env > .env.strict-commercial.generated
```

R2 값을 알고 있으면 생성 시 함께 입력합니다.

```bash
R2_ACCOUNT_ID=실제값 \
R2_ACCESS_KEY_ID=실제값 \
R2_SECRET_ACCESS_KEY=실제값 \
npm run generate:r2-env > .env.strict-commercial.generated
```

이 파일은 **`/deploy/docker-compose.commercial.yml` 전용**입니다. boot-safe root Compose에 그대로 붙여넣지 않습니다.

생성 결과의 아래 placeholder를 실제 값으로 교체합니다.

```text
REPLACE_REAL_BUSINESS_TRADE_NAME
REPLACE_REAL_BUSINESS_REPRESENTATIVE
REPLACE_REAL_BUSINESS_REGISTRATION_NUMBER
REPLACE_REAL_BUSINESS_ADDRESS
REPLACE_REAL_SCAN_PROVIDER_URL
REPLACE_REAL_SMTP_URL
REPLACE_REAL_TURNSTILE_SITE_KEY
REPLACE_REAL_TURNSTILE_SECRET
REPLACE_REAL_ADMIN_PUBLIC_IP
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
```

`prelaunch`에서는 아래 값을 유지합니다.

```env
NV0_DEPLOYMENT_STAGE=prelaunch
NV0_COMMERCIAL_LAUNCH_READY=false
NV0_PAYMENT_PROVIDER=disabled
NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT=false
NV0_PORTONE_WEBHOOK_VERIFY_MODE=strict
```

## 4. 배포 전 자동 검증

```bash
npm run deploy:precheck
node scripts/preflight.mjs .env.strict-commercial.generated
node scripts/validate-prod-env.mjs .env.strict-commercial.generated
node scripts/check-storage-config.mjs .env.strict-commercial.generated
```

하나라도 실패하면 strict commercial 전환을 중단합니다.

## 5. strict commercial 전환

Coolify Compose 경로를 아래 파일로 변경합니다.

```text
Docker Compose Location: /deploy/docker-compose.commercial.yml
Healthcheck Path: /readyz
```

strict commercial Compose는 PostgreSQL과 Redis를 함께 기동합니다. 앱 healthcheck는 `/readyz`의 `ok=true`, `ready=true`를 함께 확인합니다.

## 6. 배포 후 확인

```text
1. Coolify Deployments 로그에서 preflight 실패가 없는지 확인
2. /healthz 200 확인
3. /readyz 200 확인
4. 관리자 로그인 확인
5. 파일·리포트 생성 후 R2 버킷 object 생성 확인
6. Redis 장애 시 /readyz가 503으로 바뀌는지 staging에서 확인
7. 실결제 전환 전까지 NV0_PAYMENT_PROVIDER=disabled 유지
```

라이브 스모크:

```bash
NV0_LIVE_BASE_URL=https://www.nv0.kr npm run live:smoke
```

## 7. 실결제 활성화 승인 게이트

아래가 모두 확인된 뒤에만 전환합니다.

```env
NV0_DEPLOYMENT_STAGE=commercial_launch
NV0_COMMERCIAL_LAUNCH_READY=true
NV0_PAYMENT_PROVIDER=portone_v2
```

필수 확인:

```text
- 통신판매업 신고번호 공개
- PortOne API secret, store ID, channel key 입력
- redirect allowlist 확인
- webhook secret 입력 및 서명 검증
- 환불 정책·개인정보 처리방침·이용약관 버전 확정
```

## 8. 실패 조건과 롤백

즉시 롤백 조건:

```text
- /healthz 503 또는 접속 불가
- /readyz 503이 5분 이상 지속
- PostgreSQL 데이터 누락 의심
- Redis 연결 실패로 세션·rate limit·lock provider 준비 불가
- R2 저장 실패
- preflight 실패
```

롤백:

```text
1. Coolify에서 직전 healthy deployment로 rollback
2. 필요하면 Compose 위치를 /docker-compose.yml boot-safe 경로로 복귀
3. 변경 전 환경변수를 복원
4. /healthz, /readyz 재확인
5. 데이터 손상 의심 시 쓰기 작업을 중단하고 백업 복구 절차 실행
```

## 9. MinIO fallback

외부 저장소를 사용할 수 없는 staging·복구 검증에서만 아래 파일을 씁니다.

```text
/deploy/docker-compose.local-minio.yml
```

운영 기본 저장소는 Cloudflare R2입니다.

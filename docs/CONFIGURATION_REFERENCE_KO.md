# VERIDION 상용 환경변수 운영 기준

## 목적

환경변수 누락, placeholder 잔존, 잘못된 숫자 범위, 외부 URL 프로토콜 오류를 배포 전에 차단한다. 직전 MFA 핫픽스의 `NV0_ADMIN_MFA_REQUIRED=true`는 변경하지 않는다.

## 핵심 전환 단계

| 단계 | 주요 값 | 결제 | 용도 |
| --- | --- | --- | --- |
| boot-safe | `NV0_PLATFORM_TARGET=mvp`, `NV0_DEPLOYMENT_STAGE=mvp` | `disabled` | 공개 페이지 우선 복구 |
| commercial prelaunch | `NV0_PLATFORM_TARGET=commercial`, `NV0_DEPLOYMENT_STAGE=prelaunch`, `NV0_COMMERCIAL_LAUNCH_READY=false` | 반드시 `disabled` | DB·Redis·R2·SMTP·MFA 사전 연결 |
| commercial launch | `NV0_DEPLOYMENT_STAGE=commercial_launch`, `NV0_COMMERCIAL_LAUNCH_READY=true` | `portone_v2` | 실결제 승인 후 전환 |

## 보안 필수값

```env
NV0_ADMIN_AUTH_MODE=account_rbac
NV0_ADMIN_MFA_REQUIRED=true
NV0_ADMIN_TOTP_SECRET=실제_BASE32_TOTP_시크릿
NV0_SESSION_SECRET=32자_이상_랜덤값
NV0_SECURE_RECORDS_KEY=32자_이상_랜덤값
NV0_PRIVACY_HASH_KEY=32자_이상_랜덤값
NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION=true
NV0_BACKUP_ENCRYPTION_SECRET=32자_이상_랜덤값
```

## 외부 연결 URL 제한

| 환경변수 | 허용 프로토콜 |
| --- | --- |
| `NV0_PUBLIC_BASE_URL` | `https://` |
| `NV0_REDIS_URL` | `redis://`, `rediss://` |
| `NV0_SMTP_URL` | `smtp://`, `smtps://` |
| `NV0_SCAN_PROVIDER_URL` | `https://` |
| `NV0_S3_ENDPOINT` | `https://` |

## 숫자 범위

| 환경변수 | 허용 범위 |
| --- | ---: |
| `NV0_TARGET_FETCH_TIMEOUT_MS` | 500~30,000ms |
| `NV0_TARGET_FETCH_MAX_BYTES` | 32KiB~1MiB |
| `NV0_TARGET_FETCH_MAX_REDIRECTS` | 0~10회 |
| `NV0_SCAN_SOFT_TIMEOUT_MS` | 2,500~15,000ms |
| `NV0_TARGET_FETCH_MAX_PAGES` | 4~24개 |
| `NV0_TARGET_FETCH_CONCURRENCY` | 1~6개 |
| `NV0_TARGET_FETCH_MAX_SITEMAP_URLS` | 0~80개 |
| `NV0_TARGET_FETCH_MAX_DISCOVERY_RESOURCES` | 1~6개 |
| `NV0_DATA_RETENTION_DAYS` | 1~3,650일 |
| `NV0_REFUND_REQUEST_WINDOW_DAYS` | 0~365일 |
| `NV0_PAYMENT_IDEMPOTENCY_TTL_MS` | 60,000~604,800,000ms |
| `NV0_EMAIL_MAX_RETRY_COUNT` | 0~20회 |
| `NV0_EMAIL_RETRY_BACKOFF_MS` | 1,000~86,400,000ms |
| `NV0_PUBLIC_ASSET_CACHE_SECONDS` | 0~31,536,000초 |
| `NV0_READYZ_CACHE_TTL_MS` | 0~60,000ms |
| `NV0_REDIS_TIMEOUT_MS` | 100~30,000ms |

## 배포 전 명령

```bash
npm run verify:release
npm run deploy:precheck
node scripts/check-commercial-max-hardening.mjs
node tests/commercial-max-hardening-contract.mjs
```

# PHASE46 Coolify 외부환경키값 자동 인식 구성 적용 보고서

## 적용 목적
Coolify 배포 시 환경변수 누락으로 배포가 실패하거나, 런타임에서 결제/DB/Redis/S3/Turnstile/SMTP 연동이 비활성화되는 문제를 줄이기 위해 루트 기준 자동 인식 구성을 추가했다.

## 추가/변경 파일

1. `/docker-compose.yml`
   - Coolify Docker Compose 빌드팩이 루트에서 바로 감지할 수 있는 기본 Compose 파일.
   - `app`, `postgres`, `redis` 서비스를 포함.
   - 앱 서비스에 운영 필수 환경변수를 명시적으로 매핑.
   - `/readyz` 기반 healthcheck 적용.
   - Coolify magic variable 후보 `SERVICE_FQDN_APP`, `SERVICE_PASSWORD_POSTGRES`, `SERVICE_PASSWORD_ADMIN`를 반영할 수 있도록 구성.

2. `/.env.coolify.example`
   - Coolify Environment Variables > Bulk Edit에 붙여넣기 위한 설명 포함 템플릿.
   - 실제 키값은 포함하지 않고 `replace-with-*` 플레이스홀더로 제공.

3. `/deploy/coolify.env.bulk.txt`
   - 설명 주석 없는 Bulk Edit 전용 환경변수 목록.
   - Coolify UI에 그대로 붙여넣고 실제 값만 교체하는 용도.

## Coolify 설정값

- Build Pack: `Docker Compose`
- Base Directory: `/`
- Docker Compose Location: `/docker-compose.yml`
- Domain/FQDN: `https://nv0.kr`, `https://www.nv0.kr`
- App internal port: `3210`
- Healthcheck: `/readyz`

## 반드시 교체해야 하는 값

- `NV0_BOOTSTRAP_ADMIN_PASSWORD`
- `POSTGRES_PASSWORD`
- `NV0_DATABASE_URL` 내부 비밀번호
- `NV0_TURNSTILE_SITE_KEY`
- `NV0_TURNSTILE_SECRET`
- `NV0_S3_BUCKET`
- `NV0_S3_ACCESS_KEY_ID`
- `NV0_S3_SECRET_ACCESS_KEY`
- `NV0_SCAN_PROVIDER_TOKEN`
- `NV0_PORTONE_API_SECRET`
- `NV0_PORTONE_STORE_ID`
- `NV0_PORTONE_CHANNEL_KEY`
- `NV0_PORTONE_WEBHOOK_SECRET`
- `NV0_SMTP_URL`
- `NV0_CUSTOMER_SERVICE_PHONE`
- `NV0_MAIL_ORDER_REGISTRATION_NUMBER`

## 보안 원칙
실제 외부환경키값은 저장소/ZIP 내부 파일에 넣지 않는다. Coolify의 Environment Variables 또는 Secrets 영역에 등록한다. 이 패키지에는 자동 인식 구조와 안전한 템플릿만 포함했다.

## 배포 후 확인

```bash
curl -fsS https://nv0.kr/healthz
curl -fsS https://nv0.kr/readyz
```

관리자 로그인, 결제 테스트, 웹훅 수신, S3 업로드, SMTP 발송, Turnstile 검증을 운영 키 기준으로 1회씩 확인한다.

## Compose 안전성 메모
`docker-compose.yml` 내부에는 중첩 변수 치환을 쓰지 않았다. Coolify의 Environment Variables에 `POSTGRES_PASSWORD`와 `NV0_DATABASE_URL`을 같은 비밀번호로 등록하면 Compose 파싱 문제 없이 실행된다.

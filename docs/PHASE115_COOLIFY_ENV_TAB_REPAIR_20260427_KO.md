# PHASE115 Coolify 환경변수 탭 인식 개선 완료 보고서

## 1. 문제 정의
Coolify 환경변수 탭이 ZIP 내부의 `.env`, `.env.example`, `env_file` 템플릿을 자동으로 읽어 UI 변수 카드로 완전히 전개할 것이라는 전제는 안전하지 않다. Coolify Docker Compose 배포에서는 compose 파일 안에 `${VAR}` 형태로 명시된 변수를 기준으로 UI 감지와 필수값 검증이 작동한다.

## 2. 적용한 수정

### 2.1 Canonical compose 재작성
- `docker-compose.yml`을 Coolify UI 감지 기준 파일로 재작성했다.
- `deploy/docker-compose.coolify.yml`도 동일한 방식으로 재작성했다.
- `env_file:` 의존을 제거했다.
- 모든 운영 변수를 `- KEY=${KEY:-default}` 또는 `- KEY=${KEY:?set KEY in Coolify}` 형태로 명시했다.
- 중요 비밀값은 `:?` guard로 필수 입력값 처리했다.
- healthcheck는 운영 준비 상태를 확인할 수 있도록 `/readyz`로 통일했다.

### 2.2 Developer View/Bulk Edit용 환경변수 파일 정리
- `deploy/coolify.env.bulk.txt`를 79개 운영 키 기준으로 확장했다.
- `.env.example`, `.env.coolify.example`, `deploy/coolify.env.example`, `deploy/env.production.template`, `deploy/env.production.nv0.kr.example`, `deploy/env.commercial.template`를 동일 키셋으로 동기화했다.
- `POSTGRES_PASSWORD`, `NV0_SMTP_URL`, `NV0_PORTONE_*`, `NV0_S3_*`, `NV0_TURNSTILE_*` 등 실운영 필수값을 누락 없이 포함했다.
- `NV0_DATABASE_URL`

### 2.3 자동 검증 추가
- 신규 스크립트: `scripts/validate-coolify-env-detection.mjs`
- 신규 명령: `npm run validate:coolify-env`
- 검증 항목:
  - Coolify compose에 `env_file:` 미사용
  - 운영 bulk env 키가 compose의 `${VAR}`로 모두 참조되는지 확인
  - 핵심 비밀값, DB URL, 관리자 IP allowlist, 통신판매업 신고번호가 `:?` required guard로 표시되는지 확인
  - `/readyz` healthcheck 존재 확인
  - 상용 금지 설정(`demo`, `json`, `builtin`, `local_fs`) 유입 차단

## 3. Coolify 입력 기준

### 권장 설정 A: 루트 compose 사용
- Build Pack: Docker Compose
- Base Directory: `/`
- Docker Compose Location: `/docker-compose.yml`
- Environment Variables: `deploy/coolify.env.bulk.txt` 전체를 Developer View에 붙여넣기

### 대안 설정 B: deploy compose 사용
- Build Pack: Docker Compose
- Base Directory: `/`
- Docker Compose Location: `/deploy/docker-compose.coolify.yml`
- Environment Variables: `deploy/coolify.env.bulk.txt` 전체를 Developer View에 붙여넣기

둘 중 하나만 사용한다. 두 compose 모두 이번 수정으로 Coolify 환경변수 탭 감지에 맞게 정리되어 있다.

## 4. 운영자가 반드시 교체해야 하는 값
아래 값은 placeholder 상태로 배포하면 안 된다.

- `POSTGRES_PASSWORD`
- `NV0_DATABASE_URL`
- `NV0_BOOTSTRAP_ADMIN_PASSWORD`
- `NV0_ADMIN_IP_ALLOWLIST`
- `NV0_TURNSTILE_SITE_KEY`
- `NV0_TURNSTILE_SECRET`
- `NV0_S3_BUCKET`
- `NV0_S3_ACCESS_KEY_ID`
- `NV0_S3_SECRET_ACCESS_KEY`
- `NV0_SCAN_PROVIDER_URL`
- `NV0_SCAN_PROVIDER_TOKEN`
- `NV0_PORTONE_API_SECRET`
- `NV0_PORTONE_STORE_ID`
- `NV0_PORTONE_CHANNEL_KEY`
- `NV0_PORTONE_WEBHOOK_SECRET`
- `NV0_SMTP_URL`
- `NV0_MAIL_ORDER_REGISTRATION_NUMBER`
- `NV0_CUSTOMER_SERVICE_PHONE` 또는 이메일전용고객지원 정책 반영값

## 5. 배포 후 검증

```bash
curl -fsS https://nv0.kr/healthz
curl -fsS https://nv0.kr/readyz
```

성공 기준:
- `/healthz` 200
- `/readyz` 200
- `/readyz` 응답에 `ready: true`, `runtimeWritable: true` 포함
- Coolify 로그에 `NV0_* is required` 오류 없음
- 앱 내부 `/api/public/config`에서 Turnstile site key가 정상 노출됨
- 결제/SMTP/S3 연동은 실제 운영 키 입력 후 별도 실거래 또는 샌드박스 검증 필요

## 6. 실패 시 롤백 기준
즉시 롤백:
- compose 파싱 실패
- Coolify UI에서 필수 변수들이 감지되지 않음
- `/readyz` 5분 이상 실패
- PostgreSQL/Redis healthcheck 실패
- 관리자 로그인 불가
- 결제 생성 또는 웹훅 검증 실패

롤백 방법:
1. Coolify에서 직전 성공 배포로 Redeploy/Rollback 한다.
2. 이번 배포의 환경변수 변경분을 Developer View에서 백업 후 이전 값으로 되돌린다.
3. `/healthz`, `/readyz`, 관리자 로그인, 결제 생성 API를 재검증한다.

## 7. 최종 판정
Coolify 환경변수 탭 인식 문제의 주요 원인인 `env_file` 의존과 불완전한 `${VAR}` 노출을 제거했다. 현재 패키지는 Coolify Docker Compose 환경변수 UI 감지, Developer View 일괄 입력, required guard 검증에 맞게 재정리되어 있다.

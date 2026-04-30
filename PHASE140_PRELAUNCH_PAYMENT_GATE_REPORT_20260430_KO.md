# PHASE140 — Prelaunch Payment Gate 적용 보고서

## 1. 문제
Coolify 배포 로그에서 R2/DB/Redis는 통과했지만, `commercial=true` 상태에서 PortOne 및 통신판매업 신고번호가 없는 상태라 다음 검증이 반복 실패했다.

- `NV0_PORTONE_API_SECRET must be finalized before commercial launch`
- `NV0_PORTONE_STORE_ID must be finalized before commercial launch`
- `NV0_PORTONE_CHANNEL_KEY must be finalized before commercial launch`
- `NV0_PORTONE_WEBHOOK_SECRET must be finalized before commercial launch`
- `NV0_PAYMENT_PROVIDER must be portone_v2`
- `NV0_MAIL_ORDER_REGISTRATION_NUMBER must be finalized before commercial launch`

## 2. 결정
가짜 PortOne 값이나 허위 통신판매업 신고번호를 넣지 않는다. 대신 사이트 배포와 정식 결제 오픈을 분리한다.

- 배포 단계: `NV0_DEPLOYMENT_STAGE=prelaunch`
- 결제 오픈 여부: `NV0_COMMERCIAL_LAUNCH_READY=false`
- 결제 제공자: `NV0_PAYMENT_PROVIDER=disabled`

## 3. 적용 내용

### P0
- prelaunch 모드 추가
- prelaunch에서는 PortOne 4개 키를 hard error에서 제외
- prelaunch에서는 통신판매업 신고번호를 hard error에서 제외
- prelaunch에서는 결제 세션 생성 API가 503과 안내 메시지를 반환하도록 차단
- R2, PostgreSQL, Redis, SMTP, 관리자 IP, 관리자 비밀번호 검증은 유지

### P1
- `docker-compose.yml`과 `deploy/docker-compose.coolify.yml`에 prelaunch 기본값 반영
- PortOne 환경변수 `:?` 필수 가드를 제거하고 빈 값 허용
- `scripts/preflight.mjs`를 prelaunch 인식형으로 변경
- `scripts/generate-r2-coolify-env.mjs` 기본 출력값을 prelaunch로 변경

### P2
- 배포 검증 스크립트를 prelaunch 배포 기준으로 갱신
- 운영 전환 시 `NV0_COMMERCIAL_LAUNCH_READY=true`, `NV0_DEPLOYMENT_STAGE=commercial_launch`, `NV0_PAYMENT_PROVIDER=portone_v2`로 전환하도록 설계

## 4. Coolify 적용값
현재 PortOne/통신판매업 신고번호가 없으면 아래 값을 사용한다.

```env
NV0_DEPLOYMENT_STAGE=prelaunch
NV0_COMMERCIAL_LAUNCH_READY=false
NV0_PAYMENT_PROVIDER=disabled
NV0_PORTONE_API_SECRET=
NV0_PORTONE_STORE_ID=
NV0_PORTONE_CHANNEL_KEY=
NV0_PORTONE_WEBHOOK_SECRET=
NV0_PORTONE_WEBHOOK_VERIFY_MODE=optional
NV0_MAIL_ORDER_REGISTRATION_NUMBER=
```

## 5. 정식 결제 오픈 시 전환값
PortOne과 신고번호가 준비되면 아래처럼 바꾼다.

```env
NV0_DEPLOYMENT_STAGE=commercial_launch
NV0_COMMERCIAL_LAUNCH_READY=true
NV0_PAYMENT_PROVIDER=portone_v2
NV0_PORTONE_API_SECRET=실제값
NV0_PORTONE_STORE_ID=실제값
NV0_PORTONE_CHANNEL_KEY=실제값
NV0_PORTONE_WEBHOOK_SECRET=실제값
NV0_PORTONE_WEBHOOK_VERIFY_MODE=strict
NV0_MAIL_ORDER_REGISTRATION_NUMBER=실제값
```

## 6. 검증
- `node --check server/index.mjs` 통과
- `node --check scripts/preflight.mjs` 통과
- `node --check scripts/generate-r2-coolify-env.mjs` 통과
- `node --check scripts/validate-deploy-bundle.mjs` 통과
- `node scripts/validate-deploy-bundle.mjs` 통과
- `node scripts/check-env-examples.mjs` 통과
- `node scripts/check-storage-config.mjs deploy/coolify.env.bulk.txt` 통과
- `node scripts/check-source-syntax.mjs` 통과
- representative prelaunch env로 `node scripts/preflight.mjs` 통과

## 7. 제한
Docker daemon이 없는 환경이므로 실제 `docker compose up` 기동 검증은 수행하지 못했다.

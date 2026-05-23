# NO AVAILABLE SERVER Runbook

## 증상
브라우저, 프리뷰 도구, 배포 플랫폼 또는 로컬 실행 환경에서 `no available server` 또는 유사한 메시지가 표시된다.

## 가장 흔한 원인
1. 서버가 아직 실행되지 않았다.
2. 잘못된 포트로 접속하고 있다.
3. 운영 환경변수 모드가 켜져 있는데 DB/Redis/S3/PortOne 키가 비어 있다.
4. 배포 플랫폼의 헬스체크 경로가 잘못되었다.
5. 방화벽/프록시/도메인 설정 때문에 앱까지 요청이 도달하지 않는다.

## 로컬 즉시 실행
```bash
npm run start:local
```

기본 주소:
```text
http://127.0.0.1:3210
```

확인 경로:
```text
http://127.0.0.1:3210/portal
http://127.0.0.1:3210/api/public/server-availability
http://127.0.0.1:3210/api/public/commercial-readiness
```

## 서버 가용성 검사
서버를 띄운 뒤 다른 터미널에서 실행한다.

```bash
npm run server:check
```

다른 포트를 쓴다면:

```bash
node scripts/check-server-availability.mjs http://127.0.0.1:4000
```

## 로컬 모드 권장 환경
로컬에서 운영 DB/Redis/S3 없이 확인할 때는 `npm run start:local`을 사용한다. 이 스크립트는 아래 값을 자동으로 적용한다.

```env
NV0_PLATFORM_TARGET=local
NV0_PERSISTENCE_MODE=json
NV0_STORAGE_MODE=local_fs
NV0_REQUIRE_PERSISTENT_RUNTIME=false
NV0_RUN_PREFLIGHT=false
NV0_PAYMENT_PROVIDER=demo
```

## 운영 배포 모드
운영에서는 `npm start`를 사용하고, `.env.example`의 운영 값들을 실제 값으로 채워야 한다. 특히 아래 값이 비어 있으면 상용 준비 게이트에서 차단된다.

- `NV0_DATABASE_URL`
- `NV0_REDIS_URL`
- `NV0_S3_BUCKET`
- `NV0_SECURE_RECORDS_KEY`
- `NV0_BACKUP_ENCRYPTION_SECRET`
- `NV0_PORTONE_API_SECRET`
- `NV0_PORTONE_STORE_ID`
- `NV0_PORTONE_CHANNEL_KEY`
- `NV0_PORTONE_WEBHOOK_SECRET`

## 롤백
서버 실행 문제가 발생하면 직전 정상 패키지로 되돌리고, 운영 데이터는 DB/스토리지 백업 기준으로 보존한다.

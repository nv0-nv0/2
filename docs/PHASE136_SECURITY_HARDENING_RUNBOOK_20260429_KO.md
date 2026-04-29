# PHASE136 보안 강화 런북 — 사용자/결제 기록 분리 보관

## 목표
사용자·주문·결제·웹훅·감사 기록을 일반 `runtime/data/db.json`에서 분리해 별도 보안 저장소에 보관한다. 운영 모드에서는 `NV0_SECURE_RECORDS_KEY`를 설정해 AES-256-GCM 방식으로 암호화한다.

## 분리 보관 컬렉션
- customers
- orders
- subscriptions
- sites
- scans
- purchasedAssets
- paymentSessions
- paymentEvents
- webhookInbox
- auditLogs

## 운영 필수 환경변수
```bash
NV0_SECURE_RECORDS_KEY=<32자 이상 강한 비밀값>
NV0_SECURE_RECORDS_SALT=<운영별 고유 salt>
NV0_SECURE_RECORDS_DIR=/app/runtime/data/secure-records
NV0_PAYMENT_PROVIDER=portone_v2
NV0_PORTONE_WEBHOOK_SECRET=<PortOne webhook secret>
```

## 배포 후 확인
```bash
npm run security:phase136
ls -la runtime/data/secure-records
cat runtime/data/db.json | grep -E 'buyerEmail|paymentRequest|accessToken|webhook' && echo '민감정보 잔존 확인 필요' || echo '민감정보 공개 DB 잔존 없음'
```

## 보안 원칙
- `db.json`은 공개/운영 설정 중심으로 유지한다.
- 사용자/결제 기록은 `secure-records`에 별도 저장한다.
- 운영에서는 `secure-records.json.enc`가 생성되어야 한다.
- 개발환경에서 키가 없으면 `secure-records.dev.json`이 생성되며, 이 상태는 운영 금지다.
- 감사로그 payload는 email/token/secret/cookie/rawBody 등 민감 필드를 마스킹한다.

## 결제 보안
PortOne V2 웹훅은 웹훅 시크릿을 발급하고 signature 검증을 적용해야 한다. 결제 완료는 클라이언트 응답만 믿지 않고 서버에서 PortOne 결제 조회 결과와 주문 금액/상태를 대조한다.

## 롤백 기준
- 결제 완료 주문이 조회되지 않음
- secure-records 복호화 실패
- 고객 계정 로그인 후 주문/산출물 접근 실패
- 웹훅 검증 실패가 정상 결제를 계속 차단함

위 경우 직전 ZIP으로 롤백하고, secure-records 파일과 db.json을 함께 백업한 뒤 복구한다.

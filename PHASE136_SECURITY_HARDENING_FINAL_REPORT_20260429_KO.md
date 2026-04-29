# PHASE136 보안 강화 최종 보고서

## 목표
상용화 기준으로 사용자 기록과 결제 기록을 일반 런타임 DB에서 분리하고, 운영환경에서는 암호화 저장되도록 보안 구조를 강화했다.

## 핵심 변경
1. `server/infrastructure/security/secure-record-store.mjs` 추가
2. `customers`, `orders`, `paymentSessions`, `paymentEvents`, `webhookInbox`, `auditLogs`, `purchasedAssets`, `subscriptions`, `sites`, `scans` 분리 저장
3. 운영 키 설정 시 AES-256-GCM 암호화 저장
4. 일반 `runtime/data/db.json`에는 민감 컬렉션을 비운 형태로 저장
5. `readDb()`에서는 보안 저장소를 병합해 기존 기능 호환성 유지
6. 감사로그 payload에서 email/token/secret/cookie/rawBody 등 민감 필드 마스킹
7. PortOne 결제 완료 검증/웹훅 검증 구조 유지 및 보안 런북 추가
8. PHASE136 보안 검증 스크립트 추가

## 운영 필수값
- `NV0_SECURE_RECORDS_KEY`
- `NV0_SECURE_RECORDS_SALT`
- `NV0_SECURE_RECORDS_DIR`
- `NV0_PORTONE_WEBHOOK_SECRET`
- `NV0_PAYMENT_PROVIDER=portone_v2`

## 검증 명령
```bash
npm run phase136:final
```

## 주의
개발환경에서 `NV0_SECURE_RECORDS_KEY`가 없으면 분리 저장은 되지만 암호화되지 않은 `secure-records.dev.json`이 생성된다. 운영 배포에서는 반드시 키를 설정해야 한다.

# Phase 7 최종 상용화 보강 및 테스트 리뷰

## 처리 완료

1. PortOne V2 웹훅 검증 강화
- `server/infrastructure/payments/portone-webhook-verify.mjs` 추가
- Standard Webhooks v1 방식의 `webhook-id.webhook-timestamp.rawBody` HMAC-SHA256 검증 구현
- `NV0_PORTONE_WEBHOOK_VERIFY_MODE=strict` 모드 추가
- strict 모드에서 `NV0_PORTONE_WEBHOOK_SECRET` 미설정 시 서버 기동 차단
- 서명 실패 웹훅은 401로 거절하고 주문/결제 상태를 변경하지 않음

2. 웹훅 포렌식 기록 보강
- 잘못된 JSON, 서명 실패, 처리 실패, 처리 성공 모두 `webhookInbox`에 기록
- `rawSha256`, `signaturePresent`, `verified`, `verificationMode`, `reason`, `orderId` 기록
- 유효 웹훅도 최종 상태는 PortOne API 재조회 결과로 확정

3. PostgreSQL 영속화 확장
- `webhook_inbox` 스키마에 `order_id`, `reason` 추가
- PostgreSQL bridge의 `webhook_inbox` 반영 컬럼 확장
- 결제 이벤트와 웹훅 수신함이 운영 추적 가능하도록 보강

4. 테스트 보강
- PortOne 이벤트 테스트에서 정상 서명 웹훅 200 확인
- 잘못된 서명 웹훅 401 확인
- PortOne provider 테스트는 웹훅 검증 optional 모드로 기존 흐름 유지

## 검증 결과

- `server/index.mjs` 문법 검증 통과 확인
- `server/infrastructure/payments/portone-webhook-verify.mjs` 문법 검증 통과 확인
- PortOne provider / events 테스트 파일 문법 검증 통과 확인

## 샌드박스 한계

실제 PortOne 운영 키, 실제 PostgreSQL, 실제 Redis, Coolify/Cloudflare 실도메인 환경은 이 샌드박스에 없으므로 라이브 결제·라이브 DB·라이브 Redis 통합 검증은 수행하지 않았다.

## 상용 배포 전 필수 환경값

- `NV0_PLATFORM_TARGET=commercial`
- `NV0_PAYMENT_PROVIDER=portone_v2`
- `NV0_PORTONE_API_SECRET`
- `NV0_PORTONE_STORE_ID`
- `NV0_PORTONE_CHANNEL_KEY`
- `NV0_PORTONE_WEBHOOK_SECRET`
- `NV0_PORTONE_WEBHOOK_VERIFY_MODE=strict`
- `NV0_PERSISTENCE_MODE=postgres_primary` 또는 컷오버 전 `dual_write`
- `NV0_DATABASE_URL`
- `NV0_SESSION_STORE=redis`
- `NV0_RATE_LIMIT_STORE=redis`
- `NV0_LOCK_PROVIDER=redis`
- `NV0_REDIS_URL`

## 최종 판정

상용 결제 코어 기준에서 가장 위험했던 웹훅 위조/상태 변경 리스크를 차단했다. 이제 남은 것은 코드 문제가 아니라 실제 인프라 값으로 스테이징에서 PortOne/DB/Redis/Coolify 통합 검증을 수행하는 단계다.

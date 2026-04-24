# Phase 6 즉시 실행 보고서 — PortOne 이벤트 영속화 / 웹훅 수신 기록 강화

## 이번 단계 목적
- PortOne 결제 상태 변경 이력을 운영 추적 가능한 이벤트 로그로 남긴다.
- 웹훅 수신 기록을 별도 inbox로 보존한다.
- PostgreSQL 병행 저장 시 `orders`, `payment_events`, `webhook_inbox` 실테이블까지 같이 밀어 넣는다.

## 실제 반영
- `defaultDb` 확장
  - `paymentEvents`
  - `webhookInbox`
- 결제 이벤트 기록 함수 추가
  - `recordPaymentStateEvent`
  - `upsertPaymentEvent`
  - `appendWebhookInbox`
- PortOne 동기화 시 이벤트 기록 추가
  - verification_failed
  - pending
  - confirmed
  - cancelled
  - failed
- PortOne 웹훅 수신 시 raw body sha256 저장
- PostgreSQL 스키마 확장
  - `payment_events`
  - `webhook_inbox`
- PostgreSQL bridge 확장
  - snapshot 저장 외에 `orders`, `payment_events`, `webhook_inbox` 테이블 반영
- 운영 집계 확장
  - `paymentEvents`
  - `webhookInbox`

## 웹훅 검증 관련 현재 상태
- 현재 서버는 웹훅 본문을 그대로 신뢰하지 않고, `paymentId`를 추출한 뒤 PortOne API 재조회 결과를 기준으로 최종 상태를 확정한다.
- 서명 헤더 존재 여부와 raw body hash는 별도 저장한다.
- PortOne 공식 SDK 기반의 표준 웹훅 서명 검증은 아직 별도 의존성 추가가 필요하다.

## 통과 기준
- checkout 생성 시 payment event 생성
- complete / webhook 호출 시 payment event 누적
- webhook inbox 누적
- e2e / portone / portone-events / smoke 통과

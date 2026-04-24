# IMMEDIATE EXECUTION PHASE 5 REPORT — PortOne V2 결제 코어

## 이번 단계에서 실제 반영한 것
- `NV0_PAYMENT_PROVIDER=portone_v2` 지원 추가
- PortOne V2 사전 등록(`pre-register`) 호출 추가
- 브라우저 SDK 요청 파라미터 생성 및 checkout session 응답 포함
- `/api/public/payment/complete`에서 PortOne 결제 조회 검증 추가
- `/api/public/payment/portone/webhook` 추가
- `/api/admin/payments/portone/sync` 추가
- `/api/admin/payments/portone/cancel` 추가
- 관리자 진단 및 readyz에 PortOne 설정 요약 추가
- checkout 화면에 PortOne 브라우저 SDK 연동 추가
- PortOne 모의 서버 기반 테스트 추가 (`tests/portone-provider.mjs`)

## 이번 단계의 설계 원칙
- 브라우저는 결제창 호출만 담당
- 최종 결제 상태는 서버가 PortOne API 조회 결과로만 확정
- 주문 금액/주문번호/커스텀 데이터 일치 검증 실패 시 결제 반영 금지
- webhook 본문은 신뢰하지 않고 paymentId를 기준으로 PortOne API 재조회
- 중복 완료/중복 webhook은 분산 락으로 차단

## 아직 남은 상용 고도화
- Standard Webhooks 기반 서명 검증 SDK 도입
- 결제 이벤트 영구 테이블화 및 재처리 큐 분리
- 부분취소/부분환불 상세 회계 처리
- 정기결제(빌링키) 흐름 추가
- PortOne PG별 파라미터 최적화 및 실패 코드 매핑

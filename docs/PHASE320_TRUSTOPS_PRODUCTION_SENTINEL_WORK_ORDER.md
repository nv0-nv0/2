# PHASE320 TrustOps Production Sentinel 작업 지시서

## 목적
phase319 런칭 컨트롤 이후 실제 운영 서버 투입 직전 단계에서 필요한 live verification, canary rollout, rollback trigger, SLA, cost-quality guardrail을 하나의 센티널 구조로 묶는다.

## 적용 범위
- 공개 API: `/api/public/trustops-production-sentinel`, `/api/public/live-verification-checklist`
- 관리자 API: `/api/admin/trustops-production-sentinel`
- 포털 UI: 프로덕션 센티널 관제 카드
- 엔진/에이전트: production sentinel, live verification, rollback/SLA, cost-quality budget
- 테스트/검증: `test:production-sentinel`, `validate:phase320`, `phase320:final`

## 필수 기준
1. P0 blocker가 있으면 신규 유료 전환 또는 전체 공개를 보류한다.
2. 결제 완료 주문의 산출물 누락은 P0로 처리한다.
3. 개인정보 노출 의심 시 추가 원문 수집을 중지한다.
4. 자동정기결제 구현 전까지 월 상품은 수동 갱신형으로 표시한다.
5. 배포 후 `/portal`, `/board`, `/checkout`, `/privacy`, `/refund`, `/business-info`를 직접 확인한다.

## 산출물
- 프로덕션 센티널 엔진
- live verification checklist
- canary rollout stages
- rollback matrix
- SLA matrix
- cost-quality budget
- phase320 audit JSON

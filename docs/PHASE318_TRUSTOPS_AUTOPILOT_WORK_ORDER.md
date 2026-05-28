# PHASE318 TrustOps Autopilot 작업 지시서

## 목표
phase317의 성장 자동화 구조를 실제 운영 관제판으로 확장한다. 무료 진단, 결제, 산출물, 모니터링, 수동 갱신, 환불 검토, 대행사 확장 흐름을 한 곳에서 우선순위화하고, 다음 최적 상품을 자동 제안한다.

## 적용 범위
- 공개 API: `/api/public/trustops-autopilot`, `/api/public/customer-lifecycle`, `/api/public/automation-workqueue`
- 관리자 API: `/api/admin/trustops-autopilot`
- 포털 UI: TrustOps 오토파일럿 패널
- 엔진/에이전트: autopilot, lifecycle, workqueue, forecast 계층 추가
- 검증: phase318 전용 통합 테스트와 최종 게이트

## 핵심 작업
1. TrustOps Autopilot 엔진 추가
2. 고객 생애주기 단계 계산 추가
3. 다음 최적 상품 제안 추가
4. 운영 큐 P0/P1/P2 우선순위화
5. 매출 예측 및 MRR 계산 추가
6. 수동 갱신, 산출물 누락, 환불 검토 큐 강화
7. 포털 화면에 자동 운영 지표 노출
8. phase318 감사 JSON 생성

## 품질 기준
- 공개 큐는 고객 원문 URL·식별자를 직접 노출하지 않는다.
- 유료 서비스는 결제 완료, 접근 기간, 권한 확인 원칙을 유지한다.
- 구독형 상품은 자동정기결제가 활성화되기 전까지 수동 갱신형으로 표시한다.
- 오토파일럿은 법률 결론이 아니라 운영 우선순위와 상품 제안을 제공한다.

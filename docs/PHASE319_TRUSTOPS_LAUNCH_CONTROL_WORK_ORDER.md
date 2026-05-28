# PHASE319 TrustOps Launch Control 작업지시서

## 목표
phase318 오토파일럿 위에 실서비스 운영 전용 런칭 컨트롤을 추가한다. 상용 오픈 판단, 단계적 배포, 장애 대응, 전환 실험, 생애주기 메시지, 수익 단위경제를 하나의 운영 게이트로 묶는다.

## 적용 범위
- 공개 API: `/api/public/trustops-launch-control`, `/api/public/lifecycle-message-sequence`
- 관리자 API: `/api/admin/trustops-launch-control`
- 코어 엔진: `server/core/trustops-launch-control.mjs`
- 포털 UI: 런칭 컨트롤 카드 추가
- 검증: `test:launch-control`, `validate:phase319`, `phase319:final`

## 필수 게이트
1. P0 운영 큐 존재 시 전체 오픈 보류
2. paid 주문에 산출물 누락이 있으면 상용 오픈 보류
3. 개인정보/보안 필수 환경값 누락 시 상용 오픈 보류
4. 결제, 산출물, 개인정보, 진단, 발행 장애 대응 플레이북 제공
5. 무료 진단 후 유료 전환, 문구팩 업셀, 수동 갱신, 환불 접수 메시지에 억제 규칙 포함

## 산출물
- phase319 누적 백로그 170개 이상
- phase319 신규 보강 항목 40개
- 전환 실험 8개
- 사고 대응 플레이북 5개
- 단계 배포 계획 5단계

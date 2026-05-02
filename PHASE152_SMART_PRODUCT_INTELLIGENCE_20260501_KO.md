# PHASE152 NV0 Smart Product Intelligence

## 목적

P152는 nv0.kr을 프롬프트 개발 제품이 아니라 실제 운영형 사이트 진단 서비스로 더 똑똑하게 만드는 패치입니다.

핵심은 화면을 더 복잡하게 만드는 것이 아니라, 사용자가 진단 결과를 본 뒤 `무엇을 먼저 해야 하는지`, `어떤 상품이 맞는지`, `왜 그 선택이 맞는지`를 즉시 이해하게 만드는 것입니다.

## 반영 내용

1. `server/core/product-intelligence.mjs` 신규 추가
2. `/api/public/product-intelligence` API 추가
3. `/api/public/products` 응답에 상품별 스마트 적합도 추가
4. `/api/public/plans` 응답에 `intelligence`, `smartOffers` 추가
5. 무료 진단 결과에 `intelligence` 포함
6. 데모 결과 화면에 `스마트 다음 행동` 패널 추가
7. 요금제 화면에 `스마트 추천` 패널 추가
8. prelaunch 단계에서 특정 결제사명 중심 문구를 완화하고 상품 비교/신청 흐름 중심으로 정리

## 스마트 판단 기준

- 위험도 점수
- P0/P1/P2 발견 항목 수
- 상위 발견 항목 제목
- 최근 사이트/스캔 상태
- 상품 제공 범위
- 사용자 다음 행동 경로

## 추천 흐름

- 고위험/반복 관리 필요: Auto
- 근거와 우선순위 필요: Pro
- 바로 바꿀 문구 필요: FixPack
- 먼저 기준 정리 필요: Report

## 유지 범위

- P143 DB schema bootstrap 유지
- P144 readyz host guard 유지
- P145 Redis prelaunch readiness 유지
- P148 무한 조합 CTA 유지
- P149 메인/데모/요금제 UX 수정 유지
- P151 제품 범위 정렬 유지

## 금지

- prompt-directive 재추가 금지
- 프롬프트 생성 제품 방향 확장 금지
- PortOne/통신판매업 신고번호 가짜값 입력 금지
- prelaunch 상태를 임의로 commercial launch로 변경 금지
- Postgres/Redis/runtime volume 삭제 금지

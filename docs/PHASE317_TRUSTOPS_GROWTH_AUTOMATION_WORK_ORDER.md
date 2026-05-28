# PHASE317 TrustOps 성장 자동화 작업 지시서

## 목표
현재 VERIDION을 단순 URL 진단과 리포트 판매 구조에서 TrustOps AI Platform 구조로 고도화한다. 최소 노동, 최소 비용으로 성능, 품질, 기능, 편의, 수익을 동시에 키우기 위해 다음 흐름을 실제 코드와 검증 게이트에 반영한다.

## 적용 범위

1. 무료 진단 결과에 TrustOps 전환 프리뷰 추가
2. 유료 상품 사다리 확장
3. 개선 문구팩 자동 생성
4. 월간 모니터링 설계 API 추가
5. 대행사 화이트라벨 상품 추가
6. SEO 구조화 데이터 패키지 추가
7. 100개 개선 백로그를 코드화
8. 엔진과 에이전트 정책을 phase317로 확장
9. 포털에 고도화 자동 운영 패널 추가
10. phase317 최종 테스트 게이트 추가

## 신규 상품

- 개선 문구팩: 79,000원 1회
- 월간 모니터링: 59,000원 월 수동 갱신형
- 대행사 화이트라벨: 499,000원 월 수동 갱신형

## 신규 API

- GET /api/public/trustops-blueprint
- POST /api/public/fix-generator
- POST /api/public/monitoring-plan
- GET /api/public/revenue-optimization
- GET /api/public/industry-templates
- GET /api/public/structured-data-package

## 품질 게이트

- npm run test:trustops
- npm run validate:phase317
- npm run phase317:final

## 운영 원칙

- AI는 법률 확정 판단자가 아니라 개선 초안 작성자 역할로 제한한다.
- 룰 엔진, 서버 카탈로그, 결제 검증, 접근 권한 검사를 우선한다.
- 무료 진단은 상세 근거를 잠그고 유료 산출물로 연결한다.
- 반복 매출은 정기 모니터링과 전문가/대행사 플랜으로 만든다.

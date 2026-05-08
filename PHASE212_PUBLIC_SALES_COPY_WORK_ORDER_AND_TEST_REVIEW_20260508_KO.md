# PHASE212 공개 구매 전환 문구 전면 개편 작업지시서 및 테스트 리뷰

## 목표
플랜 비교와 결제 화면에서 내부 검수·운영·개발자용 문구를 제거하고, 방문자가 구매 필요성을 즉시 이해하도록 공개 세일즈 카피 중심으로 전면 개편한다.

## 적용 범위
1. `/plans` 히어로 문구 전면 교체
2. `/plans` 구매 망설임 원인 3종 카드 추가
3. `/plans` 추천 상품 카드 문구 재작성
4. `/plans` 전체 상품 카드 문구를 구매자 관점으로 통일
5. `/plans` 비교표를 기능 나열이 아닌 구매 상황 기준으로 변경
6. `/plans` 구매 후 변화 예시 Before/After 추가
7. `/plans` FAQ를 구매 전 질문 중심으로 재작성
8. `/checkout` 결제 전 문구를 결과물 확인 중심으로 재작성
9. `/checkout` 내부 결제 검증 문구를 사용자 친화적 안내로 변경
10. 서버 상품 카탈로그 문구를 공개 전환 문구와 일치하도록 변경
11. 결제 연동에 필요한 `data-plan-code`, `data-price`, `data-checkout-href`, checkout API 연결은 유지
12. 공개 화면에 `상품코드`, `API`, `PortOne 결제`, `검증 스크립트`, `100점 산출물`, `운영 검수`, `due 체크`, `분산 락` 같은 내부용 문구가 보이지 않도록 검증 추가

## 핵심 변경 문구 방향
- 기존: 플랜 선택부터 결제 API까지 한 흐름으로 잠급니다
- 변경: 선택한 상품, 금액, 받을 결과물을 결제 전에 다시 확인합니다

- 기존: 서버 결제 세션과 동일한 카탈로그 기준
- 변경: 결제 전 상품, 금액, 제공 내용을 다시 확인하고 진행합니다

- 기존: 내부 공유용 근거와 조치 순서
- 변경: 팀에 설명할 근거와 개선 순서가 필요한 분

- 기존: 100점 산출물 기준
- 변경: 고객이 멈추는 문장을, 고객이 안심하는 문장으로 바꿉니다

## 테스트 리뷰
실행 명령:

```bash
npm run check:syntax
npm run test:phase212
npm run validate:phase212-sales-copy
npm run test:phase211
npm run validate:phase211-plans-payment
npm run test:phase210
npm run validate:phase210-cta
npm run test:phase209
npm run validate:phase209-product-100
npm run validate:phase208
npm run check:pages
npm run test:routes
npm run validate:phase208-cta
npm run test:all
```

검증 결과:
- 문법 검사: 통과, 246개 소스 확인
- PHASE212 세일즈 문구 테스트: 통과
- PHASE212 공개 화면 내부 문구 제거 검증: 통과
- 결제 연동 구조 보존 검증: 통과
- PHASE211 플랜/결제 연동 테스트: 통과
- PHASE210 CTA 다양화 테스트: 통과
- PHASE209 상품 산출물 검증: 통과
- PHASE208 CTA 자동발행 검증: 통과
- 페이지 무결성 검사: 통과
- 라우트 스모크 테스트: 통과
- 전체 테스트: 87/87 통과

## 운영 배포 후 확인 필요
실제 운영 결제 승인, 정산, PortOne 웹훅 수신 여부는 로컬 패키지에서 확인할 수 없다. 운영 환경에서 `NV0_PAYMENT_PROVIDER`, `NV0_PORTONE_STORE_ID`, `NV0_PORTONE_CHANNEL_KEY`, `NV0_PORTONE_API_SECRET`, 웹훅 로그를 직접 확인해야 한다. 이 정보는 확인되지 않았습니다.

## 롤백 기준
배포 후 `/plans` 또는 `/checkout`에서 결제 버튼 연결, 상품 가격, 수신 이메일 입력, 결제 완료 확인 흐름에 문제가 있으면 직전 PHASE211 패키지로 되돌리고 다음 명령으로 확인한다.

```bash
npm run check:syntax
npm run test:phase211
npm run validate:phase211-plans-payment
npm run test:all
```

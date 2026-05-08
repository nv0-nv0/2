# PHASE211 플랜 비교 정리 + 실제 결제 연동 고려 100점 작업지시서 및 테스트 리뷰

## 1. 문제 정의

기존 플랜 비교 화면은 정보가 한 화면에 많이 쌓여 있어 사용자가 어떤 플랜을 선택해야 하는지 즉시 판단하기 어려웠습니다. 또한 플랜 카드의 버튼이 결제 화면으로 이동하더라도, 화면에서 보이는 상품명·상품코드·가격·제공 범위가 서버 결제 세션 생성 기준과 같은지 사용자가 확인하기 어려웠습니다.

이번 PHASE211의 목표는 다음 두 가지입니다.

1. 플랜 비교 화면을 추천 중심, 카드 중심, 핵심 차이 중심으로 재정리한다.
2. 실제 PortOne 결제 연동 시 상품코드·금액·결제 가능 상태·완료 검증 흐름이 끊기지 않도록 한다.

## 2. 적용한 개선안 10가지

1. 플랜 흐름을 `무료 확인 → 상세 분석 → 바로 수정 → 반복 관리` 4단계로 정리했습니다.
2. 추천 플랜 카드를 별도로 분리해 사용자가 가장 먼저 선택 기준을 볼 수 있게 했습니다.
3. 전체 플랜 카드는 `추천 대상 → 받는 결과물 → 가격 → CTA` 순서로 통일했습니다.
4. 비교표는 체크박스 나열이 아니라 `문제 확인 / 개선안 / 문구 수정 / 자동 관리`의 핵심 차이만 남겼습니다.
5. 각 카드에 “이런 분께 추천” 문구를 넣어 기능보다 상황 중심으로 선택하게 했습니다.
6. CTA 버튼 문구를 플랜별로 다르게 바꿨습니다. 예: 상세 리포트 결제하기, 수정안까지 결제하기, 자동 관리 결제하기.
7. 모바일에서는 큰 표보다 카드형 흐름이 먼저 보이도록 레이아웃을 재구성했습니다.
8. 플랜 설명 길이와 구성 요소를 통일했습니다.
9. 선택 가이드와 FAQ를 하단에 배치해 사용자가 고민을 줄일 수 있게 했습니다.
10. 여백, 배지, 카드 강조, 추천 플랜 시각 강조를 정리했습니다.

## 3. 결제 연동 구조 보강

1. `/api/public/payment/config` 공개 상태 확인 API를 추가했습니다.
2. 플랜 페이지가 결제 가능 상태를 먼저 확인한 뒤 유료 checkout 버튼을 표시합니다.
3. 결제 불가 상태에서는 유료 checkout으로 바로 보내지 않고 고객지원/사업자 정보 페이지로 우회합니다.
4. 플랜 카드에 `data-plan-code`, `data-price`, `data-checkout-href`를 부여했습니다.
5. 플랜 화면과 checkout 화면 모두 `/api/public/products`의 같은 상품 카탈로그를 사용합니다.
6. checkout 화면은 `paymentConfigState`에서 PortOne 준비 여부와 상품코드를 보여줍니다.
7. checkout 버튼은 필수 동의, 이메일, 결제 제공자 준비, PortOne SDK 로드가 모두 충족되어야 활성화됩니다.
8. 서버는 `NV0_PAYMENT_PROVIDER=portone_v2`인데 PortOne 필수 환경값이 없으면 checkout-session 생성을 503으로 차단합니다.
9. PortOne 결제창 응답 후 곧바로 `/api/public/payment/complete` 서버 검증을 호출하도록 보강했습니다.
10. 완료 검증 시 `paymentId`, 금액, 상품코드, customData를 서버에서 다시 확인하는 기존 구조를 유지했습니다.

## 4. 수정 파일

- `apps/public/plans/index.html`
- `apps/public/plans/app.js`
- `apps/public/plans/app.css`
- `apps/public/checkout/index.html`
- `apps/public/checkout/app.js`
- `apps/public/checkout/app.css`
- `server/routes/payment.mjs`
- `tests/phase211-plans-checkout-payment.mjs`
- `scripts/validate-phase211-plans-payment.mjs`
- `tests/portone-provider.mjs`
- `tests/portone-events.mjs`
- `package.json`

## 5. 수용 기준

- 플랜 비교 페이지는 추천 카드, 전체 카드, 핵심 차이표, 선택 가이드, FAQ, 최종 CTA 순서로 읽혀야 합니다.
- 유료 플랜 카드의 상품코드와 가격은 checkout API가 사용하는 상품 카탈로그와 일치해야 합니다.
- 결제 가능 상태 확인 API가 있어야 합니다.
- PortOne 환경값이 없으면 서버가 결제 세션 생성을 차단해야 합니다.
- PortOne SDK가 로드되지 않으면 checkout 버튼이 활성화되면 안 됩니다.
- 결제창 응답 후 서버 완료 검증을 반드시 호출해야 합니다.
- 기존 PHASE208 CTA 20분 자동발행, PHASE209 100점 산출물, PHASE210 CTA 4천자 다양화 검증이 깨지면 안 됩니다.

## 6. 테스트 리뷰

실행 완료 명령:

```bash
npm run check:syntax
npm run test:phase211
npm run validate:phase211-plans-payment
npm run test:all
node tests/portone-provider.mjs
node tests/portone-events.mjs
```

결과:

- `check:syntax`: 통과, 244개 소스 확인
- `test:phase211`: 통과
- `validate:phase211-plans-payment`: 통과
- `test:all`: 통과, 87/87
- `portone-provider`: 통과
- `portone-events`: 통과

## 7. 운영 배포 후 확인 필요

아래 항목은 로컬 패키지에서 실제 승인까지 확인할 수 없습니다. 운영 환경에서 직접 확인해야 하며, 이 정보는 확인되지 않았습니다.

1. `NV0_PAYMENT_PROVIDER=portone_v2`
2. `NV0_PORTONE_STORE_ID`
3. `NV0_PORTONE_CHANNEL_KEY`
4. `NV0_PORTONE_API_SECRET`
5. `NV0_PORTONE_WEBHOOK_SECRET`
6. PortOne 실제 테스트 승인 1건
7. `/api/public/payment/config`에서 `paymentReady: true` 반환 여부
8. `/api/public/checkout-session` 사전등록 성공 여부
9. `/api/public/payment/complete` 완료 검증 성공 여부
10. PortOne 웹훅 수신 및 주문 상태 변경 로그

## 8. 롤백 기준

아래 문제가 발생하면 PHASE210 패키지로 롤백합니다.

- 플랜 카드가 렌더링되지 않음
- checkout 버튼이 정상 결제 가능 상태에서도 활성화되지 않음
- PortOne 사전등록이 실패함
- 결제 완료 후 order 상태가 `paid`로 바뀌지 않음
- 기존 CTA 자동발행 또는 상품 산출물 검증이 실패함

롤백 대상: `nv0_phase210_cta_diversity_4000_final_20260508.zip`

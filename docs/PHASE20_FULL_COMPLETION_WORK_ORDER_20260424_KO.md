# Phase20 전면 재검수 및 상용화 보강 작업지시서

## 목적
Phase19에서 상품 카탈로그와 화면 노출은 추가되었으나, 실제 상용 판매 관점에서 부족했던 결제 후 산출물, 포털 표시, 상품 상세 운영 기준, 테스트 게이트를 보강한다.

## 적용 범위
- 구현/운영 난이도 낮음~중하 상품 9개: Report, FixPack, TemplatePack, IndustryGuide, Basic, Pro, Auto, Certified, Agency
- 공개 화면: `/solutions`, `/plans`, `/checkout`, `/portal`, `/documents`
- 공개 API: `/api/public/products`, `/api/public/plans`, `/api/public/checkout-session`, `/api/public/payment/complete`, `/api/public/fulfillment`, `/api/public/product-detail`
- 운영 검증: 소스 문법, 페이지 무결성, 링크, 렌더링 안전성, 상품 카탈로그/산출물 연결성

## 핵심 수정 사항
1. 상품 카탈로그를 단순 제목/가격에서 대상 고객, 산출물, 운영 방식, KPI까지 확장했다.
2. 결제 완료 후 주문별 구매 산출물(`purchasedAssets`)을 자동 생성하도록 했다.
3. 1회성 상품별 실제 산출물 타입을 분리했다.
   - Report: 정밀 리스크 리포트
   - FixPack: 맞춤 수정 문구안
   - TemplatePack: 문서 템플릿 팩
   - IndustryGuide: 업종별 체크리스트
4. 구독/인증 상품별 권한 또는 인증 후보 산출물을 생성한다.
   - Basic/Pro/Auto/Agency: 구독 권한 및 포함 항목
   - Certified: 인증 후보 상태와 마크 스니펫
5. 고객 포털에서 결제 완료 산출물을 확인할 수 있도록 `/api/public/fulfillment`와 포털 렌더링을 추가했다.
6. Phase19의 중복 라우트 선언과 상품 허용값 누락을 수정했다.
7. 상품-결제-산출물 연결성 검사용 `check:commercial-offers` 테스트를 추가했다.

## 운영 원칙
- Veridion은 법률 자문 서비스가 아니라 웹사이트 운영 리스크 점검 및 개선 참고 자료로 명시한다.
- 인증 마크는 결제 직후 즉시 확정이 아니라 `pending_operator_review` 상태로 제공한다.
- 자동수정은 즉시 반영이 아니라 승인형 후보로 제한한다.
- 데이터 판매, 보험, 자격증, 침투 테스트, 해외 규제 대행은 현재 범위에서 제외한다.

## 배포 전 확인
1. `npm run test:all`
2. `npm run ci:strict`
3. `npm run validate:deploy`
4. `npm run validate:commercial-runtime`
5. Coolify No Cache Redeploy
6. Cloudflare Purge Everything

## 사용자 플로우
1. 사용자가 무료 진단을 실행한다.
2. `/plans`에서 추천 상품과 1회성 상품을 확인한다.
3. `/checkout`에서 상품을 선택하고 결제 세션을 생성한다.
4. 결제 완료 후 `/portal?orderId=...`로 이동한다.
5. 포털에서 리포트, 수정 문구안, 템플릿, 업종 가이드, 인증 후보 또는 구독 권한을 확인한다.

## 최종 판정
Phase20은 단순 아이디어 페이지가 아니라 결제 이후 산출물까지 연결되는 최소 상용 판매 루프를 완성하는 패치다.

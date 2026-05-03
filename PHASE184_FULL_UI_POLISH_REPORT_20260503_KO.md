# PHASE184 전체 UI/UX 시인성·문구·메뉴 정리 완료 보고서

## 처리 목적
라이브 확인에서 드러난 플랜 표 깨짐, 보드 본문 시인성 저하, 체크아웃 주문 요약 오류, 무료진단 잔여 횟수 충돌, 페이지별 상단 메뉴 불일치, 폼 라벨/버튼 붙음 문제를 전역 디자인 시스템 기준으로 정리했다.

## 핵심 처리 항목

### 1. 상단 메뉴 전역 통일
- 레거시 `nv0-topbar`를 서버 렌더링 시 제거하고 공통 `site-topbar`만 주입하도록 수정했다.
- 메뉴 명칭을 `무료 진단 / 플랜 비교 / 콘텐츠 보드 / 문서 작성 / 내 사이트 / 고객지원 / 로그인`으로 통일했다.
- 로그인 버튼 대비와 현재 페이지 강조 상태를 강화했다.

### 2. 체크아웃 신뢰 문제 제거
- 고정 노출되던 `프로페셔널 플랜`, `연간 결제`, `사용자 추가`, `WELCOME15`, `₩1,363,230` 요약을 제거했다.
- 선택한 상품 코드에 맞춰 상품명, 금액, 전달 방식, 추천 대상, 예상 결제 금액이 동적으로 표시되도록 수정했다.
- `3. 3. 결제 진행` 중복 번호를 제거했다.
- 버튼 문구가 붙어 보이지 않도록 spacing/grid를 정리했다.

### 3. 플랜 비교표 정리
- 비교표에 `colgroup`을 추가하고 열 너비를 고정했다.
- 행간, 셀 padding, 텍스트 줄바꿈, 배경 대비를 정리했다.
- 정적 플랜 카드 가격과 실제 상품 카탈로그 가격을 맞췄다.
- `14일 무료 체험`처럼 실제 제공 조건이 불명확한 문구를 `플랜 신청`으로 정리했다.

### 4. 콘텐츠 보드 시인성 개선
- 본문 글자색, 행간, 섹션 카드 배경, 제목 크기, 메타 정보 간격을 강화했다.
- 고객 화면에 노출되는 명칭을 `콘텐츠 보드` 중심으로 통일했다.
- 게시글 CTA 버튼 간격을 정리해 버튼 텍스트가 붙지 않게 했다.

### 5. 무료진단 잔여 횟수 표시 일관화
- 좌측/우측 배너가 서로 다른 값을 말하지 않도록 하나의 `FREE_LIMIT` 기준으로 표시한다.
- 비회원: `오늘 남은 비회원 무료 진단 N회`
- 회원: `회원 전용 전체 결과 활성`

### 6. 폼 라벨·입력창 정리
- 로그인/회원가입, 문서 생성, 체크아웃, 포털 등록 폼의 label/input 간격을 전역 보정했다.
- 체크박스 라벨이 한 줄로 붙어 보이는 문제를 전역 `checkline/check-row` 규칙으로 보완했다.
- 모바일에서 입력창과 버튼이 꽉 차게 정렬되도록 반응형 규칙을 추가했다.

### 7. 사업자/정책 문구 정리
- 고객 화면에 내부 운영 단계처럼 보이는 문장을 줄이고 사업자 정보·고객지원·환불/개인정보 안내 중심으로 정리했다.
- 개인정보처리방침의 호스팅 제공자 표기를 사업자 정보와 일치시켰다.

## 수정 파일
- `server/index.mjs`
- `server/core/smart-product-orchestrator.mjs`
- `shared/base.css`
- `shared/visibility.css`
- `apps/public/plans/index.html`
- `apps/public/plans/app.css`
- `apps/public/checkout/index.html`
- `apps/public/checkout/app.css`
- `apps/public/checkout/app.js`
- `apps/public/board/app.css`
- `apps/public/auth/app.css`
- `apps/public/documents/app.css`
- `apps/public/veridion-demo/index.html`
- `apps/public/veridion-demo/app.js`
- `apps/public/business-info/index.html`
- `apps/public/privacy/index.html`
- `apps/public/portal/index.html`
- `apps/public/portal/app.css`

## 검증 결과
- `node --check apps/public/checkout/app.js` 통과
- `node --check apps/public/veridion-demo/app.js` 통과
- `node --check apps/public/plans/app.js` 통과
- `node --check apps/public/board/app.js` 통과
- `node --check apps/public/auth/app.js` 통과
- `node --check apps/public/documents/app.js` 통과
- `node --check apps/public/portal/app.js` 통과
- `node --check server/index.mjs` 통과
- `node --check server/core/smart-product-orchestrator.mjs` 통과
- 고객 노출 차단 문자열 검색 통과:
  - `replace-with-number`
  - `상용 결제 전 입력 필요`
  - `운영값 미입력`
  - `상용 공개 차단`
  - `Coolify 운영환경`
  - `Contabo VPS / Coolify`
  - `WELCOME15`
  - `사용자 추가`
  - `프로페셔널 플랜`
  - `3. 3. 결제`

## 배포 후 확인 순서
1. `/plans` 비교표와 플랜 카드 가격 확인
2. `/board` 게시글 본문 시인성 확인
3. `/checkout?plan=Report`, `/checkout?plan=FixPack`, `/checkout?plan=Auto` 주문 요약 금액 확인
4. `/products/veridion/demo` 무료진단 잔여 횟수 좌우 표시 일치 확인
5. `/auth`, `/documents`, `/portal` 폼 라벨/입력창 줄간격 확인
6. 모든 공개 페이지 상단 메뉴가 동일한지 확인

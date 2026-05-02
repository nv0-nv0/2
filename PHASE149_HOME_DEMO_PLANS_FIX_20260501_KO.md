# PHASE149 메인·데모·요금제 동작 보정 패치

## 목적

사용자 피드백 기준으로 다음 문제를 즉시 보정했다.

1. 메인 화면 URL 입력창 제거
2. 데모 화면이 `보안 확인 상태를 점검하고 있습니다` 상태로 고착되는 문제 완화
3. 요금제 페이지 JS 런타임 오류 가능성 제거

## 수정 파일

- `apps/public/home/index.html`
- `apps/public/home/app.css`
- `apps/public/veridion-demo/index.html`
- `apps/public/veridion-demo/app.js`
- `apps/public/plans/app.js`
- `shared/turnstile.js`
- `server/index.mjs`
- `scripts/validate-phase149-demo-plans-home.mjs`

## 핵심 수정

### 1. 메인 화면 URL 입력창 제거

메인 화면의 URL 입력 form을 제거하고 `무료 진단 화면으로 이동`, `요금제 먼저 보기` 버튼으로 대체했다. 메인에서 바로 진단이 실행되는 것처럼 보이는 오해를 줄이고 실제 진단 입력은 `/products/veridion/demo`에서만 진행되도록 정리했다.

### 2. 데모 보안 확인 고착 방지

Turnstile 설정 확인과 스크립트 로딩에 timeout fallback을 추가했다. prelaunch 또는 placeholder 설정 상태에서는 Turnstile을 public enabled로 노출하지 않고, 무료 진단은 일반 모드로 계속 진행된다.

### 3. 요금제 페이지 런타임 오류 보정

`apps/public/plans/app.js`에서 호출되던 `discountLabel()`과 `valueLabel()` 누락 함수를 추가했다. 상품 API가 실패해도 기본 요금표를 표시하는 fallback을 넣었다.

### 4. 데모 JS 중복 함수 선언 제거

`veridion-demo/app.js`에 누적되어 있던 중복 함수 선언을 제거했다. 브라우저 module 환경에서 `Identifier has already been declared` 오류가 발생하지 않도록 정리했다.

## 검증

- `node --check server/index.mjs`
- `node --check shared/turnstile.js`
- `node --check apps/public/veridion-demo/app.js`
- `node --check apps/public/plans/app.js`
- `node scripts/validate-phase149-demo-plans-home.mjs`
- `node scripts/validate-deploy-bundle.mjs`
- `npm run deploy:precheck`
- ZIP 무결성 검사

## 배포 주의

Postgres, Redis, runtime volume은 삭제하지 않는다. 기존 P143~P148 패치를 유지한 상태에서 UI/프론트 동작과 Turnstile prelaunch fallback만 보정했다.

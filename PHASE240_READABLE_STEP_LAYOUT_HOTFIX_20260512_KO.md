# PHASE240 읽기 쉬운 단계 카드 핫픽스 보고서

## 문제
무료 진단 진행/요약 단계가 작은 둥근 카드 안에서 `1URL 입력공개 접근 가능 여부 확인`처럼 숫자, 제목, 설명이 한 줄로 붙어 보였다. 이 상태는 전역 분석과 카피 최적화가 실제 화면에서 읽히지 않는 실패다.

## 직접 원인
1. `apps/public/veridion-demo/app.js`의 `PROGRESS_STEPS`가 단일 문자열 배열이라 제목과 설명을 분리하지 못했다.
2. `apps/public/veridion-demo/app.css`가 Phase237/238 이후 의도적으로 비워졌는데, `demo-progress-steps` 전용 레이아웃이 `shared/nv0-clean-slate-20260512.css`에 이관되지 않았다.
3. 기존 검증은 문구 존재 여부와 라우트 정상 여부 중심이라, 숫자/제목/설명 겹침 같은 실제 가독성 실패를 차단하지 못했다.

## 수정
- 진행 단계를 `{ title, detail }` 구조로 변경했다.
- 렌더링을 `번호 칩 + 제목 + 설명` 구조로 바꿨다.
- 공유 CSS에 `.phase240-readable-steps`, `.demo-progress-steps`, `.loading-steps` 가독성 잠금 규칙을 추가했다.
- ordered-list 기본 marker 중복을 제거해 숫자가 두 번 보이거나 제목에 붙지 않게 했다.
- 기존 히어로의 `.phase239-mini-steps`는 건드리지 않도록 범위를 분리했다.

## 변경 파일
- `apps/public/veridion-demo/app.js`
- `shared/nv0-clean-slate-20260512.css`
- `scripts/validate-phase240-readable-step-layout.mjs`
- `package.json`

## 검증 명령
- `npm run check:syntax`
- `npm run validate:phase239`
- `npm run validate:phase240`
- `npm run test:routes`

## 인수 기준
- 단계 카드가 `1 URL 입력 / 공개 접근 가능 여부 확인`처럼 분리되어 보일 것.
- 숫자와 제목이 붙지 않을 것.
- 제목과 설명이 같은 줄에 강제로 압축되지 않을 것.
- 모바일에서도 2열 카드 구조가 유지되며 텍스트가 카드 밖으로 밀리지 않을 것.

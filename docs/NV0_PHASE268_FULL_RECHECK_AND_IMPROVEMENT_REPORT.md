# NV0 Phase268 전수 재진단·검수·개선 보고서

## 적용 목표
작은 패키지의 장점인 메인 페이지 즉시 주소 입력, 데모 실행, 결과 확인 후 내 사이트 관리 화면 자동 이동 UX를 기존 대형 패키지에 이식하되, 기존 기능·성능·메뉴·라우트·상용 검증 게이트는 유지한다.

## 중분류 개선안 20가지 및 처리 결과

| 번호 | 중분류 | 진단 내용 | 처리 결과 |
|---:|---|---|---|
| 1 | 메인 진단 진입 UX | 기존 메인은 데모 페이지로 URL을 전달하는 구조라 첫 실행 체감이 한 단계 늦었다. | 홈에서 `/api/public/diagnose`를 직접 호출하는 즉시 실행형으로 개선 |
| 2 | 결과 자동 이동 | 진단 완료 후 사용자가 결과 위치를 직접 찾아야 했다. | `portalUrl` 기반으로 내 사이트 관리 화면 자동 이동 적용 |
| 3 | 결과창 가시성 | 실행 중 빈 화면 또는 단순 이동처럼 보일 수 있었다. | 홈 결과 카드, 진행 단계, KPI 요약을 즉시 표시 |
| 4 | 작은 패키지 호환 API | 작은 패키지는 `/api/diagnostics/start`와 `{ url }` 입력 구조를 사용했다. | 호환 라우트와 `body.url` alias 추가 |
| 5 | 기존 기능 보존 | 큰 패키지의 `/products/veridion/demo`, `/portal`, `/checkout`, `/board` 기능 유지가 필요했다. | 기존 라우트와 메뉴 보존, 홈 레이어만 확장 |
| 6 | 보안 확인 예외 처리 | Turnstile 등 보안 확인이 필요한 환경에서는 홈 직접 실행이 실패할 수 있었다. | 보안/검증 오류 발생 시 전용 데모 페이지로 자동 fallback |
| 7 | 내 사이트 연동 | 비회원/회원 최근 진단 결과를 포털에서 이어 보는 연결이 필요했다. | `localStorage['nv0:lastScan']` 저장과 `portalUrl` 이동 유지 |
| 8 | URL 정규화 | 사용자가 `https://` 없이 도메인만 입력할 수 있다. | 홈 입력값 자동 프로토콜 보정 및 URL 검증 유지 |
| 9 | 입력 오류 표시 | 잘못된 주소 입력 시 사용자 피드백이 부족할 수 있었다. | `aria-invalid`와 `nv0-input-hint` 기반 안내 유지 |
| 10 | 모바일 카드 UX | 작은 파일의 간결한 카드 UX 장점을 반영할 필요가 있었다. | 홈 결과 카드, KPI 카드, 단계 카드 반응형 적용 |
| 11 | 접근성 | 즉시 실행 상태를 스크린리더가 알 수 있어야 했다. | `role="status"`, `aria-live`, 입력 라벨 유지 |
| 12 | 링크 안정성 | JS 실패 시에도 사용자가 데모 페이지로 갈 수 있어야 했다. | 기존 `/products/veridion/demo` href와 fallback 링크 보존 |
| 13 | 테스트 회귀 방지 | 기존 검증 스크립트의 기대 토큰을 깨뜨리면 납품 안정성이 떨어진다. | 기존 `home-js:hero-search-forwarding` 계약 유지 |
| 14 | API 응답 호환성 | 작은 파일 방식은 `scan` 객체를 기대한다. | 호환 endpoint 응답에 `scan`, `result`, `portalUrl` 동시 제공 |
| 15 | 서버 라우팅 안정성 | 신규 API가 기존 public route guard 밖에 있으면 404가 난다. | `handleApi`에서 `/api/diagnostics/start`를 public handler로 연결 |
| 16 | CSS 격리 | 디자인 변경이 기존 메뉴/기능 레이아웃을 망가뜨릴 수 있었다. | `veridion-adopted-ui.css` 하단에 Phase268 전용 클래스로 격리 |
| 17 | 사용자 진행감 | 진단 시간이 길면 멈춘 것처럼 보일 수 있다. | 홈 진행 카드에 단계 흐름 표시 |
| 18 | 상용 전환 안전성 | 데모/결제/포털 기존 상용 플로우가 깨지면 안 된다. | `validate:commercial-runtime`, smoke, route, link 검사 통과 |
| 19 | 정적 품질 관리 | 새 JS/CSS/라우트 변경에 대한 별도 검증이 필요했다. | `validate:phase268` 신규 감사 스크립트 추가 |
| 20 | 납품 검증성 | 패키지 수령자가 변경 내용을 빠르게 확인해야 한다. | 본 보고서와 `PHASE268_INSTANT_HOME_HANDOFF_AUDIT.json` 생성 |

## 핵심 변경 파일
- `apps/public/home/index.html`
- `apps/public/home/app.js`
- `shared/veridion-adopted-ui.css`
- `shared/nv0-clean-slate-20260512.css`
- `server/index.mjs`
- `server/routes/public.mjs`
- `scripts/validate-phase268-instant-home-handoff.mjs`
- `package.json`

## 검증 명령
- `npm run check:syntax`
- `npm test`
- `npm run check:pages`
- `npm run test:routes`
- `npm run check:links -- --summary`
- `npm run smoke`
- `npm run validate:phase264`
- `npm run validate:phase265`
- `npm run validate:commercial-runtime`
- `npm run validate:phase268`

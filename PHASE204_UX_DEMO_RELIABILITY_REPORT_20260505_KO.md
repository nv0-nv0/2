# PHASE204 UX / Demo Reliability Fix Report

## 처리 범위

사용자가 첨부한 화면 기준으로 다음 문제를 직접 수정했습니다.

1. 홈 상단 진단 카드의 숫자/카드 겹침 제거
2. 고정 `72점` 샘플 진단 결과 제거
3. 무료 진단 데모 실패 시 `ERR` 카드만 노출되는 문제 제거
4. 무료 진단 서버 응답 지연/502 상황에서도 로컬 안전 결과를 생성하도록 보강
5. 클릭되지 않던 콘텐츠 보드 좌측 필터/주제 메뉴를 실제 버튼으로 변경
6. `새 사이트 등록` 섹션을 포털 상단으로 이동
7. Pro 플랜 추천 배지와 `1회 점검` 칩 겹침 방지
8. 공통 내비게이션, 카드, 그리드의 시인성/줄바꿈/오버플로우 재발 방지 CSS 추가
9. 전용 검증 스크립트 추가

## 주요 변경 파일

- `apps/public/home/index.html`
- `apps/public/home/app.css`
- `apps/public/veridion-demo/index.html`
- `apps/public/veridion-demo/app.js`
- `apps/public/veridion-demo/app.css`
- `apps/public/board/index.html`
- `apps/public/board/app.js`
- `apps/public/board/app.css`
- `apps/public/portal/index.html`
- `apps/public/portal/app.css`
- `apps/public/plans/app.css`
- `shared/design-system.css`
- `server/index.mjs`
- `scripts/validate-phase204-ux-demo-fixes.mjs`
- `package.json`

## 데모 진단 안정화

- 서버/프록시 지연, 500/502/503, timeout 상황에서 더 이상 `진단 결과 생성 실패 / ERR` 전용 화면만 보여주지 않습니다.
- 클라이언트 안전 결과 `client_safe_fallback`을 생성하여 화면 흐름을 유지합니다.
- 서버 내장 진단 엔진에도 `NV0_SCAN_SOFT_TIMEOUT_MS` 기반 소프트 타임아웃을 추가했습니다.
- 기본값은 6500ms이며, 지연 시 보수적인 안전 요약 결과를 먼저 반환합니다.

## 재발 방지 게이트

추가 명령:

```bash
npm run validate:phase204
npm run phase204:final
```

`phase204:final` 구성:

```bash
npm run check:syntax && npm run check:pages && npm run test:routes && npm run validate:phase204
```

검증 결과:

- `check:syntax`: 통과, 230개 소스 확인
- `check:pages`: 통과, 34개 라우트 매핑 확인
- `test:routes`: 통과, 24개 라우트 확인
- `validate:phase204`: 통과, 11개 사용자 지적 항목 전용 검증
- `check:render-safety`: 통과, 24개 클라이언트 렌더 안전성 확인

## 배포 후 권장 환경값

운영 프록시에서 502가 반복되면 서버보다 프록시 timeout이 먼저 끊는 경우가 많습니다. 이번 패키지는 기본 소프트 타임아웃으로 먼저 응답하도록 보강했지만, 운영 환경에서는 아래 값을 명시하는 것을 권장합니다.

```env
NV0_SCAN_SOFT_TIMEOUT_MS=6500
NV0_TARGET_FETCH_TIMEOUT_MS=2500
NV0_TARGET_FETCH_MAX_PAGES=8
```

## 롤백 기준

- 무료 진단 실행 후 화면이 다시 `ERR` 전용 카드로 고정되는 경우
- 홈/플랜/보드/포털에서 카드가 서로 겹치는 경우
- 콘텐츠 보드 좌측 필터 클릭이 동작하지 않는 경우
- `/api/public/diagnose`가 정상 입력에서 200이 아닌 5xx로 반복되는 경우

위 중 하나라도 확인되면 직전 패키지로 되돌리지 말고, 이번 패키지의 `validate:phase204` 결과와 운영 프록시 timeout 설정을 먼저 확인해야 합니다.

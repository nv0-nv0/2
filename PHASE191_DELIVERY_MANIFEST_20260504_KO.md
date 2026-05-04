# PHASE191 납품 매니페스트

## 납품명
`nv0_phase191_portal_next_actions_visibility_complete_20260504.zip`

## 핵심 적용
- 포털 좌측 메뉴 최상단에 `새 사이트 등록` 1차 CTA 배치
- 고객 포털에서 `맞춤 지침` 노출 제거
- 고객 포털에서 `결제 후 산출물 확인` 보드 제거
- `내 사이트 다음 조치`를 2×2 카드 그리드로 축소/정렬
- 콘텐츠 보드를 딥 네이비/블루 계열로 통일하고 카드 대비 강화
- `/demo` 레거시 라우트의 페이지 무결성 보강
- 전체 테스트 게이트에서 걸리던 레거시 smoke 토큰/상품 코드 호환 보강

## 변경 파일
- `apps/public/portal/index.html`
- `apps/public/portal/app.css`
- `apps/public/portal/app.js`
- `apps/public/demo/index.html`
- `apps/public/demo/app.js`
- `apps/public/home/index.html`
- `apps/public/veridion-demo/index.html`
- `apps/public/plans/index.html`
- `apps/public/documents/index.html`
- `shared/base.css`
- `server/index.mjs`
- `scripts/validate-phase191-portal-next-actions-ux.mjs`
- `package.json`
- `PHASE191_PORTAL_NEXT_ACTIONS_UX_20260504_KO.md`
- `PHASE191_PORTAL_NEXT_ACTIONS_UX_VALIDATION_20260504.json`

## 검증 완료 명령
- `npm run check:syntax`
- `npm run test:all`
- `npm run phase191:final`
- `npm run check:pages`
- `npm run test:routes`
- `npm run check:links -- --summary`
- `npm run smoke`

## 검증 결과
- Syntax: 통과
- Test all: 88/88 통과
- PHASE74 dashboard UI compatibility: 통과
- PHASE191 UX validation: 12/12 통과
- Page integrity: 통과
- Route smoke: 통과
- Link check: 366개 확인, 오류 0개
- Smoke: 통과

# PHASE250 작업 지시서

## 목표
1. 무료 데모 결과 화면을 한눈에 보이는 개수 중심 화면으로 단순화한다.
2. 무료 데모에서는 어떤 영역, 어떤 요소, 어떤 구분에 몇 개 문제가 있는지만 공개한다.
3. 상세 근거, 수정 문구, 적용 위치, 우선순위 로드맵, 재점검 기준은 유료 서비스 결과 화면으로 분리한다.
4. 서비스 소개와 가이드를 통합해 `서비스·가이드`로 정리한다.
5. 전문가 칼럼 명칭을 `게시판`으로 변경한다.
6. 게시판 글은 100% CTA 목적 글로 발행하며, 각 글 내부 구성은 일반 독자 흥미·문제 인식 60%, CTA 설득 20%, 체크리스트·FAQ 등 보조 정보 20%로 유지한다. 발행 주기는 20분에 1회로 고정한다.
7. 요금 페이지와 결제 페이지의 가격 불일치를 제거한다.
8. 공개 화면에서 구버전 상품명과 운영용 문구가 다시 노출되지 않도록 검증한다.

## 처리 항목
- 데모 결과 UI: `apps/public/veridion-demo/app.js`, `shared/nv0-clean-slate-20260512.css`
- 유료 결과 UI: `apps/public/veridion-demo/app.js`, `shared/nv0-clean-slate-20260512.css`
- 서비스·가이드 통합: `apps/public/service/index.html`, `apps/public/guides/index.html`
- 게시판 엔진: `server/core/public-column-engine.mjs`, `apps/public/board/index.html`, `apps/public/board/app.js`, `server/routes/public.mjs`
- 가격 일치: `apps/public/plans/index.html`, `apps/public/checkout/app.js`, `server/index.mjs`, `server/core/pricing-conversion-model.mjs`
- 검증 추가: `scripts/validate-phase250-demo-paid-board-price.mjs`, `package.json`

## 완료 기준
- 무료 데모 결과 화면은 문제 영역/영향 요소/문제 합계/구분만 빠르게 확인 가능해야 한다.
- 유료 결과 화면은 상세 근거와 개선안을 분리해 더 높은 가치로 보여야 한다.
- 공개 요금제는 무료 진단, 기본 리포트, 전문가 리포트 3개만 보여야 한다.
- 가격은 전 화면과 API에서 0원, 29,000원, 89,000원으로 일치해야 한다.
- 게시판은 20분 공개, 60/20/20 비율, 실제 본문 중심 구조를 유지해야 한다.

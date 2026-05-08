# PHASE208 작업지시서 생성 제품 전면 개편 보고서

## 적용 요약
- 작업지시서 생성 전용 코어 엔진을 추가했습니다.
- `/api/public/document-preview`에 `documentKind=work_order` 분기를 추가해 최종 작업지시서 1개만 생성하도록 했습니다.
- `/documents` 화면을 요청 입력 → 생성 → 복사/저장 단일 흐름으로 개편했습니다.
- 작업별 담당, 완료 기준, 검수 방법, 테스트 기준, 롤백/보완 기준을 강제하는 계약 검사를 추가했습니다.
- 공개 앱에서 미확정 placeholder 노출을 다시 검사했습니다.

## 변경 파일
- `server/core/work-order-generator.mjs`
- `server/index.mjs`
- `server/routes/public.mjs`
- `apps/public/documents/index.html`
- `apps/public/documents/app.js`
- `apps/public/documents/app.css`
- `tests/phase208-work-order-generator.mjs`
- `scripts/validate-phase208-work-order-product.mjs`
- `package.json`

## 검증 결과
- `npm run check:syntax` 통과
- `npm run test:all` 통과
- `npm run phase208:final` 통과
- `npm run test:phase203` 통과
- `npm run validate:phase203` 통과
- 로컬 `/api/public/document-preview` 작업지시서 생성 확인

## 배포 확인 필요
- 라이브 `nv0.kr`에는 이전 배포본의 통신판매업 신고번호 placeholder가 보였으므로 새 패키지 배포 후 CDN/브라우저 캐시 갱신이 필요합니다.
- 확정된 통신판매업 신고번호가 없으면 계속 미표시 상태로 유지해야 합니다.

# 엄격 재검수 추가 보강 사항 (2026-04-23)

## 실제 추가 반영
- HTML `href` 뿐 아니라 `src`까지 포함한 참조 무결성 검사 강화
- `/shared`, `/apps`, `/runtime/uploads` 에셋 존재 여부 검사 추가
- `server/index.mjs`의 `adminNav()` 링크 무결성 검사 추가
- malformed JSON 요청에 대한 계약 테스트 보강 (`/api/public/scan`, `/api/admin/rules`)

## 목적
- 페이지는 열리지만 잘못된 JS/CSS를 참조하는 조용한 실패를 조기 검출
- 관리자 네비게이션 링크 오타/누락을 파이프라인에서 즉시 차단
- 잘못된 JSON 요청이 500이 아닌 400으로 유지되는지 회귀 방지

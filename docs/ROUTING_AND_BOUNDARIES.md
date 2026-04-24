# Cleanroom Routing and Directory Proposal

## App split
- Public App: `/`, `/demo`, `/products/veridion/demo`, `/plans`, `/checkout`, `/portal`
- Admin App: `/admin`, `/admin/console`, `/admin/console/orders`, `/admin/console/publications`, `/admin/console/library`, `/admin/console/settings`, `/admin/console/diagnostics`
- API App: `/api/public/*`, `/api/admin/*`

## Hard discard scope from legacy
1. 공개/관리 공용 `site.js`, `site.css`, `site-data.js`
2. 브라우저 저장소 기반 관리자 토큰 흐름
3. 공개 홈에 존재하는 관리자 링크/흔적
4. `/admin/index.html` 직접 허브 진입 구조

## New boundaries
- 공개 앱과 관리자 앱은 자산 디렉터리를 분리
- 페이지마다 자기 JS/CSS만 로드
- 서버 세션 + HttpOnly 쿠키 기반 인증
- 관리자 라우트는 서버에서 보호

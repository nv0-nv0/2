# NV0N Page Swap Completion Report

## 적용 범위
- `/` → `main_landing.html` 기반 NV0N 랜딩으로 교체
- `/service` → `service_detail.html` 기반 서비스 상세 페이지로 교체
- `/plans`, `/products` → `pricing.html` 기반 요금 페이지로 교체
- `/products/veridion/demo`, `/demo` → `risk_result.html` 기반 화면 + 기존 무료 진단 API 실행 브리지 연결
- `/portal` → `mypage.html` 기반 화면 + 기존 내 사이트 저장/조회 API 브리지 연결
- `/board`, `/board/post` → `insight_board.html` 기반 화면 + 기존 게시판 API 브리지 연결

## 정상 작동 보완
- NV0N 원본의 Tailwind CDN/인라인 설정은 기존 CSP에서 차단되므로 제거했습니다.
- `/shared/nv0n-runtime.css`와 `/shared/nv0n-runtime.js`를 추가해 로컬 리소스만으로 화면·버튼·URL 입력 이동이 동작하도록 했습니다.
- 기존 서버의 공통 헤더/푸터 자동 주입과 NV0N 자체 헤더/푸터가 중복되지 않도록 `data-nv0n-page="true"` 예외를 추가했습니다.
- `href="#"` 링크를 실제 경로로 교체했습니다.
- 무료 진단, 내 사이트, 게시판은 기존 API/JS를 재사용할 수 있도록 필요한 DOM 브리지 요소를 추가했습니다.
- `/demo`는 기존 검증 규칙을 지키기 위해 `apps/public/demo/app.js`가 실제 진단 앱을 위임 import하도록 보정했습니다.
- 기존 phase260 과태료 안전 문구/검증 조건은 유지했습니다.

## 추가 파일
- `shared/nv0n-runtime.css`
- `shared/nv0n-runtime.js`
- `scripts/validate-nv0n-page-swap.mjs`
- `docs/nv0n-reference/*` 원본 NV0N HTML/PNG 참고본

## 통과 검증
```bash
npm run validate:nv0n
npm run check:syntax
npm run check:pages
npm run test:routes
npm run check:links -- --summary
npm test
npm run test:phase260
npm run validate:phase260
```

## 로컬 서버 확인
아래 테스트 환경으로 `/`, `/service`, `/plans`, `/products/veridion/demo`, `/portal`, `/board` HTML 응답을 확인했습니다.
```bash
env -i PATH=$PATH HOME=$HOME NODE_ENV=test PORT=43781 HOST=127.0.0.1 \
NV0_PLATFORM_TARGET=mvp NV0_PERSISTENCE_MODE=json NV0_STORAGE_MODE=local_fs \
NV0_SCAN_PROVIDER=builtin NV0_PAYMENT_PROVIDER=demo NV0_ADMIN_AUTH_MODE=shared_key \
node server/index.mjs
```

## Phase262 visible top menu follow-up
- Standardized the top navigation across NV0N swapped pages.
- Top menu links are now visible without relying on `hidden md:flex` behavior.
- Mobile view keeps the menu available through horizontal overflow instead of hiding page movement links.
- `validate:nv0n` now checks required topbar links and blocks breakpoint-hidden navigation in the swapped-page header.

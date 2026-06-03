# NV0 UI Foundation Hardening

## 목적

라이브 화면에서 확인된 글자 크기, 대비, 모바일 메뉴, 포털 샘플 상태, 정책 문서 가독성 문제를 단일 접근성 기반 계층으로 보완한다.

## 적용 원칙

- 기존 기능과 상용 startup preflight는 유지한다.
- 모든 HTML은 마지막 CSS로 `shared/nv0-ui-foundation.css`를 로드한다.
- 모든 화면은 `shared/nv0-ui-runtime.js`를 로드한다.
- 진단 리포트는 12px 미만 텍스트를 허용하지 않는다.
- 본문 기본 크기는 16px, 보조 정보는 최소 12px를 기준으로 한다.
- 주요 CTA와 폼 컨트롤은 48px 이상의 터치 영역을 확보한다.
- 모바일에서는 접근 가능한 메뉴 버튼, `aria-expanded`, `aria-controls`, ESC 닫기를 제공한다.
- 정책 문서는 읽기 폭을 74ch 이내로 제한한다.
- 포털은 로그인 전 샘플 화면임을 명확하게 표시한다.

## 검증

`node tests/ui-foundation-hardening-contract.mjs`

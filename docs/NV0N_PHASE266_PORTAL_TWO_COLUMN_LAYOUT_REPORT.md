# NV0N Phase 266 Portal Two-Column Layout Report

## 변경 목적

`/portal` 내 사이트 관리 화면이 좁은 단일 컬럼처럼 보이며 좌측 여백이 크게 남는 문제를 해결했다. 데스크톱 화면에서는 콘텐츠를 균형 있게 2열로 배치하고, 모바일에서는 1열로 자연스럽게 접히도록 조정했다.

## 반영 내역

- `/portal` 메인 콘텐츠 폭을 `min(100% - 48px, 1480px)` 기준으로 확장
- 상단 헤더는 전체 폭을 사용하고, 주요 CTA를 우측에 고정
- 최근 진단 요약 / 바로 할 수 있는 일 / 다음 행동 / 내 사이트 목록 / 최근 기록 / 계정·사이트 등록을 2열 그리드로 재배치
- 기존 저장 사이트, 재검사, 상세 리포트, 결제, 회원/비회원 흐름은 유지
- `portalAssetList`, `portalPrimary`, `portalFeed`, `saveSiteForm` 등 기존 기능 앵커 유지
- retired app.css 직접 참조 없이 shared CSS 내부에 portal 전용 스코프 스타일 추가
- 860px 이하 화면에서는 1열로 접히도록 반응형 처리

## 검증 결과

- `npm run phase265:final` 통과
- JS 구문 검사 통과
- 105개 테스트 통과
- E2E 통과
- 44개 페이지 무결성 통과
- 24개 라우트 스모크 통과
- 398개 링크 검사 통과
- Phase 264 / Phase 265 / Commercial / Runtime / Pipeline 검증 통과

## 운영 메모

운영 결제, Turnstile, SMTP, 외부 진단 API는 기존과 동일하게 환경변수 실값 주입이 필요하다.

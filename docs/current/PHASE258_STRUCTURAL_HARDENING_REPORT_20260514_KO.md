# PHASE258 구조 결함·오류·충돌 전역 하드닝 보고서

## 목적
PHASE257 패키지를 기준으로 실제 작동 흐름, 서버 라우팅, 공개 API, 결제 진입, 게시판 렌더링, 테스트/CI/릴리즈 게이트, 정적 자산, 전역 입력 처리, 패키지 정리 상태를 재검수하고 구조 결함·오류·충돌을 제거했다.

## 실제 결함으로 확인되어 수정한 핵심
- `/api/public/scan`은 제품 설명과 테스트 기준에는 존재했지만 실제 호출 시 404를 반환했다. 공개 진단 라우트가 `/api/public/diagnose`만 처리하고 있었기 때문이다.
- Turnstile 활성화 시 무료 진단 검증 호출 인자 순서가 잘못되어 토큰 대신 IP가 검증 대상으로 들어갈 수 있었다.
- GitHub Actions와 루트 테스트 스크립트가 삭제된 과거 phase 명령을 참조해 CI/릴리즈 단계에서 실패할 수 있었다.
- 런타임 클린 검증은 릴리즈 패키지에 `runtime` 폴더가 없으면 실패하는 구조였다.
- 게시판 카드의 내부 링크 렌더링은 같은 사이트 경로만 허용한다는 보장이 약했다.
- 외부 결제 SDK/프레임 정책을 고려하지 않은 CSP 설정으로 결제창이 막힐 가능성이 있었다.

## 수정·개선 항목
1. `/api/public/scan` 404 결함 수정.
2. `/api/public/diagnose` 기존 호환 유지.
3. 공개 무료 진단 라우트가 scan/diagnose 양쪽을 동일 엔진으로 처리하도록 정리.
4. Turnstile 검증 함수 호출 순서 수정.
5. Turnstile 비활성/활성 조건 모두에서 진단 흐름이 유지되도록 보정.
6. 라이브 스모크 테스트로 `/api/public/scan` 정상 응답 확인.
7. 라이브 스모크 테스트로 `/api/public/diagnose` 정상 응답 확인.
8. `package.json` 버전을 PHASE258 구조 하드닝 기준으로 갱신.
9. `phase258:final` 최종 검증 명령 추가.
10. `phase257:final`을 PHASE258 최종 게이트로 연결해 과거 명령 사용 시에도 최신 검증 실행.
11. `test:e2e` 명령 추가.
12. `ci:strict` 명령 추가.
13. `validate:commercial` 명령 추가.
14. `validate:commercial-runtime` 명령 추가.
15. `validate:pipeline` 명령 추가.
16. `pipeline:release` 명령 추가.
17. `final:review` 명령 추가.
18. 오래된 `phase107-complete-pipeline.yml` 제거.
19. 오래된 `phase108-commercial-100.yml` 제거.
20. GitHub Actions CI를 lockfile 유무와 무관하게 설치 가능하도록 보강.
21. GitHub Actions CI가 PHASE258 최종 검증을 실행하도록 보정.
22. commercial release workflow의 설치 단계 안정화.
23. `RUN_ALL_TESTS.sh`의 과거 phase203 참조 제거.
24. `RUN_ALL_TESTS.sh`를 PHASE258 최종 검증 기준으로 교체.
25. runtime 폴더가 없는 정리형 릴리즈 패키지도 clean 상태로 인정하도록 검증 수정.
26. runtime 폴더가 있을 경우에는 db/session/upload/backup/report 잔재 검사를 유지.
27. `pipeline:release`가 runtime 없음 상태에서도 정상 통과하도록 보정.
28. `scripts/test-all.mjs` 결과 파일명을 PHASE258 기준으로 갱신.
29. `scripts/ci-strict.mjs` 결과 파일명을 PHASE258 기준으로 갱신.
30. `scripts/pipeline-release-gate.mjs` 결과 파일명을 PHASE258 기준으로 갱신.
31. PHASE258 전용 구조 검증 스크립트 추가.
32. PHASE258 전용 테스트 브리지 추가.
33. E2E 테스트를 현재 제품 흐름 기준으로 재작성.
34. CSP `script-src`에 PortOne SDK 허용 도메인 추가.
35. CSP `connect-src`에 PortOne API/SDK 통신 허용 도메인 추가.
36. CSP `frame-src`에 PortOne 결제 프레임 허용 도메인 추가.
37. Turnstile frame 허용 조건은 기존처럼 활성화 시에만 추가되도록 유지.
38. 게시판 내부 링크를 `safeLocalPath()`로 제한.
39. 게시판 링크 attribute escape 보강.
40. 게시글 ID를 DOM id로 사용할 때 안전한 문자만 남기도록 정리.
41. 게시판 변수명 `seoSummary`를 `riskSummary`로 변경.
42. 게시판의 사용하지 않는 `matchesQuery` 함수 제거.
43. 서버 검색 결과에 클라이언트 재필터링이 중복 적용되는 구조 제거.
44. 게시판 검색어 길이 제한 추가.
45. 게시판 검색어 공백 정규화 추가.
46. 게시판 검색 요청에 AbortController 적용.
47. 게시판 검색 fetch에 `cache: no-store` 적용.
48. 게시판 로딩 중 `aria-busy` 상태 반영.
49. 게시판 로딩 중 검색 버튼/탭 비활성화 처리.
50. 게시판 fetch abort 시 불필요한 오류 메시지가 뜨지 않도록 처리.
51. 전역 URL 입력 필드 hardening 함수 추가.
52. URL 입력 필드에 `inputmode=url` 적용.
53. URL 입력 필드에 `autocomplete=url` 적용.
54. URL 입력 필드에 `spellcheck=false` 적용.
55. URL 입력 최대 길이 300자 제한 적용.
56. URL 입력 폼 submit 시 입력값을 정상 전달하도록 보강.
57. URL 입력 오류 안내 영역의 접근성 속성 보강.
58. checkout 결제 설정 fetch에 `cache: no-store` 적용.
59. checkout 상품 목록 fetch에 `cache: no-store` 적용.
60. PortOne SDK 준비 대기 루프를 늘려 느린 네트워크에서 실패 가능성 완화.
61. 공유 HTML 유틸에 `safeLocalPath()` 추가.
62. 공유 HTML 유틸에 `clampText()` 추가.
63. 전역 CSS에 PHASE258 구조 하드닝 블록 추가.
64. 검색 입력/버튼 조합의 모바일 줄바꿈 보강.
65. 비활성 버튼 상태 스타일 추가.
66. `aria-busy` 상태 스타일 추가.
67. skip-link focus 스타일 보강.
68. 게시판 리스크 메타 영역의 구버전 SEO 주석 제거.
69. 과거 PHASE21/PHASE23 보고서 잔재 제거.
70. 패키지 납품 폴더명을 PHASE258 기준으로 정리.

## 검증 결과
- `npm run check:syntax` 통과
- `npm test` 통과
- `npm run test:e2e` 통과
- `npm run check:pages` 통과
- `npm run test:routes` 통과
- `npm run check:links -- --summary` 통과
- `npm run test:phase258` 통과
- `npm run validate:phase258` 통과
- `npm run validate:commercial` 통과
- `npm run validate:commercial-runtime` 통과
- `npm run validate:pipeline` 통과
- `npm run pipeline:release` 통과
- `npm run phase258:final` 통과

## 운영 환경에서 별도 확인 필요한 항목
로컬 패키지에서는 실제 PG 상점 승인, 라이브 키 유효성, 웹훅 수신, 운영 도메인 DNS/HTTPS, 실서버 프로세스 매니저와 cron 상태는 확인할 수 없다. 배포 후 운영 환경에서 별도 확인해야 한다.

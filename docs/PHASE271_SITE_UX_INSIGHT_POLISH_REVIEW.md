# PHASE271 사이트 UX·인사이트·요금·로그인 개선 검수 보고서

## 반영 범위

1. 내 사이트 화면을 2열 대시보드로 재구성했습니다.
   - 좌측: 최근 진단 요약, 핵심 KPI, 다음 행동, 사이트 목록
   - 우측: 바로 할 일, 인사이트 발행 기록, 계정 상태, 사이트 등록

2. 조잡하게 보이던 내 사이트 지표를 인포그래픽 카드로 정리했습니다.
   - 즉시 보완, 경고 상태, 실행 필요, 검사 대상, 발견 항목, 관리 정상으로 재분류
   - 색상 바와 카드 규격을 통일해 시인성을 높였습니다.

3. 인사이트 표시 동작을 보완했습니다.
   - 내 사이트 화면이 `/api/public/board`를 직접 조회하도록 변경했습니다.
   - 저장된 boards만 보던 구조를 보완해 공개 칼럼 API와 서버 fallback 칼럼을 함께 사용합니다.
   - 발행 주기, 최근 발행, 상태를 내 사이트 화면에서 확인할 수 있습니다.

4. 20분당 1회 글 발행 구조를 점검·보강했습니다.
   - 기본 발행 주기: `20 * 60_000` ms
   - 서버 interval, 게시판 API, 포털 요약 API가 모두 같은 주기를 참조합니다.
   - `publicationCadence` 응답에 `intervalMinutes`, `label`, `lastPublishedAt`, `createdOnThisRequest`를 포함했습니다.

5. 요금 안내 페이지를 재배치했습니다.
   - 헤더가 본문 아래로 밀려 있던 구조를 정상화했습니다.
   - 상단 여백, 카드 간격, FAQ, 하단 푸터를 메인페이지와 유사한 깔끔한 구조로 정리했습니다.

6. 로그인 페이지 자동 삽입 문제를 보강했습니다.
   - 이메일/비밀번호 input의 기본 value 속성을 제거했습니다.
   - `autocomplete="new-password"`, 임의 name, 클라이언트 반복 초기화로 브라우저 자동 삽입 노출을 억제했습니다.
   - URL query/email 기반 자동 채움은 사용하지 않습니다.

7. 전체 가독성/규격 정리
   - 글씨 크기, 카드 radius, shadow, 색상, 여백, 버튼 높이, 모바일 반응형 규격을 조정했습니다.

## 주요 변경 파일

- `apps/public/portal/index.html`
- `apps/public/portal/app.css`
- `apps/public/portal/app.js`
- `apps/public/plans/index.html`
- `apps/public/plans/app.css`
- `apps/public/auth/index.html`
- `apps/public/auth/app.js`
- `server/index.mjs`
- `server/routes/public.mjs`
- `scripts/validate-phase271-site-ux-insight-polish.mjs`
- `package.json`
- `.github/workflows/ci.yml`
- `RUN_ALL_TESTS.sh`

## 최종 검증

- `npm run phase271:final` 통과
- Syntax 155개 통과
- 기본 테스트 105/105 통과
- E2E 통과
- 페이지 라우트 44개 통과
- 라우트 스모크 24개 통과
- 링크 416개 통과
- Phase258 90/90 통과
- Phase259 35/35 통과
- Phase260 25/25 통과
- Phase264 통과
- Phase265 통과
- Phase268 15/15 통과
- Phase269 20/20 통과
- Phase270 runtime 28/28 통과
- Phase270 full package 20/20 통과
- Phase271 site UX insight polish 22/22 통과
- Commercial / Runtime / Pipeline / Security / Deploy 검증 통과
- Runtime clean 검사 통과

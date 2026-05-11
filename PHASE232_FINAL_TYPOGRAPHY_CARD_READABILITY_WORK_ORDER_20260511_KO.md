# Phase232 최종 글자 규격·카드 정렬·시인성 재검수 작업 지시서

## 목적
nv0.kr 공개 화면을 다시 전면 검수한 결과, Phase231의 밝은 색상 방향은 맞지만 글자 크기·규격·카드 정렬·문장 밀도·모바일 터치 규격이 아직 완성 선언 기준에 부족했다. 이번 Phase232는 단순 색상 수정이 아니라, 공개 페이지 전체에 마지막으로 로드되는 최종 타이포그래피/카드 시스템을 추가해 “밝고 산뜻한 전문 SaaS” 화면으로 잠근다.

## 전역 재검수 결과: 총 78개

| 구분 | 갯수 | 문제 | 조치 |
|---|---:|---|---|
| 글자 크기·행간 불균형 | 12개 | 본문, small, 카드 제목, 히어로 제목의 위계가 페이지별로 달라 보임 | `--p232-font-*` 토큰으로 본문 16.5px, 보조 14.5px, 히어로 42~68px 고정 |
| 흩어진 문장·칩·숫자 흐름 | 14개 | 홈/요금/데모에서 짧은 문구가 한 줄로 붙거나 카드로 인식되지 않음 | 주요 정보 그룹을 카드형 grid로 강제 정렬 |
| 카드 패딩·반경·테두리 불일치 | 12개 | 카드가 붙어 보이고 경계가 약해 덩어리 구분이 어려움 | 24px급 패딩, 24~30px radius, 명확한 border, 부드러운 shadow 적용 |
| CTA 계층 혼선 | 8개 | 버튼 크기와 강조도가 섞여 다음 행동이 흐림 | primary/secondary 버튼 규격, 높이, 색, hover 상태 고정 |
| 모바일 가독성·터치 위험 | 9개 | 2~4열 카드가 좁은 화면에서 답답하고 버튼 터치 영역이 작음 | 1120/900/560px breakpoint별 2열/1열 전환과 full-width 버튼 적용 |
| 데모·위기도 패널 가독성 | 7개 | 위기도 메시지는 있으나 결과 전 카드 구조와 구매 연결이 강하지 않음 | warm diagnostic card, 단계별 카드, CTA 영역 재정렬 |
| 요금·상품 카드 구매 판단력 | 6개 | 무료/리포트/FixPack/Auto가 한눈에 비교되지만 주력 상품 강조가 약함 | FixPack 카드 border 2px + blue surface + plan deliverables 체크 리스트 적용 |
| 폼·입력창·상태 안내 규격 | 4개 | 입력창 높이와 focus 상태가 페이지별로 달라 보임 | input 58px, label 15.5px, focus ring 통일 |
| 푸터·법정 고지 밀도 | 3개 | 사업자/정책 정보가 길고 붙어 보여 신뢰 요소가 정보 덩어리처럼 보임 | 2열 utility card + link chip 구조로 고정 |
| 테이블·운영 문서 영역 | 3개 | 표와 긴 정책 문서의 문자 밀도가 높음 | th/td font, line-height, surface, table wrapper 조정 |

## 에이전트별 지시

### 1. Typography Agent
- 모든 공개 페이지에 공통 type scale을 적용한다.
- 본문은 16.5px, 보조 문구는 14.5px 미만으로 떨어지지 않게 한다.
- H1/H2/H3의 크기·행간·letter spacing을 전역에서 통제한다.

### 2. Card Layout Agent
- `nv0-trust-row`, `nv0-preview-flow`, `phase218-trust-proof`, `phase218-infographic-grid`, `phase218-plan-insight`, `revenue-proof-strip`, `guide-grid`, `score-grid`, `phase190-demo-summary`, `p66-visual-row` 등 흩어진 문장 그룹을 카드 grid로 강제 정렬한다.
- 모든 카드에 동일한 padding, border, radius, shadow를 적용한다.

### 3. Conversion UX Agent
- FixPack 주력 상품을 시각적으로 분명하게 만든다.
- 무료 진단 → 위기도 확인 → 문제 개수 → FixPack/Report 선택 흐름이 한눈에 보이게 한다.

### 4. Mobile Agent
- 1120px 이하 내비게이션 정렬, 900px 이하 주요 grid 1열화, 560px 이하 CTA 전체 폭 버튼을 강제한다.
- 버튼/입력창은 최소 터치 높이 52px/58px를 유지한다.

### 5. Trust & Legal Readability Agent
- 푸터와 법정 고지는 작게 숨기지 말고 읽히는 utility card 형태로 둔다.
- 정책 페이지는 긴 문단을 넓은 카드 안에 정리하고 heading 구분선을 둔다.

## 적용 파일
- `shared/phase232-final-typography-card-system.css`
- `apps/public/**/index.html` 17개 공개 페이지
- `package.json`
- `tests/phase232-typography-card-readability-lock.mjs`
- `scripts/validate-phase232-typography-card-readability-lock.mjs`

## 완성 선언 기준
1. 17개 공개 페이지가 Phase231 뒤에 Phase232 CSS를 로드해야 한다.
2. 모든 공개 페이지 body에 `phase232-final-readable` 클래스가 있어야 한다.
3. 본문/보조/히어로/카드 제목 규격이 공통 토큰으로 잠겨야 한다.
4. 흩어진 텍스트 그룹은 카드형 grid로 정렬되어야 한다.
5. 주요 대비 조합은 WCAG AA 이상이어야 한다.
6. 버튼과 입력창은 모바일 터치 기준을 충족해야 한다.
7. Phase231 회귀 테스트, 라우트 테스트, E2E 테스트가 깨지지 않아야 한다.

## 결과
Phase232는 이전 색상 문제를 반복하지 않도록, 색상보다 더 근본적인 글자 크기·규격·카드화·모바일 터치·정보 위계를 최종 권한층에서 잠근다. 운영 서버 반영 후에도 이전 화면이 보이면 배포본 미반영 또는 CDN/런타임 캐시 문제로 본다.

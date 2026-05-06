# PHASE207 작업지시서 — 여백·정렬·콘텐츠 보드·20분 자동발행·4천자 CTA 포스팅 보정

## 1. 목적

운영 화면에서 보이는 큰 공백, 카드 정렬 불균형, 콘텐츠 보드 부실화, 자동 발행 주기 불일치, CTA 포스팅 분량 부족 문제를 한 번에 보정한다.

핵심 목표는 다음과 같다.

1. 무료 진단 화면의 데스크톱·태블릿 구간에서 좌측 입력 카드만 남고 우측이 비어 보이는 레이아웃을 제거한다.
2. 콘텐츠 보드는 API 지연, DB 초기화, 빈 데이터 상황에서도 부실한 로딩 상태나 빈 목록으로 떨어지지 않게 한다.
3. 자동 발행 기본 주기를 30분에서 20분으로 변경한다.
4. CTA 자동 발행 글을 약 4천자 기준의 일반 독자용 포스팅으로 확장한다.
5. 글 구조는 문제 인식, 위기감, 제품과 연관된 일반 주제, 실제 확인 요소, FAQ, 마지막 자연스러운 유도 섹션을 포함한다.

## 2. 발견된 주요 문제

### 2.1 무료 진단 화면 여백·정렬 문제

- `shared/design-system.css`의 기존 1280px 이하 미디어쿼리가 `.demo-grid`를 너무 빨리 1열로 접었다.
- 1260px 안팎의 일반 노트북 화면에서 입력 카드는 좌측에 있고 결과 패널은 아래로 밀려, 오른쪽이 크게 비어 보였다.
- `.scan-card`가 grid 컨테이너로 동작하면서 내부 행이 늘어나 입력창과 안내문 사이에 과도한 세로 공백이 생겼다.

### 2.2 콘텐츠 보드 품질 문제

- 공개 보드가 API 응답 지연 또는 빈 DB 상태에서 실질 콘텐츠를 보장하지 못했다.
- 정적 HTML의 기본 게시글 수와 실제 자동 발행 품질 기준이 낮았다.
- 기존 글은 일반 독자가 읽을 정보성 포스팅이라기보다 짧은 운영 안내에 가까웠다.

### 2.3 발행 주기 불일치

- 서버 기본값과 배포 환경 기본값이 `1800000ms`, 즉 30분으로 남아 있었다.
- 요청 기준인 20분 1회 발행에 맞지 않았다.

### 2.4 CTA 글 구조 부족

- 기존 자동 발행 글은 문제 인식과 위기감 조성, 독자 관심 주제, 마지막 자연스러운 CTA 흐름이 부족했다.
- 글 분량도 약 900~1,500자 기준이어서 검색용·고객 설득용 콘텐츠로는 약했다.

## 3. 수정 적용 범위와 갯수

| 구분 | 수정 대상 | 수량 |
|---|---:|---:|
| 무료 진단 레이아웃 | 데스크톱/태블릿 grid, summary card, scan/result panel, mobile breakpoint | 7개 핵심 UI 규칙 |
| 콘텐츠 보드 정적 카드 | 기본 노출 게시글 | 5건 |
| 콘텐츠 보드 API fallback | 빈 DB/API 지연 시 보장 게시글 | 5건 |
| 콘텐츠 보드 통계 | total, cta, notice, case, recent7d, filteredTotal | 6개 지표 |
| 자동 발행 주기 | 서버 기본값, 진단 패키지 기본값, env/deploy 템플릿 | 12개 파일/설정 지점 |
| CTA 글 생성기 | 문제 인식, 일반 주제, 위기감, 검색 정리, 최종 CTA 섹션 | 5개 핵심 섹션 추가 |
| 런타임 데이터 | boards 5건, publications 5건 | 10개 데이터 레코드 |
| 검증 스크립트 | phase207 전용 검증 | 54개 체크 |

## 4. 주요 변경 파일

### 4.1 레이아웃

- `shared/design-system.css`
  - `PHASE207` 전용 레이아웃 블록 추가
  - 981px 이상에서 무료 진단 결과 영역 2열 유지
  - 980px 이하에서만 1열 전환
  - `scan-card`, `result-panel` 내부 정렬을 상단 기준으로 고정

### 4.2 콘텐츠 보드

- `apps/public/board/index.html`
  - 초기 통계값을 5건 기준으로 갱신
  - 5개 기본 게시글 카드 삽입
  - 자동 발행 주기 20분, 4천자 내외 기준 문구 반영

- `apps/public/board/app.js`
  - fallback 게시글 5건으로 확장
  - API가 빈 목록을 반환해도 fallback 노출
  - 로딩 상태 대신 “4천자 내외 기본 포스팅” 안내 표시
  - 필터/통계/최근활동 fallback 보정

- `server/routes/public.mjs`
  - `/api/public/board`에서 DB가 비어도 seed 게시글 5건 반환
  - `fallbackSeeded` 응답 필드 추가

### 4.3 자동 발행 엔진

- `server/index.mjs`
  - 기본 발행 주기 `20 * 60_000`으로 변경
  - CTA 글 기준 `3800-4500`으로 변경
  - 공개 변환 글에 문제 인식, 위기감, 일반 주제, 최종 CTA 포함

- `server/core/cta-publication.mjs`
  - `p207-4000-char-problem-aware-cta-v1` 버전 적용
  - 자동 발행 본문에 다음 섹션 추가
    - 문제 인식과 위기감
    - 제품과 연관된 일반 주제
    - 지금 놓치면 생길 수 있는 일
    - 마지막 섹션: 자연스러운 안내

- `server/core/diagnosis-report-package.mjs`
  - 자동발행 기본 주기 20분 기준 반영
  - 목표 분량 `3800-4500` 반영

### 4.4 환경값

다음 파일의 기본 자동 발행 주기를 `1200000ms`로 변경했다.

- `.env.example`
- `.env.coolify.example`
- `docker-compose.yml`
- `deploy/coolify.env.bulk.txt`
- `deploy/coolify.env.example`
- `deploy/docker-compose.coolify.yml`
- `deploy/env.commercial.template`
- `deploy/env.production.nv0.kr.example`
- `deploy/env.production.template`
- `scripts/generate-r2-coolify-env.mjs`

## 5. 새 기본 게시글 5건

1. 결제 버튼 앞에서 고객이 멈추는 이유와 안내 정리법
2. 문의폼 이탈을 줄이는 개인정보 안내와 응답 기준 정리
3. 푸터 사업자 정보만 정리해도 사이트 신뢰가 달라지는 이유
4. 모바일 화면에서 CTA와 정책 링크가 밀리지 않게 정리하는 방법
5. 광고 유입 랜딩페이지에서 위기감을 만들고도 신뢰를 잃지 않는 문구 구조

각 글은 약 3,800자 이상이며 다음 구조를 포함한다.

- 왜 이 글을 썼나요?
- 문제 인식과 위기감
- 독자가 관심 있어할 일반 주제
- 실제로 확인할 요소
- 지금 놓치면 생길 수 있는 일
- 실제 적용 예시
- 문구를 쉽게 바꾸는 방법
- 검색에 잘 읽히게 정리하는 방법
- 자주 묻는 질문
- 마지막 섹션: 자연스러운 안내
- 관련 링크
- 해시태그

## 6. 검증 결과

통과한 검증은 다음과 같다.

- `npm run check:syntax` — 233개 소스 통과
- `npm run check:pages` — 34개 라우트 통과
- `npm run test:routes` — 24개 라우트 통과
- `npm run test:all` — 87/87 통과
- `npm run validate:phase204` — 통과
- `npm run validate:phase205` — 통과
- `npm run validate:phase206` — 통과
- `npm run validate:phase207` — 54/54 통과
- `npm run phase207:final` — 통과

## 7. 배포 지시

1. 제공된 ZIP을 운영 서버에 배포한다.
2. 배포 환경 변수 `NV0_CTA_AUTOPUBLISH_INTERVAL_MS`가 있다면 반드시 `1200000`으로 맞춘다.
3. Cloudflare 캐시는 최소 다음 경로를 purge한다.
   - `/shared/design-system.css`
   - `/apps/public/board/app.js`
   - `/board`
   - `/products/veridion/demo`
4. 확실한 반영을 위해 개발 기간에는 Purge Everything을 권장한다.
5. 배포 후 `/api/public/board` 응답의 `publishIntervalMinutes`가 `20`인지 확인한다.
6. `/board`에서 게시글 5건과 4천자 내외 본문이 보이는지 확인한다.
7. `/products/veridion/demo`에서 981px 이상 구간에 결과 패널이 아래로 밀리지 않는지 확인한다.

## 8. 롤백 기준

다음 문제가 발생하면 직전 Phase206 패키지로 롤백한다.

- 서버가 부팅되지 않음
- `/api/public/board`가 500 응답
- `/products/veridion/demo`의 핵심 CTA 또는 입력 폼이 사라짐
- `/board`에서 게시글 카드가 0건으로 노출
- 자동 발행 주기가 20분이 아닌 값으로 동작

롤백 후에는 `shared/design-system.css`, `server/index.mjs`, `server/routes/public.mjs`, `apps/public/board/app.js`, `runtime/data/db.json`의 변경점을 우선 재검토한다.

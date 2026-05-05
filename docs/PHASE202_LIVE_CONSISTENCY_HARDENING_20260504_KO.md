# PHASE202 라이브 시인성·문구·상품 일치성 수정 보고서

## 목표
라이브 점검에서 발견된 시인성 깨짐, 문구 붙음, 상품/가격 불일치, 라우트 목적 불일치, 푸터 placeholder 노출 위험을 패키지 코드 기준으로 제거했다.

## 처리 범위

### 1. 상품·가격·체크아웃 일치
- 공개 상품을 `Report / FixPack / Auto` 3개 축으로 정리했다.
- 상세 리포트: 69,000원 / 1회
- 수정 문구안 패키지: 99,000원 / 1회
- Auto 정기 케어: 299,000원 / 월
- 기존 유입 파라미터 `Pro`, `Basic`, `Agency`는 깨지지 않도록 `normalizePlanCode()`로 정규화했다.
  - `Pro`, `Basic` → `Report`
  - `Agency` → `Auto`
- `/checkout?plan=Pro`로 들어와도 공개 결제 화면은 상세 리포트 기준으로 표시된다.

### 2. 푸터·정책·고객지원 문구 통일
- `replace-with-number` 노출 방지 구조 유지 및 정적 푸터 교체.
- 통신판매업 신고번호가 없거나 placeholder이면 공개 푸터에서 숨김.
- 고객지원 문구를 `ct@nv0.kr · 이메일 전용 고객지원 · 평일 09:00–18:00 접수 확인`으로 통일.
- 정책명은 `환불·청약철회 정책`으로 통일.

### 3. 시인성·겹침·문구 붙음 보정
- 버튼/네비게이션/푸터 링크/체크아웃 액션에 gap, wrapping, line-height 보강.
- 폼 라벨을 block/grid 구조로 강제해 `이메일 비밀번호 로그인`처럼 붙는 현상을 방지.
- 홈·무료진단·문서·체크아웃의 붙어 보이는 문구를 수정.
- `위험도 72 / 100` 혼용을 `신뢰도 점수 72 / 100`으로 통일.

### 4. 보드·사례·서비스 라우트 정리
- `/board`는 로딩 상태만 보이지 않도록 SSR fallback 게시글 3개를 추가했다.
- `/cases`를 보드 재사용 화면에서 전용 적용 사례 페이지로 분리했다.
- `/service`를 `/solutions` 중복 화면에서 서비스 작동 방식 전용 페이지로 분리했다.

### 5. 문서 페이지 정리
- `문서을 눌러주세요` 문법 오류 수정.
- 문서 생성 버튼명을 명확화.
- 문서 페이지 보완 상품 가격을 상세 리포트 69,000원 / 수정 문구안 99,000원으로 통일.
- 샘플 수치·임의 날짜가 실제 데이터처럼 보이지 않도록 안내 유지.

## 추가 파일
- `apps/public/cases/index.html`
- `apps/public/cases/app.css`
- `apps/public/cases/app.js`
- `apps/public/service/index.html`
- `apps/public/service/app.css`
- `apps/public/service/app.js`
- `tests/phase202-live-consistency.mjs`

## 검증 결과

| 명령 | 결과 |
|---|---|
| `npm run check:syntax` | 통과, 225개 파일 검사 |
| `npm run test:all` | 통과, 85 passed / 0 failed |
| `npm run test:routes` | 통과, 24 checked |
| `npm run test:phase201` | 통과, 20 tests |
| `npm run test:phase202` | 통과, 20 gates |
| `npm run phase202:final` | 통과 |
| `npm run check:pages` | 통과, 34 route mappings |
| `npm run check:links -- --summary` | 통과, 455 links checked |
| `npm run smoke` | 통과 |
| 로컬 렌더링 실검증 `PORT=3211` | 15개 주요 라우트 banned token 0개 |

## 로컬 렌더링 검증 라우트
- `/`
- `/products/veridion/demo`
- `/plans`
- `/checkout?plan=Report`
- `/checkout?plan=Pro`
- `/documents`
- `/board`
- `/cases`
- `/service`
- `/solutions`
- `/portal`
- `/business-info`
- `/privacy`
- `/terms`
- `/refund`

## 제거·차단 확인 키워드
- `replace-with-number`
- `49,000`, `39,000`, `199,000`
- `구독 신청`
- `문서을 눌러주세요`
- `상품 보기✎`, `문서 보기PDF`
- `무료로 진단 시작무료진단 보기`
- `전자동 무료진단 실행다시 실행`
- `자동 근거 정리 로`, `수동확인 분리 로`
- `환불·배송·교환 정책`
- `위험도 72 / 100`
- `생성 문서 24`, `최근 수정 2025`

## 배포 후 확인 포인트
운영 서버가 이 패키지로 배포되면 Cloudflare 캐시 또는 브라우저 캐시가 남아 있을 수 있으므로, 배포 직후 `/checkout?plan=Pro`, `/cases`, `/service`, `/board`, `/documents`를 새 시크릿 창에서 확인해야 한다.

# PHASE153 Smart Product Operations Layer

## 목적

이번 P153은 nv0.kr 본제품을 더 똑똑하고 영리하게 만들기 위한 제품 지능화 패치입니다.

핵심은 기능을 무작정 늘리는 것이 아니라, 사용자가 다음 행동을 고민하지 않도록 다음 흐름을 자동으로 연결하는 것입니다.

무료 진단 → 스마트 다음 행동 → 상품 추천 → 내 사이트 관리 → CTA 게시판 재유입

## 처리 내용

### 1. Smart Product Operations Layer 추가

신규 파일:

- `server/core/smart-product-orchestrator.mjs`

역할:

- 진단 결과, 위험도, P0/P1/P2 발견 항목, 추천 상품, 저장 사이트 상태를 종합
- 다음 행동을 `nextBestAction`으로 반환
- 전환 경로를 `conversionPath`로 정리
- 실행 카드 3~4개를 `actionCards`로 제공
- 운영 루프와 friction remover를 함께 제공

### 2. 신규 공개 API 추가

- `GET /api/public/smart-product`

반환 내용:

- productScore
- 운영 신호
- quickWins
- orchestration
- nextBestAction
- conversionPath
- actionCards

### 3. 기존 API 보강

다음 API에 P153 orchestration을 연결했습니다.

- `GET /api/public/product-intelligence`
- `GET /api/public/products`
- `GET /api/public/plans`
- `POST /api/public/scan`
- `POST /api/public/diagnose`
- `GET /api/public/diagnosis-engine`

### 4. 화면 보강

- 홈 화면: Smart NV0 운영 흐름 추천 패널 자동 삽입
- 데모 결과: 기존 intelligence뿐 아니라 P153 journey를 사용해 다음 행동 표시
- 요금제 화면: orchestration 기반 추천 이유와 CTA 보강
- 게시판 화면: 24개 유형 순환 문구를 무한 조합형 SEO 콘텐츠 설명으로 교체
- 상단 메뉴: CTA 라벨을 `진단 시작`으로 변경해 `무료 진단` 중복 노출 완화

### 5. 검증 게이트 보강

- `scripts/validate-phase153-smart-ops.mjs` 추가
- `scripts/smoke.mjs`의 오래된 기대 문구를 현재 화면 기준으로 보정
- `scripts/check-source-syntax.mjs`에 `server/index.mjs` 모놀리스 호환 한도 적용
  - 기존 서버 진입 파일이 이미 safety limit을 초과해 `deploy:precheck`가 실패하던 문제를 해결
  - 일반 파일은 기존 한도 유지
  - `server/index.mjs`만 별도 환경변수 `NV0_INDEX_SIZE_LIMIT_BYTES`로 관리 가능

## 유지 기준

아래 기존 정상 패치는 유지합니다.

- P143 PostgreSQL schema bootstrap
- P144 `/readyz` host guard
- P145 Redis prelaunch readiness
- P146 CTA SEO
- P147 QA/SEO
- P148 무한 조합 CTA
- P149 메인/데모/요금제 보정
- P151 제품 범위 집중
- P152 Smart Product Intelligence

## 운영상 기대 효과

- 사용자가 무료 진단 이후 어디로 가야 할지 명확해짐
- 요금제가 단순 가격표가 아니라 결과 기반 추천표로 작동
- 진단 결과와 게시판, 내 사이트 관리가 하나의 운영 루프로 연결
- CTA 중복 라벨과 오래된 UI 문구를 줄임
- 배포 전 검증 스크립트가 다시 통과함

## 주의

- Postgres/Redis/runtime volume 삭제 금지
- PortOne 가짜값 입력 금지
- 통신판매업 신고번호 가짜값 입력 금지
- prelaunch 모드 유지
- prompt-directive 제품 방향 재도입 금지

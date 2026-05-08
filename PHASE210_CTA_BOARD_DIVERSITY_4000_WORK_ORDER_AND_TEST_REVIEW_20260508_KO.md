# PHASE210 CTA 게시판 중복 발행 제거 및 4천자 전문 글 조합 엔진 작업지시서 / 테스트 리뷰

## 1. 문제 정의
CTA 게시판에 동일하거나 거의 같은 글이 반복 누적되는 문제를 치명 결함으로 분류했다. 원인은 단순 발행 주기가 아니라 다음 두 가지였다.

1. 생성 엔진에서 다양화된 글을 만들더라도 공개 게시판 API가 다시 고정 구조의 본문으로 덮어쓰는 경로가 있었다.
2. 기존 DB에 이미 누적된 CTA 글을 재작성하는 마이그레이션 도구와 중복 검증 게이트가 부족했다.

## 2. 100점 기준 수용 조건
- 같은 입력값으로 200개를 생성해도 제목 200개, 본문 200개가 모두 달라야 한다.
- 기존에 같은 글 200개가 쌓인 상황에서도 마이그레이션 후 제목과 본문이 모두 달라야 한다.
- 본문 길이는 한국어 기준 3,800~4,500자 범위로 맞춘다.
- 구조는 단순 홍보 글이 아니라 독자 이해형 전문 글이어야 한다.
- 중학생도 이해할 수 있는 쉬운 설명 섹션과 운영자가 볼 수 있는 전문 해설 섹션을 함께 넣는다.
- 마지막 문단은 무료 진단, 결과 저장, 상세 리포트, FixPack, Auto 정기 케어로 자연스럽게 이어져야 한다.
- 공개 게시판 API가 더 이상 5~6개 고정 본문으로 덮어쓰지 않아야 한다.

## 3. 수정 설계
### 3.1 생성 엔진
- 엔진 버전: `cta-board-v9.0-phase210-diverse-professional-4000`
- 조합 요소:
  - 기본 글감
  - 업종
  - 고객 질문
  - 글 구성
  - 제목 방식
  - FAQ
  - 고객 단계
  - 어투
  - 사례
  - 마지막 CTA
- 조합 바닥값: 353,894,400개
- 실제 조합은 사이트, 시간, 시드, 발견 항목, 기존 발행 이력까지 섞어 확장된다.

### 3.2 본문 구조
새 CTA 글은 다음 구조를 필수로 가진다.

1. 왜 이 글을 썼나요?
2. 한눈에 보는 핵심 요약
3. 지금 보이는 문제
4. 독자가 관심 있어 할 부분
5. 고객 입장에서 보면
6. 중학생도 이해할 수 있게 말하면
7. 전문적으로 보면
8. 실제로 확인할 요소
9. 바로 고칠 수 있는 것
10. 문구를 쉽게 바꾸는 방법
11. 독자가 계속 읽는 구성
12. 검색에 잘 읽히게 정리하는 방법
13. 지금 놓치면 생길 수 있는 일
14. 제목 후보
15. 자주 묻는 질문
16. 다음에 할 일
17. 관련 링크

### 3.3 공개 게시판 API 수정
`toPublicBoardPost()`가 CTA 글을 고정 템플릿으로 덮어쓰던 흐름을 제거하고, `rewriteExistingCtaPublication()` 기반의 안정 시드 재작성으로 변경했다.

- 기준 파일: `server/index.mjs`
- 핵심 변경:
  - 기존 글 ID, 지문, 생성시각을 기반으로 stable seed 생성
  - 각 게시글마다 stableOffset 부여
  - 공개 API 응답에 `phase210Audit` 포함
  - `publicDisplayVersion`을 `phase210-diverse-professional-4000-board`로 지정

### 3.4 자동발행 중복 방지 수정
`createCtaPublication()` 내부 반복 후보 생성 시 `sequenceOffset`이 실제 본문 생성 함수로 전달되도록 수정했다.

- 이전 위험: 후보를 여러 번 뽑아도 본문 생성 시 offset이 충분히 반영되지 않을 수 있음
- 수정 후: 후보 선택과 본문 생성이 같은 offset을 사용함

### 3.5 기존 200개 중복 글 복구 도구
신규 스크립트:

```bash
npm run migrate:phase210-cta
```

기능:
- `runtime/data/db.json`의 boards/publications CTA 글 탐지
- 기존 ID와 생성일 유지
- 제목, 본문, 요약, 태그, SEO 메타, 본문 지문 재작성
- 실행 전 자동 백업 생성
- `--dry-run` 지원

## 4. 수정 파일
- `server/core/cta-publication.mjs`
- `server/index.mjs`
- `tests/phase210-cta-diversity-4000.mjs`
- `scripts/validate-phase210-cta-diversity.mjs`
- `scripts/migrate-phase210-cta-board-diversity.mjs`
- `package.json`
- `runtime/data/db.json`

## 5. 로컬 런타임 DB 복구 결과
로컬 패키지의 `runtime/data/db.json` 기준으로 실제 마이그레이션을 실행했다.

```json
{
  "ok": true,
  "before": {
    "ctaRows": 10,
    "duplicateRows": 10
  },
  "after": {
    "ctaRows": 10,
    "duplicateRows": 0,
    "uniqueTitles": 10,
    "uniqueBodies": 10
  },
  "rewrittenCount": 10,
  "failedAudits": []
}
```

운영 서버 DB에 이미 쌓인 200개 글은 배포 후 운영 환경에서 `npm run migrate:phase210-cta`를 1회 실행해야 실제 운영 데이터가 재작성된다. 이 패키지 안에서는 운영 DB에 직접 접근할 수 없다.

## 6. 테스트 리뷰
### 6.1 PHASE210 조합 테스트
```bash
npm run test:phase210
```

결과:
```json
{
  "ok": true,
  "generated": {
    "count": 200,
    "uniqueTitles": 200,
    "uniqueBodies": 200
  },
  "migrated": {
    "count": 200,
    "uniqueTitles": 200,
    "uniqueBodies": 200
  }
}
```

### 6.2 PHASE210 검증
```bash
npm run validate:phase210-cta
```

결과:
```json
{
  "ok": true,
  "generatedArticles": 80,
  "generatedUniqueTitles": 80,
  "generatedUniqueBodies": 80,
  "rewrittenArticles": 80,
  "rewrittenUniqueTitles": 80,
  "rewrittenUniqueBodies": 80,
  "targetLengthKo": "3800-4500",
  "readabilityTarget": "middle_school_korean"
}
```

### 6.3 전체 회귀 테스트
```bash
npm run phase210:final
npm run test:all
```

결과:
- `phase210:final`: 통과
- `phase209:final`: 통과
- `phase208:final`: 통과
- `validate:phase208-cta`: 43/43 통과
- `validate:phase209-product-100`: 28/28 통과
- `test:all`: 84/84 통과

### 6.4 공개 게시판 API 실측
로컬 서버 실행 후 `/api/public/board` 응답을 확인했다.

결과:
```json
{
  "ok": true,
  "count": 5,
  "uniqueTitles": 5,
  "uniqueBodies": 5,
  "lengths": [4195, 4193, 4233, 4204, 4224],
  "failedAudits": 0
}
```

## 7. 배포 후 운영 적용 순서
1. 새 패키지 배포
2. 서버 환경변수에서 20분 자동발행 유지 확인
   - `NV0_CTA_AUTOPUBLISH_INTERVAL_MS=1200000`
3. 운영 DB 중복 글 재작성
   ```bash
   npm run migrate:phase210-cta
   ```
4. 공개 게시판 확인
   ```bash
   curl https://nv0.kr/api/public/board
   ```
5. 제목, 본문 길이, `phase210Audit.ok`, `uniqueBodies` 확인

## 8. 롤백 기준
- 마이그레이션 실행 시 생성되는 `db.json.phase210-backup-*` 파일로 되돌린다.
- 코드 롤백은 `server/core/cta-publication.mjs`, `server/index.mjs`, `package.json`을 이전 패키지 버전으로 복구한다.
- 단, 이전 버전은 공개 게시판 고정 본문 덮어쓰기 문제가 남아 있으므로 운영 롤백은 데이터 백업 복원만 우선 권장한다.

## 9. 판정
PHASE210 기준 CTA 게시판 중복 발행 문제는 로컬 패키지와 검증 게이트 기준으로 해결 완료다. 신규 생성 200개, 기존 중복 200개 재작성 시나리오 모두 제목과 본문이 100% 다르게 생성되는 것을 확인했다.

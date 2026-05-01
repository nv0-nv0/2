# PHASE148 무한 조합형 CTA·SEO 발행 엔진 패치

## 목적
기존 P146/P147의 24개 CTA 주제팩은 반복을 줄이는 출발점이었지만, 장기 운영 시 주제팩이 다시 순환되어 제목·본문·FAQ·CTA 패턴이 유사해질 수 있었다. P148은 주제 수를 단순히 늘리는 방식이 아니라, 기본 주제팩 위에 검색의도, 고객단계, 업종, 페르소나, 본문 구조, FAQ, CTA, 내부링크, 시드 값을 조합하는 방식으로 변경했다.

## 핵심 변경
1. 24개 주제팩은 유지하되, 고정 결과물이 아니라 조합 엔진의 베이스로 사용한다.
2. 조합 축을 추가했다: 검색 의도, 고객 퍼널 단계, 업종/사이트 타깃, 운영자 페르소나, 콘텐츠 아키타입, 후킹 문장, 문단 구조, FAQ 조합, CTA 스타일, 내부링크 흐름, 발행 시드/최근 이력.
3. `/api/public/board`와 `/api/public/diagnosis-engine`에 `combinationStats`를 노출한다.
4. 게시판 상태 문구를 `기본 주제팩 24개 · 무한 조합형 생성`으로 변경했다.
5. 자동 발행 중복 탐색 범위를 48회에서 144회로 확대했다.
6. 게시글 저장 메타데이터에 `baseCtaType`, `combinationMode`, `combinationKey`, `contentArchetype`, `audienceSegment`를 추가했다.
7. 제목과 본문 fingerprint가 모두 달라지도록 선택 제목, 조합 축, FAQ, CTA를 본문에 반영했다.

## 조합 규모
검증 기준 최소 조합 바닥값은 353,894,400개다. 여기에 실제 사이트 URL, 업종, 진단 결과, 발견 항목, 발행 시점, 최근 발행 이력, sequenceOffset이 추가되므로 생성 공간은 고정 개수로 닫히지 않는다.

실제 의미의 무한대는 서버 저장공간과 발행 횟수 제한이 있으므로 물리적 무제한이라는 뜻은 아니다. 운영 관점에서는 같은 24개 글 유형을 반복하는 것이 아니라, 계속 다른 조합으로 발행되는 구조라는 의미다.

## 수정 파일
- `server/core/cta-publication.mjs`
- `server/index.mjs`
- `apps/public/board/app.js`
- `scripts/validate-phase148-unbounded-cta.mjs`

## 검증 기준
P148 검증 스크립트는 240개 샘플을 생성해 아래를 확인한다.
- 제목 240/240 고유
- 본문 fingerprint 240/240 고유
- CTA 타입 240/240 고유
- 조합키 240/240 고유
- 검색 의도 최소 6종 이상
- 콘텐츠 아키타입 8종 이상
- 페르소나 10종 이상

## 롤백 기준
1. 게시판 렌더링 문제: `apps/public/board/app.js`만 P147로 복구
2. CTA 발행 문제: `server/core/cta-publication.mjs`만 P147로 복구
3. API 응답 문제: `server/index.mjs`만 P147로 복구
4. 전체 문제: P147 전체 ZIP으로 롤백

Postgres, Redis, runtime volume은 삭제하지 않는다.

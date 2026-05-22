# PHASE280 제품 인사이트 엔진·에이전트 재구성 보고서

## 목적
인사이트 발행이 실제 게시판에 안정적으로 반영되지 않을 수 있는 구조를 제거하고, 제품과 연관된 엔진/에이전트를 패키지 전체 기준으로 재구성했습니다. 핵심 기준은 `20분마다 1회 자동 발행`, 발행 전 품질 검수, 공개 게시판 동기화, 제품 흐름 연결성입니다.

## 확인된 원인
기존 발행 로직은 공개 칼럼을 만든 뒤 `boardType === 'cta'` 항목을 필터링하는 구조가 있어 생성 직후 게시판/발행 목록에서 제외될 수 있었습니다. 이 때문에 사용자는 인사이트가 생성되지 않거나 제대로 노출되지 않는 것처럼 볼 수 있었습니다.

## 적용한 구조
- `server/core/product-agent-suite.mjs` 신규 추가
- 제품 컨텍스트 엔진: 사이트, 진단, 주문, 게시판, 발행 데이터를 제품 흐름으로 통합
- 인사이트 생성 엔진: 무료 진단, 기본 리포트, 전문가 리포트, 내 사이트, 게시판 흐름을 바탕으로 글 생성
- 품질 검수 에이전트: 제목, 본문 길이, 제품 관련성, 내부 링크, 태그, 중복, 내부 토큰, 가독성 검수
- 발행 스케줄러 에이전트: 20분 미만 중복 발행 차단, 20분 도달 시 발행 허용
- 게시판 동기화 에이전트: `publications`와 `boards`에 동시에 저장해 공개 게시판 노출 보장
- 제품 상태 API: `/api/public/product-agent-status`
- 관리자 패키지 감사 API: `/api/admin/product-agents/audit`

## 자동 발행 기준
- 기본값: `20 * 60 * 1000` ms
- 설정 키:
  - `ctaAutopublishIntervalMs`
  - `productInsightAutopublishIntervalMs`
  - `productInsightAutopublishEnabled`
- 서버 시작 시 due check 수행
- 운영 중 `setInterval`로 20분마다 due check 수행
- `/api/public/board` 요청 시에도 due 상태를 확인해 발행 누락을 보정

## 제품 연관성 강화
새 인사이트는 단순 게시글이 아니라 다음 제품 흐름과 연결됩니다.

1. 무료 진단 실행
2. 진단 결과 저장
3. 기본 리포트 또는 전문가 리포트 선택
4. 내 사이트에서 반복 점검
5. 공개 게시판 인사이트로 재유입

## 최종 검증
`npm run phase280:final` 통과.

- 문법 검사 통과
- 105개 테스트 통과
- E2E 통과
- 44개 페이지 무결성 통과
- 24개 라우트 스모크 통과
- 372개 링크 검사 통과
- 보안 검증 통과
- 배포 번들 검증 통과
- phase276 회귀 검증 통과
- phase277 회귀 검증 통과
- phase278 회귀 검증 100/100 통과
- phase279 시각 QA 100/100 통과
- phase280 제품 에이전트 감사 100/100 통과

## 주요 산출물
- `server/core/product-agent-suite.mjs`
- `scripts/validate-phase280-product-agent-insight.mjs`
- `docs/current/PHASE280_PRODUCT_AGENT_INSIGHT_AUDIT.json`
- `docs/PHASE280_PRODUCT_AGENT_INSIGHT_REPORT.md`

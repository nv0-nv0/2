# PHASE160 Evidence-first Diagnosis Completion

## 목적

데모와 서비스 진단 결과가 실제보다 과장되어 보이지 않도록, 제품 구조를 `정확 진단`이 아니라 `공개 페이지 기준 예비 점검`으로 재정의했습니다. 진단 결과에는 점수만 노출하지 않고 확인한 페이지, 탐지 근거, 신뢰도, 한계, 수동 검토 필요 여부를 함께 표시하도록 수정했습니다.

## 반영 범위

- 메인/요금제/데모 카피에서 과장 표현 완화
- 데모 결과 UI를 근거 중심 구조로 재설계
- 내장 진단 엔진 결과에 evidenceSummary, scoreModel, qualityAssurance 추가
- 각 finding에 sourcePages, evidence, certainty, limitation, manualReviewRequired 추가
- 법률 판단/매출 성과/정확도 보장 표현 제거
- Gemini API는 선택형 AI 리뷰 레이어로만 추가
- Gemini가 측정 원천이 아니라 요약·분류·권장 조치 보조 역할임을 코드와 응답 구조에 명시
- 외부 스캔 API 결과에도 동일한 evidence-first contract 보정 적용
- 리포트 패키지 생성 구조도 evidence-first 표준으로 변경
- 환경변수 예시에 Gemini 선택 연동값 추가
- PHASE160 검증 스크립트 추가

## Gemini 적용 방식

기본값은 비활성화입니다.

```env
NV0_AI_REVIEW_PROVIDER=disabled
NV0_GEMINI_API_KEY=
NV0_GEMINI_MODEL=gemini-2.5-flash
```

운영자가 실제 키를 넣고 `NV0_AI_REVIEW_PROVIDER=gemini`로 설정한 경우에만 Gemini 리뷰가 실행됩니다. 실행되더라도 Gemini 결과는 진단의 원천 데이터가 아니라, 이미 수집된 결과를 구조화·요약하는 보조 레이어로 저장됩니다.

## 결과 구조 변경

### 기존 방향

- 위험도 점수 중심
- 정확 진단처럼 보일 수 있는 카피
- 사용자가 왜 그런 결과가 나왔는지 확인하기 어려움

### 변경 방향

- 탐지 점수 + 수집 신뢰도 + 확인 페이지 수 + 수동 검토 필요 항목 표시
- 각 항목에 확인 URL, 근거 문구, 신뢰도, 한계 표시
- 법률 위반 여부나 매출 성과는 보장하지 않음
- 공개 페이지 기준으로 확인하지 못한 항목은 `없다`가 아니라 `미확인`으로 표시

## 주요 수정 파일

- `server/index.mjs`
- `server/core/diagnosis-report-package.mjs`
- `apps/public/veridion-demo/index.html`
- `apps/public/veridion-demo/app.js`
- `apps/public/veridion-demo/app.css`
- `apps/public/home/index.html`
- `apps/public/plans/index.html`
- `apps/public/plans/app.js`
- `apps/public/solutions/index.html`
- `apps/public/portal/app.js`
- `.env.example`
- `.env.coolify.example`
- `deploy/*.example`
- `package.json`
- `scripts/validate-phase160-evidence-first-diagnosis.mjs`

## 검증 결과

- 문법 검사: 167개 통과
- 전체 테스트: 85개 통과 / 실패 0
- E2E: 통과
- 라우트 스모크: 24개 통과
- 링크 검사: 149개 통과 / 오류 0
- PHASE156 전역 UX 검증: 64개 통과
- PHASE157 비결제 운영 검증: 19개 통과
- PHASE158 PostgreSQL E2BIG 검증: 8개 통과
- PHASE159 메인·데모·게시판 검증: 18개 통과
- PHASE160 근거 기반 진단 검증: 23개 통과
- deploy precheck: 통과
- runtime clean release: 통과

## 운영 전 남은 일

- Gemini를 쓸 경우 실제 API 키 입력
- Search Console API는 고객 사이트 소유권 인증 흐름 설계 후 별도 적용
- Lighthouse/브라우저 렌더링 기반 측정 엔진은 다음 단계에서 추가 권장
- 법률·상거래 판단은 계속 `수동 검토 필요`로 유지


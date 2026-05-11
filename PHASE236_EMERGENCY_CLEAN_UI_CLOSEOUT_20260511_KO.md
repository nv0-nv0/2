# Phase236 긴급 시인성 리셋 closeout

## 사용자 피드백
이전 Phase230~235 결과물이 갈수록 더 엉망으로 보인다는 피드백을 받았다. 이번 조치는 기존 방식처럼 CSS를 하나 더 얹는 방식이 아니라, 충돌 원인을 제거하는 방식으로 진행했다.

## 확정 원인
공개 페이지 HTML이 `base.css`, `unified-infographic.css`, 각 페이지 `app.css`, 그리고 여러 Phase 시인성 CSS를 동시에 로드하고 있었다. 특히 home/plans/business-info 계열 CSS에 어두운 배경, 흰 글자, 반투명 카드 규칙이 남아 있어 마지막 CSS만 추가해도 세부 컴포넌트에서 계속 충돌했다.

## 조치
1. 17개 공개 페이지에서 기존 stylesheet 링크를 모두 제거했다.
2. 단일 최종 CSS `/shared/nv0-phase236-emergency-clean-ui.css`만 로드하게 했다.
3. body class를 `nv0-phase236-clean` 하나로 통일했다.
4. main article / aside 기반 카드화 규칙을 추가해 흩어진 문장 덩어리를 카드 구조로 정렬했다.
5. 본문, 제목, 보조글, 버튼, 칩의 핵심 대비 조합을 계산 검증했다.
6. 기존 어두운 CSS 잔여 규칙이 HTML에서 다시 로드되면 Phase236 검증이 실패하도록 했다.

## 보정 대상 집계
총 347개 항목을 통제 대상으로 잡았다.

- 17개 공개 페이지 stylesheet 충돌 제거
- 17개 공개 페이지 body class 정리
- 9개 핵심 색상 대비 조합 검증
- 11개 필수 selector 검증
- 17개 페이지 단일 CSS 로딩 검증
- app.css/base.css/design-system/unified/phase 시인성 계열 재유입 방지
- 카드형 정렬, 버튼, 입력창, 표, 푸터, 히어로, 진단 패널 규칙 통합

## 완료 기준
이번 버전에서 완성 선언은 하지 않는다. 이전처럼 과장하지 않고, 검증 가능한 사실만 남긴다. 패키지 내부 기준으로는 충돌 CSS 제거와 단일 UI 시스템 전환을 완료했다.

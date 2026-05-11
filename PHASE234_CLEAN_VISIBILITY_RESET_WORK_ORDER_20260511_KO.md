# Phase234 Clean Visibility Reset 작업 지시서

## 문제 인식
Phase230~Phase233 방식은 기존 CSS 위에 새 최종 CSS를 계속 덮는 누적 override 방식이었다. 이 방식은 색상·카드·버튼·본문 규격이 서로 충돌하고, 일부 페이지에서 어두운 테마 잔여 규칙과 밝은 테마 규칙이 동시에 살아나는 문제를 만든다.

## 목표
- 기존 시인성 Phase CSS 링크를 공개 페이지에서 제거한다.
- `nv0-dark` 및 누적 phase body class를 제거한다.
- 단일 전역 디자인 시스템 `nv0-clean-visibility-system.css`만 마지막 stylesheet로 로드한다.
- 밝고 산뜻하며 전문적인 SaaS 톤으로 통일한다.
- 흰 배경/진한 네이비 글자/선명한 블루 CTA/명확한 카드 경계로 대비를 고정한다.
- sr-only, 테스트 호환 문구, smoke coverage 문구가 시각적으로 노출되지 않도록 고정한다.

## 에이전트별 작업
1. Visual Reset Agent
   - phase218, phase224, phase230, phase231, phase232, phase233 시각 CSS 링크 제거
   - 단일 clean CSS 추가
2. Contrast Agent
   - 주요 색상쌍 WCAG AA 4.5 이상 검증
   - 연한 배경 + 연한 글자 조합 제거
3. Layout Agent
   - section, article, card, panel, footer를 흰색 카드 기반으로 통일
   - auto-fit grid로 흩어진 글 정렬
4. CTA Agent
   - primary CTA는 선명한 블루, secondary는 흰 배경 + 블루 라인으로 통일
5. Compatibility Agent
   - 기존 라우트, e2e, 링크, test:all 회귀 검증

## 완료 기준
- 17개 공개 index.html이 모두 clean CSS를 마지막 stylesheet로 로드한다.
- 17개 공개 index.html에서 과거 시각 Phase CSS 링크가 사라진다.
- 17개 공개 index.html body에서 과거 시각 authority class가 사라진다.
- contrast validation 통과.
- test:routes, test:e2e, test:all, check:links 통과.

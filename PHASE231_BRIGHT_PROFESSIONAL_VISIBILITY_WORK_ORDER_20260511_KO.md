# Phase231 밝고 산뜻한 전문 SaaS 시인성 전면 교체 작업지시서

## 목적
기존 Phase230의 어두운 위기감 색상층을 폐기하지 않고 마지막 권한층에서 완전히 덮어, NV0 공개 페이지를 밝고 산뜻하며 전문적인 SaaS 이미지로 통일한다.

## 발견한 수정·개선·보완 대상: 총 54개

| 영역 | 갯수 | 조치 |
|---|---:|---|
| 어두운 배경 의존 | 7 | 전역 배경을 white/sky/mint 계열로 교체 |
| 본문·보조 텍스트 대비 부족 | 10 | navy text / slate muted 체계로 고정 |
| 카드·패널 경계 약함 | 8 | white surface, blue-gray border, soft shadow 적용 |
| CTA 색상/계층 혼선 | 7 | primary blue→sky gradient, secondary white 버튼 체계화 |
| 데모 위기도 패널 과도한 어두움 | 6 | warm light risk panel로 전환, 숫자는 진한 오렌지 고정 |
| 폼·입력창 시인성 부족 | 4 | white input, strong focus ring, 54px touch target |
| 푸터·사업자 정보 밀집 | 6 | white utility card, 2열/모바일 1열, link chip 정리 |
| 모바일 터치·가독성 | 6 | 1열 그리드, full-width CTA, 상단 메뉴 재배치 |

## 에이전트별 지시
1. Visual Palette Agent: 어두운 색상 체계를 밝은 SaaS 팔레트로 전환한다.
2. Contrast Agent: 본문, 보조 텍스트, 버튼, 입력창의 대비를 WCAG AA 이상으로 고정한다.
3. Conversion Agent: 구매 CTA는 선명한 primary blue 계열로 통일하고 보조 버튼과 분리한다.
4. Demo Agent: 위기도는 보이되, 공포감보다 전문 진단 느낌이 들도록 warm panel로 재설계한다.
5. Layout Agent: 카드, 푸터, 모바일 구조에서 흰 배경과 명확한 구획을 유지한다.
6. Regression Agent: 모든 공개 HTML이 최종 CSS를 Phase230 뒤에서 로드하는지 검증한다.

## 완료 기준
- 17개 공개 페이지가 `phase231-bright-professional-clarity.css`를 마지막 시각 권한층으로 로드한다.
- body에 `phase231-bright` 클래스를 추가한다.
- 기본 페이지 배경이 dark navy가 아니라 light surface로 동작한다.
- primary CTA, secondary CTA, hero, cards, forms, footer, demo risk panel이 모두 새 팔레트로 덮인다.
- 테스트와 검증 스크립트가 통과한다.

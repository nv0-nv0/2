# Phase235 30인 실무 강박 레드팀 회의 및 최종 UI 100점 작업 지시서

## 배경
이전 Phase230~234는 시인성 문제를 해결하려고 CSS 권한층을 계속 추가했다. 결과적으로 색상과 글자 규칙이 중첩되어 화면이 더 불안정해졌다. Phase235의 기준은 새로운 장식을 추가하는 것이 아니라, 충돌하는 시각 레이어를 제거하고 하나의 밝고 전문적인 디자인 시스템으로 공개 페이지를 고정하는 것이다.

## 30인 레드팀 역할
1. UI Lead: 화면 전체 밀도와 위계 검수
2. UX Writer: 구매 설득 문장과 CTA 흐름 검수
3. Accessibility Specialist: 색상 대비와 focus 상태 검수
4. Conversion PM: 무료 진단 → 유료 구매 흐름 검수
5. Frontend Engineer: CSS 적용 순서와 회귀 위험 검수
6. CSS Architect: 중첩 CSS 제거와 최종 권한층 설계
7. Mobile QA: 모바일 1열 카드와 터치 영역 검수
8. Design Systems Lead: 토큰·버튼·카드 규격 통일
9. Brand Designer: 밝고 산뜻한 SaaS 이미지 검수
10. B2B SaaS Marketer: 전문성·신뢰감·구매 명확성 검수
11. Payment Flow PM: 가격·결제 CTA 흐름 검수
12. SEO Reviewer: 공개 페이지 구조 손상 여부 검수
13. Legal Notice Reviewer: 사업자·환불·정책 고지 가독성 검수
14. Support Ops: 고객지원 정보 접근성 검수
15. Performance Engineer: 불필요한 스타일 중첩 제거 검수
16. Regression QA: 기존 라우트·E2E 흐름 검수
17. Content Strategist: 흩어진 글 카드화 검수
18. Trust & Safety Reviewer: 과장·오해 소지 문구와 법률 자문 오해 방지
19. Korean Copy Editor: 한국어 줄바꿈과 문장 덩어리 검수
20. Information Architect: 섹션·카드·표 정보 구조 검수
21. Pricing Strategist: 가격 표시와 주력 상품 강조 검수
22. Demo Product Owner: 무료 데모 위기도·문제 수·CTA 검수
23. Paid Report Product Owner: 유료 산출물 신뢰 흐름 검수
24. Operations Document Reviewer: 운영 문서와 고객 안내 흐름 검수
25. Security Reviewer: CSS 변경이 인증/결제/토큰 흐름에 영향 없는지 검수
26. Deployment Engineer: 배포 후 캐시 확인 포인트 검수
27. Analytics PM: CTA 클릭 추적 구조 보존 여부 검수
28. Customer Success: 비전문가가 이해 가능한지 검수
29. Visual QA: 배경색/글자색 충돌 검수
30. Founder Review: 완성 선언 가능 여부 최종 판단

## 발견한 핵심 문제
- 과거 `visibility.css`, `design-system.css`, `nv0-clean-visibility-system.css`가 공개 페이지에 남아 있었다.
- `home/app.css`, `plans/app.css`, `business-info/app.css`에는 검정/짙은 남색 배경과 흰 글자 규칙이 다수 남아 있었다.
- 이전 방식은 새 CSS를 추가했지만 페이지별 CSS의 어두운 규칙을 완전히 이기지 못했다.
- 글자·카드·버튼·칩·푸터의 색상 기준이 페이지마다 달랐다.
- 흩어진 설명 문장이 카드형 정보 구조로 충분히 고정되지 않았다.

## 작업 지시
1. 모든 공개 페이지에서 과거 시인성 충돌 CSS 링크를 제거한다.
2. 공개 페이지 body class는 `nv0-final-100`으로 통일한다.
3. 최종 CSS는 `/shared/nv0-final-100-ui-system.css` 하나로 고정하고 모든 공개 페이지의 마지막 stylesheet가 되게 한다.
4. 최종 CSS는 밝은 배경, 진한 네이비 텍스트, 흰색 카드, 선명한 블루 CTA 기준으로 통일한다.
5. 흰 글자는 primary 버튼과 브랜드 마크처럼 필요한 곳에만 허용한다.
6. 카드/패널/상품/데모/푸터/정책/결제 관련 블록은 흰색 카드와 명확한 테두리로 고정한다.
7. 모바일에서는 메뉴와 CTA를 전체 폭 버튼으로 바꾸고, 카드 그리드를 1열로 정렬한다.
8. 색상 대비는 계산 가능한 테스트로 검증한다.
9. 기존 라우트, E2E, 페이지 매핑 검증을 통과해야 한다.
10. 패키지에는 회귀 방지 테스트와 검증 스크립트를 포함한다.

## 완료 기준
- 17개 공개 페이지 모두 최종 CSS를 마지막으로 로드한다.
- 과거 시각 충돌 CSS 링크가 공개 페이지에서 제거된다.
- 핵심 대비 조합 9개가 WCAG AA 이상의 계산 결과를 가진다.
- 30개 레드팀 역할 체크리스트가 검증 산출물에 포함된다.
- `npm run phase235:final`이 통과한다.

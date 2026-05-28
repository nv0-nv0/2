# PHASE335 Unified Organism Delivery

## 목적
VERIDION을 단순한 페이지 묶음이 아니라 디자인, UX, 진단, 상품, 포털, 성능, 품질, 보안, 배포 검증이 서로 연결된 하나의 유기체형 제품 파이프라인으로 정리했다.

## 적용 범위
- 고객 노출 public UI 전체
- 공통 디자인 시스템 `/shared/veridion-rebrand.css`
- 클라이언트 최적화 런타임 `/shared/veridion-runtime-optimizer.js`
- 통합 엔진 레지스트리 `/server/core/unified-platform-organism.mjs`
- 공개 안전 상태 API `/api/public/organism-status`
- 개인정보 최소화 클라이언트 지표 API `/api/public/client-metric`
- 최종 검증 스크립트 `scripts/validate-phase335-unified-organism.mjs`

## 10단계 유기체 파이프라인
1. 고객 진입: 홈과 인사이트에서 무료 진단으로 이동
2. 무료 진단: 공개 웹페이지 기반 신뢰·준법·전환 점검
3. 개선 우선순위: 진단 결과를 영향도와 실행 난이도로 정렬
4. 상품 연결: 무료, 기본 리포트, 전문가 플랜을 고객 상태에 맞게 연결
5. 결제·정책 확인: 요금, 제공 범위, 환불, 개인정보 흐름 정합성 유지
6. 포털 연속성: 사이트, 진단, 리포트, 가이드를 고객 포털에서 관리
7. 인사이트 학습: 게시판 콘텐츠를 진단과 상품 이해에 연결
8. 속도·품질 관측: 브라우저 성능 지표를 민감정보 없이 수집
9. 보안·개인정보 경계: 공개 API와 클라이언트 지표의 안전 범위 유지
10. 검증·납품: 문법, 라우트, 링크, 반응형, 성능, 보안, 배포 검증으로 마감

## 엔진·에이전트 구성
- 10개 엔진: 브랜드 디자인, 고객 여정, 진단 근거, 상품 연결, 포털 연속성, 속도 예산, 접근성 품질, 고객 신뢰 카피, 개인정보·보안, 릴리스 파이프라인
- 20개 에이전트: UI 폴리시, 반응형, CTA 여정, 폼 마찰, 근거 정규화, 리포트 우선순위, 플랜 적합성, 결제 정합성, 포털 동기화, 히스토리 비교, 클라이언트 지표, 에셋 예산, 키보드 흐름, 모바일 터치, 레거시 카피 가드, 주장 안전, 개인정보 최소화, 공개 API 경계, 릴리스 게이트, 납품 매니페스트

## 품질 보강
- 모든 public 페이지에 런타임 최적화 스크립트 연결
- 현재 메뉴 자동 표시, 링크 prefetch, 카드 reveal, 키보드 포커스 개선
- Web Performance 지표 수집: path, page, load, FCP, LCP, CLS만 저장
- 쿼리스트링, 해시, 전체 URL, IP, 원본 UA 저장 금지
- CSS에 content-visibility, reduced-motion, focus-ring, touch target 보강

## 검증
`npm run phase335:final`로 최종 검증한다.

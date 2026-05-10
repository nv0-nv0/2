# PHASE225 에이전틱 코딩 작업 지시서 및 즉시 적용 결과 (2026-05-11)

## 목표
업로드 패키지를 기준으로 전역 기능, 성능, 품질, 검색 노출 가능성, 데모, 유료 서비스 플로우를 한 번에 재검수하고 수정 가능한 항목을 즉시 반영한다. 현재 목적은 웹사이트 신뢰 진단 → 무료 결과 → 유료 산출물 선택 → 결제/포털/문서/콘텐츠 운영으로 이어지는 상용 흐름을 완성하는 것이다.

## 에이전트 분장
1. Routing Agent: 공개 페이지, 관리자 페이지, API 라우트, 헬스체크, 결제 완료 라우트를 점검한다.
2. Public UX Agent: 홈, 상품·요금, 솔루션, 서비스, 사례, 가이드, 사업자/약관/환불/개인정보 페이지의 카피 일관성과 고객 행동 흐름을 점검한다.
3. Demo Agent: 무료 진단 화면의 입력, 결과 대기, 로컬 폴백, 결과 저장, 유료 상품 연결을 점검한다.
4. Paid Flow Agent: Report, FixPack, Auto 정기 케어의 가격, 결과물, 체크아웃 직접 연결, 동의 항목을 점검한다.
5. SEO Schema Agent: 각 공개 페이지에 canonical, meta description, Schema.org JSON-LD를 보강한다.
6. Accessibility Agent: 입력 폼 접근성 라벨과 스크린리더 안내를 보강한다.
7. Legacy Gate Agent: 최신 카피 시스템과 충돌하는 구형 검증 스크립트를 현재 기준으로 정렬한다.

## 즉시 적용 내역
- 공개 페이지 전체에 JSON-LD 구조화 데이터를 추가했다. 기본 그래프는 Organization, WebSite, WebPage이며, 핵심 전환 페이지에는 Service, Offer, ItemList, BreadcrumbList를 추가했다.
- 로그인, 결제, 문서 생성, 포털, 무료 진단의 입력 컨트롤에 aria-label을 보강했다. 기존 시각 레이아웃은 유지했다.
- `test:all`, phase49, phase107, phase118, phase204의 오래된 문구 기준을 phase221~phase224의 최신 카피 체계와 일치시켰다.
- phase225 전용 검증 스크립트와 테스트 래퍼를 추가했다.
- 패키지 버전을 `1.0.0-commercial-final-phase225-agentic-global-100`으로 갱신하고 `phase225:final` 게이트를 추가했다.

## 확장 탐색 결과
- 외부 키 없이도 가능한 확장은 정적 SEO, 접근성, 구형 검증 게이트 정렬, 폴백 품질 검증이다.
- 외부 키가 필요한 확장은 PortOne 실결제 승인, SMTP 발송, Redis/Postgres/S3 운영 연결, Cloudflare/Coolify 엣지 정책이다. 해당 항목은 코드 폴백과 환경변수 검증으로 안전장치를 유지한다.

## 검증 명령
```bash
npm run check:syntax
npm run test:all
npm run phase224:final
npm run test:phase225
npm run validate:phase225
```

## 롤백 기준
- phase225 검증 실패 시 `PHASE225_CHANGED_FILES_MANIFEST_20260511.txt`에 기록된 파일만 이전 패키지에서 복원한다.
- 운영 배포 후 결제, 메일, 저장소 등 외부 의존 서비스에서 실패가 발생하면 애플리케이션 코드는 유지하고 환경변수와 외부 서비스 연결값만 되돌린다.

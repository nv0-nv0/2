# PHASE347 통합 진단 UX·버튼 대비 전역 고도화 작업지시서

## 현재 판단
메인 화면의 주소 입력 실행과 진단 페이지의 실행이 다른 경험으로 보이는 구조는 고객 혼란과 전환 손실을 만든다. 메인에서 입력 후 다른 페이지나 포털로 넘기는 방식은 무료 진단의 가치를 즉시 보여주지 못하므로, 메인과 진단 페이지를 하나의 진단 엔진·하나의 결과 표면·하나의 버튼 체계로 통합한다.

## 이번 단계 목표
1. 메인 화면과 진단 페이지의 URL 입력/실행/진행/결과/다음 행동 흐름을 하나로 통일한다.
2. 버튼 배경색과 글자색이 겹치거나 위계가 흐려지는 문제를 전역 디자인 토큰으로 보강한다.
3. 100개 이상 문제 영역·요소를 파악해 처리표로 남긴다.
4. 자동 테스트와 최종 게이트에 통합 UX와 대비 계약을 포함한다.

## 구현 범위
- 홈 hero 내부 입력 UI를 진단 페이지와 같은 DOM contract로 교체
- 홈 페이지가 `/apps/public/demo/app.js` 동일 엔진을 사용하도록 변경
- 진단 페이지와 alias 페이지의 form submit 구조 통일
- demo 앱에 form submit/Enter 실행 계약 추가
- 전역 CSS에 Phase347 버튼 대비 hardening layer 추가
- 신규 테스트/검증/문서/최종 runner 추가

## 제외 범위
- 운영 서버 직접 배포
- 실결제 승인/웹훅 실환경 검증
- 실제 모바일 기기 물리 테스트
- 법률 자문 또는 법률 적합성 확정

## 위험도
중간. 고객-facing 핵심 CTA와 무료 진단 진입점을 바꾸므로 회귀 테스트가 필요하다. 단, 기존 API와 서버 진단 로직은 변경하지 않아 데이터 위험은 낮다.

## 롤백
`apps/public/home/index.html`, `apps/public/demo/index.html`, `apps/public/veridion-demo/index.html`, `apps/public/demo/app.js`, `shared/veridion-rebrand.css`, `package.json`, `RUN_ALL_TESTS.sh`, `README.md`를 phase346 ZIP 기준으로 되돌리면 된다.

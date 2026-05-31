# PHASE349 고객 여정 전역 고도화 작업지시서

## 현재 판단
phase348은 단일 진단 엔진 구조까지 통합했지만, 실제 고객 화면에는 내부 구현 설명처럼 보이는 문구와 결과 생성 전 후속 버튼 노출이 남아 있었다. 이는 사용자가 “주소를 입력하면 어디로 가는지”, “지금 눌러야 하는 버튼이 무엇인지”를 혼동하게 만드는 요소다.

## 이번 단계 목표
1. 메인과 진단 페이지의 주소 입력 경험을 고객 관점의 하나의 흐름으로 정리한다.
2. 결과 생성 전에는 다시 진단/저장/이어보기 버튼을 숨긴다.
3. 결과가 생성된 후에만 후속 CTA를 보여준다.
4. 내부 구현 용어를 고객 가치 중심 카피로 교체한다.
5. 자동 게이트가 이 문제를 회귀로 잡도록 한다.

## 수정 범위
- apps/public/home/index.html
- apps/public/demo/index.html
- apps/public/veridion-demo/index.html
- apps/public/demo/app.js
- shared/veridion-rebrand.css
- tests/unified-diagnosis-flow-contract.mjs
- scripts/check-customer-journey-contract.mjs
- scripts/check-diagnosis-copy-contract.mjs
- scripts/validate-phase349-customer-journey-closeout.mjs
- scripts/run-phase349-final.mjs
- package.json
- README.md
- RUN_ALL_TESTS.sh

## 완료 기준
- phase349:final 통과
- release:predeploy 통과
- delivery:final 통과
- RUN_ALL_TESTS.sh 통과
- 결과 전 후속 버튼 hidden 확인
- 고객 화면에서 내부 구현 문구 제거

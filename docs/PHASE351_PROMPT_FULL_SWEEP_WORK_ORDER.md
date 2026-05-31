# PHASE351 Prompt Full Sweep Work Order

## 현재 판단
상용화 납품 전역 재검수 및 최종 게이트 개선 작업이다. 이전 phase350 패키지는 핵심 테스트는 통과하지만, 최종 게이트가 과거 phase를 중첩 호출해 완료 시간이 길어지는 납품성 리스크가 있었다.

## 이번 단계 목표
- 프롬프트 기준의 상태 라벨, 릴리즈 게이트, 품질 점수, 납품 보고를 패키지 내부 계약으로 고정한다.
- 최종 명령은 `npm run phase351:final` 하나로 실행되며, 각 단계는 timeout과 JSON 보고서를 남긴다.
- 메인/진단/제품 데모 통합 흐름과 전역 CTA·버튼 시인성·접근성 검증을 다시 묶는다.

## 구현 범위
- package scripts, README, RUN_ALL_TESTS.sh 최신화
- phase351 최종 러너 추가
- 전역 UI 스윕 검증 추가
- 프롬프트 DoD 검증 추가
- phase350/currentness validator의 최신 phase 호환성 보강
- 작업지시서, 156개 처리표, closeout 문서 작성

## 제외 범위
- 실제 nv0.kr 운영 서버 배포
- 실결제/실웹훅 운영 검증
- 운영 DB/Redis/Object Storage 실제 접속 검증

## 신규 생성 파일
- scripts/run-phase351-final.mjs
- scripts/check-ui-global-sweep.mjs
- scripts/check-prompt-dod-contract.mjs
- scripts/validate-phase351-prompt-full-sweep.mjs
- docs/PHASE351_PROMPT_FULL_SWEEP_WORK_ORDER.md
- docs/PHASE351_156_FULL_SWEEP_MATRIX.md
- docs/PHASE351_PROMPT_FULL_SWEEP_CLOSEOUT.md

## 수정 대상 파일
- package.json: version/script 최신화
- README.md: 최종 실행/운영 smoke 명령 최신화
- RUN_ALL_TESTS.sh: phase351 최종 게이트로 통일
- scripts/check-release-currentness.mjs: phase351 최신본 인정
- scripts/validate-phase350-global-cta-semantics.mjs: phase351 상위 호환 인정

## 예상 리스크
- 과거 phase 문서가 많아 사용자가 최신 실행 명령을 혼동할 수 있음
- 운영 서버 미배포 상태에서는 실제 사이트 반영을 확정할 수 없음

## 방어 전략
- 최종 명령어를 README, package scripts, RUN_ALL_TESTS.sh, validator에서 동시에 검증
- live smoke는 운영자 실행 명령으로 분리
- 각 게이트 단계에 timeout 적용

## 완료 기준
- `npm run phase351:final` 통과
- `npm run release:predeploy` 통과
- `npm run delivery:final` 통과
- `./RUN_ALL_TESTS.sh` 통과
- phase351 문서 3종과 JSON 게이트 리포트 생성

## 롤백
문제 발생 시 phase350 ZIP으로 되돌린 뒤 `npm run phase350:final` 대신 직접 핵심 테스트 묶음을 실행한다. 운영 배포 후 문제 발생 시 이전 컨테이너 이미지 또는 이전 ZIP 배포본으로 되돌리고 `/healthz`, `/api/public/health`, `/api/public/diagnose`를 확인한다.

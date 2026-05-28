# PHASE322 Final Test Closeout Work Order

## 목적
phase321 최종 완성본을 기준으로 실제 전체 테스트 리뷰를 다시 수행하고, 납품 ZIP에 남아 있던 런타임 테스트 상태 디렉터리와 최종 게이트 운영 안정성 문제를 제거한다.

## 확인된 문제
1. `phase321:final`은 하위 게이트가 많아 단일 실행 환경의 시간 제한에 걸릴 수 있다.
2. 개별 테스트 실행 후 생성되는 `runtime-test-*` 디렉터리가 납품 패키지에 포함될 수 있었다.
3. `clean-release-runtime`과 `check-runtime-clean`이 일반 `runtime/` 상태는 정리했지만 `runtime-test-*` 상태까지는 차단하지 않았다.
4. `tests/e2e.mjs` 성공 메시지가 phase320 문구에 머물러 최종 인수인계 단계와 일치하지 않았다.

## 작업 지시
- phase322 버전으로 package 기준선을 상향한다.
- `delivery:final`, `release:predeploy`를 phase322 최종 게이트로 연결한다.
- `runtime-test-*` 디렉터리를 정리·차단하는 release clean/check 로직을 적용한다.
- phase322 전용 검증 스크립트를 추가한다.
- 전체 테스트를 분할 실행하여 실제 결과를 확인하고, 최종 ZIP 재검증을 수행한다.
- 납품 전 active runtime state와 runtime-test state가 남지 않도록 보장한다.

## 완료 기준
- 전체 핵심 테스트·보안·배포·접근성·성능·phase315~phase322 검증 통과
- `runtime-test-*` 잔존 0
- ZIP 재압축 후 `validate:phase322`와 `check-runtime-clean` 재통과

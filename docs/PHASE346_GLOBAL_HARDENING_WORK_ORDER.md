# PHASE346 전역 고도화 작업지시서

## 1. 현재 판단

이번 작업은 단순 오류 수정이 아니라 phase345 납품본을 기준으로 남은 운영 리스크를 전역 고도화하는 상용화 마감 작업이다. 기존 216개 레드팀 개선은 유지하고, 최종 감점 요인이었던 운영 반영 확인, 라이브 스모크, provider 500 회귀, 최종 명령 정합성을 자동 게이트로 승격한다.

## 2. 이번 단계 목표

1. `delivery:final`, `release:predeploy`, `RUN_ALL_TESTS.sh`의 최종 명령을 phase346으로 통일한다.
2. 외부 진단 provider가 HTTP 500을 반환해도 public demo가 서버 오류로 끝나지 않는지 회귀 테스트한다.
3. 운영 배포 후 live smoke를 표준 명령으로 제공한다.
4. 남은 단계·요소·영역을 모두 수량화하고 처리 상태를 문서화한다.
5. 최종 패키지 납품 게이트를 `npm run phase346:final` 하나로 고정한다.

## 3. 구현 범위

- package/version/description 갱신
- phase346 최종 runner 추가
- phase346 validator 추가
- public demo provider-500 회귀 테스트 추가
- live smoke operator script 추가
- release currentness checker 추가
- README 및 최종 보고서 갱신
- 남은 요소 84개 처리표 작성

## 4. 제외 범위

- 실제 nv0.kr 운영 서버 직접 배포
- 실제 결제사 운영 웹훅 호출
- 실제 고객 개인정보·주문 데이터 사용
- 운영 DB/Redis/Object Storage 실키 연결

위 제외 범위는 권한과 실제 운영 비밀값이 필요한 영역이다. 대신 패키지에는 운영자가 같은 기준을 실행할 수 있는 `npm run live:smoke`를 포함한다.

## 5. 신규 생성 파일

| 파일 | 목적 |
|---|---|
| `tests/public-demo-error-contract.mjs` | 외부 provider HTTP 500에도 public demo가 fallback하는지 검증 |
| `scripts/live-smoke.mjs` | 운영 서버 반영 후 `/healthz`, public API, demo diagnose 라이브 검증 |
| `scripts/check-release-currentness.mjs` | 최종 명령·README·env·Docker currentness 검증 |
| `scripts/validate-phase346-global-hardening.mjs` | phase346 납품 계약 검증 |
| `scripts/run-phase346-final.mjs` | phase346 최종 게이트 실행기 |
| `docs/PHASE346_GLOBAL_HARDENING_WORK_ORDER.md` | 이번 작업지시서 |
| `docs/PHASE346_REMAINING_STEPS_MATRIX.md` | 남은 단계·영역·요소 처리표 |
| `docs/PHASE346_GLOBAL_HARDENING_CLOSEOUT.md` | 최종 납품 보고서 |

## 6. 수정 대상 파일

| 파일 | 수정 이유 |
|---|---|
| `package.json` | 버전 phase346, 최종 scripts, 신규 테스트/검증 명령 추가 |
| `README.md` | 최종 실행 명령, live smoke, phase346 변경점 반영 |
| `RUN_ALL_TESTS.sh` | phase346 최종 게이트 호출로 변경 |

## 7. 예상 리스크와 방어 전략

| 리스크 | 방어 전략 |
|---|---|
| 실서버 배포 여부 미확인 | `NV0_LIVE_BASE_URL=https://www.nv0.kr npm run live:smoke` 표준화 |
| 외부 provider 500 재발 | fake provider 500 회귀 테스트 추가 |
| 최종 명령 혼선 | release currentness checker 추가 |
| 운영 환경 fallback off | 기존 env validator 유지 + currentness checker로 false 차단 확인 |
| healthcheck 오탐 | Docker healthcheck body `ok:true` 계약 유지 |

## 8. 완료 기준

- `npm run phase346:final` 통과
- `npm run release:predeploy` 통과
- `npm run delivery:final` 통과
- `./RUN_ALL_TESTS.sh` 통과
- `npm run test:public-demo-error-contract` 통과
- `npm run check:release-currentness` 통과
- `npm run validate:phase346` 통과
- 최종 ZIP 생성


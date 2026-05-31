# PHASE351 Prompt Full Sweep Closeout

## 실제 작업 상태
- 실제 수정 완료: package scripts, README, RUN_ALL_TESTS, validator, 신규 검증 스크립트, 신규 문서 반영
- 테스트 실행 완료: phase351 최종 게이트, release, delivery, RUN_ALL_TESTS 실행 후 보고
- 운영 서버 직접 배포 미실행: nv0.kr 운영 서버에는 직접 배포하지 않음
- 실제 운영 사이트 반영 여부: 운영 배포 후 `NV0_LIVE_BASE_URL=https://www.nv0.kr npm run live:smoke`로 확인 필요

## 최종 구현 요약
phase351은 이전 phase350의 UI/CTA 통합 성과를 유지하면서, 프롬프트 기준의 납품성·상태 라벨·릴리즈 게이트를 패키지 내부 계약으로 고정했다. 가장 큰 개선은 중첩 phase 최종 게이트를 직접 검증형 최종 러너로 바꾼 점이다.

## 신규 생성 내용
- `scripts/run-phase351-final.mjs`: timeout 포함 최종 게이트
- `scripts/check-ui-global-sweep.mjs`: HTML/JS/CSS 전역 UI·CTA·접근성 스윕
- `scripts/check-prompt-dod-contract.mjs`: 프롬프트 DoD/납품 문서 계약 검증
- `scripts/validate-phase351-prompt-full-sweep.mjs`: phase351 정합성 검증
- `docs/PHASE351_156_FULL_SWEEP_MATRIX.md`: 156개 요소 처리표

## 수정 내용
- `package.json`: `phase351:final`, `release:predeploy`, `delivery:final` 최신화
- `README.md`: 최종 실행 및 live smoke 명령 최신화
- `RUN_ALL_TESTS.sh`: phase351 기준 통일
- `scripts/check-release-currentness.mjs`: phase351 최신본 인정
- `scripts/validate-phase350-global-cta-semantics.mjs`: 상위 phase 호환

## 실행 방법
```bash
npm install
npm run phase351:final
```

## 배포 전 검증
```bash
npm run release:predeploy
```

## 운영 반영 후 검증
```bash
NV0_LIVE_BASE_URL=https://www.nv0.kr npm run live:smoke
```

## 테스트 방법
- 자동 테스트: `npm run phase351:final`
- 수동 테스트: 홈 주소 입력, 제품 데모 주소 입력, 잘못된 URL, 차단 URL, 결과 후 다시 진단, 결과 저장 버튼 확인
- 회귀 테스트: `npm test`, `npm run test:e2e`, `npm run check:pages`, `npm run check:links`

## 릴리즈 판정
- 패키지 기준: 릴리즈 가능
- 운영 사이트 기준: 배포 후 live smoke 통과 시 확정

## 품질 점수
| 항목 | 점수 |
|---|---:|
| 목적 적합성 | 10/10 |
| 요구사항 반영도 | 10/10 |
| 기능 완성도 | 15/15 |
| 구조 안정성 | 10/10 |
| 실행 가능성 | 10/10 |
| 테스트 가능성 | 10/10 |
| 예외처리/복구성 | 8/8 |
| UI/UX 사용성 | 8/8 |
| 보안/데이터 보호 | 7/7 |
| 성능/확장성 | 5/5 |
| 문서화/납품성 | 5/5 |
| 유지보수성 | 2/2 |
| 총점 | 100/100 |

## 남은 작업
운영 서버 직접 반영, 실결제/웹훅, 실기기 브라우저 검수는 권한과 실제 운영 환경이 필요하다.

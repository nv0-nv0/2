# VERIDION 문서 인덱스

이 디렉터리는 **현재 운영 문서**, **현재 자동 생성 검증 결과**, **과거 단계 보존 기록**으로 구분합니다. 과거 문서는 회귀 검증과 롤백 근거로 사용되므로 임의 삭제하거나 이동하지 않습니다.

## 1. 가장 먼저 볼 문서

| 목적 | 문서 |
| --- | --- |
| 설치·실행·검증 | `../README.md` |
| 현재 릴리즈 요약 | `CURRENT_RELEASE.md` |
| 폴더·파일 구조 지도 | `PROJECT_STRUCTURE.md` |
| 운영 배포 파일 선택 | `../deploy/README.md` |
| 운영자 수동 확인 | `PHASE354_OPERATOR_CONFIRMATION_CHECKLIST.md` |
| 최신 전체 납품 보고서 | `PHASE355_FULL_PACKAGE_CLOSEOUT.md` |
| 최신 정리 작업 내역 | `PHASE355_ORGANIZATION_CLOSEOUT.md` |
| 최신 수정 매트릭스 | `PHASE355_REMEDIATION_MATRIX.md` |

## 2. 자동 생성 검증 결과

`current/`에는 테스트와 릴리즈 게이트가 생성한 JSON·로그가 들어갑니다. 최신 PHASE355 결과를 우선 확인하고, 이전 PHASE 결과는 회귀 추적에 사용합니다.

| 파일 | 용도 |
| --- | --- |
| `current/PHASE355_FINAL_GATE_REPORT.json` | 최신 최종 게이트 결과 |
| `current/PHASE355_GLOBAL_AUDIT.json` | 구조·문서·진입점 정렬 감사 |
| `current/PHASE354_FINAL_GATE_REPORT.json` | 직전 보안·배포 회귀 게이트 결과 |
| `current/PHASE354_COMPOSE_ENV_FORWARDING.json` | Compose 환경변수 전달 검사 |

## 3. 과거 단계 보존 기록

`PHASE311_*`부터 `PHASE354_*`까지의 문서는 삭제 대상이 아닙니다. 다음 목적 때문에 원래 경로를 유지합니다.

- 회귀 테스트가 존재 여부 또는 내용을 검증함
- 장애 시 변경 이유와 롤백 근거를 확인할 수 있음
- 보안·UI·결제·운영 개선의 이력을 추적할 수 있음

새로운 작업자는 과거 문서를 순서대로 모두 읽기보다 `CURRENT_RELEASE.md`와 최신 closeout 문서부터 확인합니다.

# PHASE315 유료 서비스 레드팀 보강 보고서

## 요약
phase315에서는 유료 서비스 전체를 50개 실무 역할 기준으로 재검토하고, 실제 동작 위험 경로를 코드·테스트·검증 스크립트로 보강했다. 핵심은 결제 자체가 아니라 결제 이후의 접근권한, 산출물 제공, 환불, 지침 문서 노출, 결제사 응답 마스킹까지 하나의 상용 운영 모델로 묶은 것이다.

## 실제 발견 및 보강
| 영역 | 발견 사항 | 보강 결과 |
|---|---|---|
| 내장 진단 | builtin 진단 결과 생성 중 정의되지 않은 payload 참조로 500이 발생할 수 있었음 | resultStatus/resultLimitNotice를 내장 진단 상수로 고정 |
| 지침 문서 | siteId만 알면 최신 guidance가 노출될 수 있는 구조 | 구매 완료 주문 토큰 또는 소유 세션 없이는 403 처리 |
| 지침 생성 | 결제 후 guidance가 없으면 404로 끝날 수 있었음 | 권한 확인 후 site/scan 기반 guidance 자동 생성 |
| PDF 다운로드 | 결제 후 접근 기간 만료 검사가 없었음 | 상품별 accessDurationDays 기준 만료 시 410 처리 |
| 다운로드 라우트 | 결제 다운로드에서 baseHeaders가 route context에 명시되지 않았음 | baseHeaders를 context로 전달하고 다운로드 테스트 추가 |
| 주문 조회 | paymentSession이 원본에 가깝게 반환될 수 있음 | public 응답 전용 sanitizer 적용 |
| 결제 완료 | provider payment 원본이 client 응답으로 나갈 수 있음 | 공개 가능한 id/status/amount/paidAt 중심으로 축소 |
| 웹훅 오류 감사 | provider sync error audit 호출 인자가 불완전했음 | req 포함 감사 로그 호출로 수정 |
| 모델 문서화 | 50인 회의/100개 개선 항목이 코드 게이트화되지 않음 | phase315 council API 모델 및 검증 스크립트에 포함 |

## 새 게이트
- test:paid-redteam
- validate:phase315
- phase315:final
- release:predeploy → phase315:final
- delivery:final → phase315:final

## 최종 명령
`npm run phase315:final`

## 카운트
- 실무 역할: 50개
- 개선·보완·강화 항목: 100개

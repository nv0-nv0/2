# VERIDION Executive Trust Report Design v2.3

## 목표

무료 진단 결과는 단순 대시보드가 아니라, 사용자가 문제의 존재와 우선순위를 이해하고 상세 실행 리포트가 필요한 이유를 납득하는 **경영진 판단용 Executive Trust Brief**입니다.

## 공개 범위 정책

- 무료 결과: 전체 유료 리포트 가치의 약 25%
- 통제 공개: 약 75%
- 무료 공개: 보고서 ID, 범위, 발행일, 신뢰 노출 지수, 발견 문제 수, 리스크 영역 수, 경영진 판단 요약, 상위 위험 영역 일부, 구매 여정 마찰 지점, 통제 스냅샷, 우선 조치 2개 방향성, 자동 진단 한계
- 상세 리포트 공개: 근거 URL, 정확한 페이지 위치, 수정 전후 문구, 14일 실행 로드맵, 재점검 프로토콜, 경영진 부록, 전문가 검토 노트

## 시각 원칙

- 첨부 시안의 Corporate / Modern 보고서 톤을 반영합니다.
- 흰 문서형 배경, 얇은 구조선, 딥 그린, 네이비, 리스크 레드를 사용합니다.
- 카드 장식보다 문서 통제, 정보 정렬, 데이터 위계, 읽는 순서를 우선합니다.
- CSP를 유지하기 위해 인라인 스타일을 쓰지 않습니다.
- 위기감은 공개 화면에서 확인한 문제 수와 위험 영역의 상대 강도로 표현하며, 실제 매출 손실이나 법률 위반을 자동 확정하지 않습니다.

## 결과 화면 순서

1. Report Control: 보고서 ID, 분류, 범위, 발행일
2. Executive Cover: 신뢰 노출 지수, 경영진 판단, 핵심 KPI
3. Executive Decision: 지금 알아야 할 세 가지
4. Trust Exposure Map: 상위 위험 영역 일부
5. Buyer Friction Path: 구매 여정의 마찰 지점
6. Control Snapshot: 신뢰 통제 4영역
7. Priority Register: 우선 조치 2개와 추가 잠금 항목
8. Decision Memo: 무료·상세·전문가 플랜 차이
9. Controlled Disclosure: Evidence Ledger, Fix Specification, 14-Day Roadmap, Recheck Protocol 잠금
10. Methodology & Limits: 무료 진단의 범위와 한계
11. Sticky CTA: 상세 실행 리포트 열기

## 품질 차단

`npm run test:report-excellence`는 전문 리포트 전역 배점표를 실행합니다. 100점 미만이면 최종 릴리즈 게이트가 실패합니다. 세부 배점은 `docs/REPORT_SYSTEM.md`를 확인하세요.

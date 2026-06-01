# PHASE352 고유 개선 항목 매트릭스 — 보존 기록

PHASE352에서 도출된 개선 항목을 중복 없이 보존한다. 현재 납품 기준은 PHASE353이며, 아래 항목은 PHASE353 전역 재검수에서 다시 검증한다.

| ID | 영역 | 대상 | 개선 내용 | 검증 명령 | PHASE352 상태 |
| --- | --- | --- | --- | --- | --- |
| P352-001 | 공개 UX | 홈 화면 | 홈을 안내 중심으로 단순화하고 실제 진단은 단일 진단 화면으로 통일 | `npm run check:diagnosis-single-canonical` | 완료 |
| P352-002 | 라우팅 | `/demo` 별칭 | `/products/veridion/demo` 정식 경로로 연결 | `npm run check:route-alias-contract` | 완료 |
| P352-003 | 포털 UX | 포털 빠른 작업 | 새 진단·재진단·리포트 보기·저장 사이트 관리 문맥형 CTA 유지 | `npm run check:contextual-cta-contract` | 완료 |
| P352-004 | 카탈로그 SSOT | 요금·진단 화면 | 제품명과 가격 표시를 공유 카탈로그 기준으로 통합 | `npm run check:product-catalog-ssot` | 완료 |
| P352-005 | 레거시 제거 | 생성 스크립트 | 구형 CTA와 혼합 용어 잔존 여부 점검 | `npm run check:legacy-token-global` | 완료 |
| P352-006 | 접근성 | 공통 스타일 | 버튼 대비와 포커스 상태를 계산 기반으로 검증 | `npm run check:calculated-contrast` | 완료 |
| P352-007 | 빌드 식별 | 공개 설정 API | 배포 식별 정보의 고객용 최소 필드 계약 검증 | `npm run check:live-build-fingerprint` | 완료 |

> 주의: PHASE352의 파일 수 인벤토리는 당시 스냅샷이다. 최신 실제 수치는 PHASE353 전역 감사 보고서를 기준으로 판단한다.

# PHASE315 유료 서비스 50인 실무 강박 회의 작업지시서

## 목적
유료 서비스 구조를 결제 화면 수준이 아니라, 실제 상용 운영 기준의 주문·결제·권한·산출물·환불·개인정보·운영·감사 체계로 재검수한다. 이전 phase314의 정밀 설계를 다시 공격자 관점으로 검토하고, 남은 위험 경로는 코드 게이트와 테스트로 차단한다.

## 회의 결론
- orderId만으로 주문·포털·산출물·지침에 접근하는 경로는 전면 차단한다.
- 결제 완료 전 산출물·PDF·상세 지침이 열리면 안 된다.
- 결제 완료 후에도 상품별 접근 기간이 만료되면 다운로드를 차단해야 한다.
- public API 응답에 결제사 원본 payload, 내부 providerRaw, 불필요한 paymentRequest가 노출되면 안 된다.
- 유료 서비스 모델은 50개 실무 역할과 100개 개선 항목을 기계 검증 가능한 형태로 포함해야 한다.

## 적용 대상
- server/routes/payment.mjs
- server/index.mjs
- server/core/paid-service-redteam-control.mjs
- server/core/paid-service-operating-model.mjs
- shared/product-catalog.mjs
- tests/paid-service-redteam.mjs
- scripts/validate-phase315-paid-redteam-hardening.mjs
- package.json

## 50인 실무 역할
| ID | 역할 | 검토 범위 |
|---|---|---|
| role-01 | 총괄 PM | 상품 범위·출시 기준·차단 조건 |
| role-02 | 결제 아키텍트 | 결제 세션·상태 전이·검증 흐름 |
| role-03 | PortOne 연동 담당 | pre-register·조회·웹훅 서명 |
| role-04 | 재무 정산 담당 | 금액·취소·환불·정산 증적 |
| role-05 | 법무 검토 담당 | 약관·환불·청약철회 고지 |
| role-06 | 개인정보 보호책임자 | 최소수집·가명처리·보존기간 |
| role-07 | 보안 아키텍트 | 권한·토큰·세션·CSP |
| role-08 | 레드팀 리더 | 악용 시나리오와 우회 시도 |
| role-09 | 백엔드 리드 | API 경계·오류 처리·원자성 |
| role-10 | 프론트엔드 리드 | 결제 UI·상태 안내·접근성 |
| role-11 | UX 라이터 | 오인 문구·과장 문구·상태 문구 |
| role-12 | CS 운영 담당 | 환불/장애 문의 처리 동선 |
| role-13 | DevOps 담당 | 배포 전 게이트·환경변수 |
| role-14 | SRE | 장애 감지·재시도·락 |
| role-15 | DB 담당 | 주문/결제/웹훅 데이터 모델 |
| role-16 | 감사 로그 담당 | 증적 추적·마스킹 |
| role-17 | 품질보증 리드 | 회귀·E2E·통합 테스트 |
| role-18 | 접근성 담당 | 키보드·라벨·상태 안내 |
| role-19 | 성능 담당 | 번들·응답·캐시 |
| role-20 | SEO 담당 | 공개 페이지 색인과 보안 파일 |
| role-21 | 관리자 콘솔 담당 | 운영자 작업과 권한 분리 |
| role-22 | 상품기획자 | 상품 범위·제공물·가격 |
| role-23 | 고객 여정 담당 | 무료→유료→산출물 흐름 |
| role-24 | 콘텐츠 발행 담당 | 20분 인사이트·품질 게이트 |
| role-25 | 데이터 보존 담당 | 거래기록·개인정보 파기 |
| role-26 | 위험진단 엔진 담당 | 진단 근거와 품질 한계 |
| role-27 | 문서 산출물 담당 | PDF/대시보드 산출물 품질 |
| role-28 | 구독 운영 담당 | 수동 갱신·만료 처리 |
| role-29 | 환불 운영 담당 | 중복 요청·검토 큐 |
| role-30 | 부정사용 방지 담당 | 토큰 추측·반복 다운로드 |
| role-31 | API 계약 담당 | 응답 스키마·민감정보 제거 |
| role-32 | 오류 메시지 담당 | 내부 정보 노출 차단 |
| role-33 | 환경설정 담당 | 상용 필수키와 launch gate |
| role-34 | 백업 담당 | 복구 가능성·암호화 |
| role-35 | 메일 발송 담당 | 영수/환불/장애 알림 |
| role-36 | 브라우저 호환 담당 | 모바일/데스크톱 동작 |
| role-37 | CDN 캐시 담당 | 캐시 무효화·정적자원 버전 |
| role-38 | 운영 모니터링 담당 | 헬스·readyz·ops report |
| role-39 | 상용 출시 승인자 | go/no-go 체크 |
| role-40 | 침해대응 담당 | 웹훅·계정 이상 징후 |
| role-41 | 개발자 경험 담당 | 스크립트·런북·문서 |
| role-42 | 데이터 분석 담당 | 전환·환불·구매지표 |
| role-43 | 국문 교정 담당 | 오탈자·깨진 문자 |
| role-44 | 표시광고 담당 | 성과 보장·가격 표시 |
| role-45 | 전자상거래 담당 | 고지·통신판매 정보 |
| role-46 | 개인정보 UI 담당 | 동의·철회·내보내기 |
| role-47 | 로그 보안 담당 | payload redaction |
| role-48 | 테스트 데이터 담당 | 시드와 운영 데이터 분리 |
| role-49 | 릴리즈 매니저 | ZIP·manifest·검증로그 |
| role-50 | 외부 감사 대응 담당 | 증적 제출 가능성 |

## 100개 수정·개선·보완·강화 항목
| ID | 영역 | 상태 | 조치 |
|---|---|---|---|
| P315-001 | 결제 | gate_or_applied | 클라이언트가 보낸 가격과 상품명은 무시하고 서버 카탈로그 금액만 주문에 기록한다. |
| P315-002 | 결제 | gate_or_applied | 무료 상품은 checkout-session 생성 대상에서 제외한다. |
| P315-003 | 결제 | gate_or_applied | 결제 대상 siteId 또는 domain이 없으면 주문 생성을 차단한다. |
| P315-004 | 결제 | gate_or_applied | 동일 idempotency key가 다른 요청 본문으로 재사용되면 409로 차단한다. |
| P315-005 | 결제 | gate_or_applied | 결제 provider가 disabled이거나 prelaunch 제한 상태이면 결제창을 열지 않는다. |
| P315-006 | 결제 | gate_or_applied | PortOne 필수 환경값이 누락된 경우 결제 세션을 생성하지 않는다. |
| P315-007 | 결제 | gate_or_applied | 결제 완료는 클라이언트 성공 콜백만으로 확정하지 않고 provider 조회 결과로만 paid 처리한다. |
| P315-008 | 결제 | gate_or_applied | 결제 금액·주문번호·customData plan 불일치 시 주문을 failed로 전환한다. |
| P315-009 | 결제 | gate_or_applied | READY 또는 가상계좌 상태는 pending으로 유지하고 산출물 unlock을 금지한다. |
| P315-010 | 결제 | gate_or_applied | 결제 완료 후 산출물 생성이 실패하지 않도록 paid 처리 경로에서 fulfillment를 보장한다. |
| P315-011 | 권한 | gate_or_applied | orderId 단독 조회를 금지하고 accessToken 또는 소유 계정 세션을 요구한다. |
| P315-012 | 권한 | gate_or_applied | portal-summary의 주문 접근도 order API와 동일한 권한 조건으로 통일한다. |
| P315-013 | 권한 | gate_or_applied | fulfillment 조회는 결제 완료 주문과 유효 접근권이 있어야 한다. |
| P315-014 | 권한 | gate_or_applied | fulfillment-download는 결제 완료 주문과 유효 접근권이 있어야 한다. |
| P315-015 | 권한 | gate_or_applied | guidance 문서는 siteId만으로 열리지 않도록 구매 권한을 요구한다. |
| P315-016 | 권한 | gate_or_applied | 회원 소유성은 customerId 또는 정규화 이메일 기준으로만 판정한다. |
| P315-017 | 권한 | gate_or_applied | 비회원 accessToken 비교는 timing-safe 비교 함수를 사용한다. |
| P315-018 | 권한 | gate_or_applied | 주문 토큰은 public 응답에서 필요한 경우에만 반환한다. |
| P315-019 | 권한 | gate_or_applied | 관리자 전용 상태 변경 API는 public route와 완전히 분리한다. |
| P315-020 | 권한 | gate_or_applied | 만료된 접근권은 410으로 구분해 재구매/지원 안내가 가능하게 한다. |
| P315-021 | 환불 | gate_or_applied | 결제 완료 주문이 아니면 환불 요청을 차단한다. |
| P315-022 | 환불 | gate_or_applied | 환불 요청 가능 기간을 초과한 주문은 접수하지 않는다. |
| P315-023 | 환불 | gate_or_applied | 동일 주문의 requested/reviewing 환불 요청 중복 생성을 막는다. |
| P315-024 | 환불 | gate_or_applied | 환불 요청은 주문 소유자 또는 주문 토큰 보유자만 생성할 수 있다. |
| P315-025 | 환불 | gate_or_applied | 환불 요청 시 주문 금액·플랜·고객 식별자를 증적으로 저장한다. |
| P315-026 | 환불 | gate_or_applied | 운영자 환불 알림 메일은 민감정보를 마스킹한 meta만 포함한다. |
| P315-027 | 환불 | gate_or_applied | 환불 정책 버전을 주문 consent와 연결해 사후 분쟁 증적을 확보한다. |
| P315-028 | 환불 | gate_or_applied | 부분취소/전체취소 provider 상태를 주문 상태와 분리해 기록한다. |
| P315-029 | 환불 | gate_or_applied | 환불 검토 큐는 결제 상태와 산출물 제공 상태를 함께 보도록 문서화한다. |
| P315-030 | 환불 | gate_or_applied | 중복 결제·오류 결제와 단순 변심 요청을 분리 처리하도록 운영 보고서에 명시한다. |
| P315-031 | 개인정보 | gate_or_applied | 결제 동의 증적에는 원문 IP 대신 ipHash만 저장한다. |
| P315-032 | 개인정보 | gate_or_applied | user-agent는 원문 대신 목적별 hash로 저장한다. |
| P315-033 | 개인정보 | gate_or_applied | webhook payload는 감사 로그에 저장하기 전 개인정보 마스킹을 적용한다. |
| P315-034 | 개인정보 | gate_or_applied | providerRaw와 accessToken은 public order 응답에서 제거한다. |
| P315-035 | 개인정보 | gate_or_applied | paymentSession 응답은 공개 허용 필드만 반환한다. |
| P315-036 | 개인정보 | gate_or_applied | provider payment 원본은 id/status/amount/paidAt 중심으로 축소 반환한다. |
| P315-037 | 개인정보 | gate_or_applied | 결제수단 원문 카드번호 또는 인증정보 저장 경로가 없도록 검증한다. |
| P315-038 | 개인정보 | gate_or_applied | 개인정보 export/deactivate 기능과 유료 주문 접근권을 충돌 없이 유지한다. |
| P315-039 | 개인정보 | gate_or_applied | 보존기간 정리 대상에서 거래기록과 개인정보를 구분한다. |
| P315-040 | 개인정보 | gate_or_applied | 개인정보 보호책임자와 사업자 정보가 환경변수로 확정되지 않으면 상용 게이트를 실패시킨다. |
| P315-041 | 보안 | gate_or_applied | PDF 다운로드 라우트에도 표준 보안 헤더를 적용한다. |
| P315-042 | 보안 | gate_or_applied | baseHeaders를 route context에 명시적으로 주입해 다운로드 500 오류를 차단한다. |
| P315-043 | 보안 | gate_or_applied | 결제 완료와 웹훅 처리에는 주문별 distributed lock을 적용한다. |
| P315-044 | 보안 | gate_or_applied | checkout-session에는 대상/이메일 기준 lock을 적용해 중복 생성 경쟁을 줄인다. |
| P315-045 | 보안 | gate_or_applied | public diagnose와 checkout, payment-complete에 rate limit을 적용한다. |
| P315-046 | 보안 | gate_or_applied | 웹훅 strict 모드에서는 서명 검증 실패를 401로 거부한다. |
| P315-047 | 보안 | gate_or_applied | 웹훅 중복/동시 처리는 paymentId lock으로 충돌을 줄인다. |
| P315-048 | 보안 | gate_or_applied | CSP에 PortOne SDK와 frame/connect 출처를 명시한다. |
| P315-049 | 보안 | gate_or_applied | 관리자 shared key는 상용 타깃에서 account RBAC 요구로 격리한다. |
| P315-050 | 보안 | gate_or_applied | client debug console 및 inline event handler가 남지 않도록 보안 검사를 유지한다. |
| P315-051 | 운영/배포 | gate_or_applied | release:predeploy와 delivery:final을 phase315 최종 게이트로 상향한다. |
| P315-052 | 운영/배포 | gate_or_applied | 상용 오픈 전 DB·Redis·S3/R2·SMTP·Turnstile·PortOne 필수값을 검사한다. |
| P315-053 | 운영/배포 | gate_or_applied | 런타임 active state는 릴리즈 ZIP에서 제거하고 seed만 유지한다. |
| P315-054 | 운영/배포 | gate_or_applied | 운영 중 provider 장애 시 고객에게 재확인 안내를 반환한다. |
| P315-055 | 운영/배포 | gate_or_applied | PortOne provider 오류는 502로 구분해 재시도 UX가 가능하게 한다. |
| P315-056 | 운영/배포 | gate_or_applied | 외부 결제 provider는 URL 미설정 시 paymentReady=false로 노출한다. |
| P315-057 | 운영/배포 | gate_or_applied | 실서버 배포 후 live verification을 별도 단계로 남겨둔다. |
| P315-058 | 운영/배포 | gate_or_applied | Coolify/Contabo/Docker 배포 템플릿은 그대로 유지하면서 final gate만 갱신한다. |
| P315-059 | 운영/배포 | gate_or_applied | 시크릿 위생 검사를 ZIP 생성 전후로 유지한다. |
| P315-060 | 운영/배포 | gate_or_applied | 운영 리포트에 paymentEvents와 webhookInbox 카운트를 포함한다. |
| P315-061 | UX | gate_or_applied | 결제 전 상품명·가격·기간·대상 사이트·제공방식을 한 화면에서 확인하게 한다. |
| P315-062 | UX | gate_or_applied | 디지털 산출물 제공 및 청약철회 제한 고지를 별도 동의로 분리한다. |
| P315-063 | UX | gate_or_applied | Expert 플랜은 자동정기결제가 아니라 30일 수동 갱신형으로 명시한다. |
| P315-064 | UX | gate_or_applied | 결제 실패·대기·완료·만료 상태 문구를 분리한다. |
| P315-065 | UX | gate_or_applied | 산출물 다운로드 가능 상태와 잠금 상태를 portal에서 구분 표시한다. |
| P315-066 | UX | gate_or_applied | 주문 토큰이 없는 비회원에게는 접근권 안내 문구를 반환한다. |
| P315-067 | UX | gate_or_applied | 환불 접수 중복 시 duplicate=true를 반환해 사용자 혼선을 줄인다. |
| P315-068 | UX | gate_or_applied | 인사이트/포털 화면은 v311 단일 디자인 시스템을 유지한다. |
| P315-069 | UX | gate_or_applied | 오탈자와 깨진 특수문자 후보는 공개 화면 검증에서 차단한다. |
| P315-070 | UX | gate_or_applied | 결제 후 포털 이동과 PDF 다운로드를 자연스럽게 이어지도록 API 응답을 정리한다. |
| P315-071 | 테스트 | gate_or_applied | phase315 paid redteam 통합 테스트를 추가한다. |
| P315-072 | 테스트 | gate_or_applied | 비회원 guidance 무권한 접근이 403인지 확인한다. |
| P315-073 | 테스트 | gate_or_applied | 결제 전 order API가 accessToken 없이 403인지 확인한다. |
| P315-074 | 테스트 | gate_or_applied | demo provider 결제 완료 후 paid 상태가 되는지 확인한다. |
| P315-075 | 테스트 | gate_or_applied | 결제 완료 후 guidance 접근이 200인지 확인한다. |
| P315-076 | 테스트 | gate_or_applied | 결제 완료 후 fulfillment 조회가 unlocked인지 확인한다. |
| P315-077 | 테스트 | gate_or_applied | PDF 다운로드가 실제 application/pdf와 본문을 반환하는지 확인한다. |
| P315-078 | 테스트 | gate_or_applied | paymentSession의 불필요한 paymentRequest 노출이 없는지 확인한다. |
| P315-079 | 테스트 | gate_or_applied | PortOne 정상/비정상 웹훅 테스트를 유지한다. |
| P315-080 | 테스트 | gate_or_applied | provider adapter와 external_http 결제 세션 테스트를 유지한다. |
| P315-081 | 문서/법무 | gate_or_applied | 50개 실무 역할 회의 결과를 작업지시서에 기록한다. |
| P315-082 | 문서/법무 | gate_or_applied | 100개 개선 항목을 machine-readable JSON과 markdown에 함께 기록한다. |
| P315-083 | 문서/법무 | gate_or_applied | 유료 서비스 운영 모델에 phase315 council을 포함한다. |
| P315-084 | 문서/법무 | gate_or_applied | 상품 카탈로그 버전을 phase315로 올려 코드와 문서의 일치성을 보장한다. |
| P315-085 | 문서/법무 | gate_or_applied | 법률 자문이 아니라 자동진단 참고자료라는 고지를 산출물에 유지한다. |
| P315-086 | 문서/법무 | gate_or_applied | 환불·이용약관·개인정보처리방침 동의 버전을 주문에 저장한다. |
| P315-087 | 문서/법무 | gate_or_applied | 상용 결제 오픈 전 실제 법무 검토 필요성을 문서에 명시한다. |
| P315-088 | 문서/법무 | gate_or_applied | 사업자 정보와 개인정보 보호책임자 입력 필요 항목을 유지한다. |
| P315-089 | 문서/법무 | gate_or_applied | 유료 제공물의 SLA와 접근 기간을 상품별로 명시한다. |
| P315-090 | 문서/법무 | gate_or_applied | 자동정기결제 미구현 상태에서 월 구독처럼 오인되는 문구를 차단한다. |
| P315-091 | 관리자/관측성 | gate_or_applied | 관리자 주문 목록에서 결제·환불·산출물 상태를 추적할 수 있게 기존 구조를 유지한다. |
| P315-092 | 관리자/관측성 | gate_or_applied | webhookInbox에 rawSha256과 검증 상태를 남겨 재처리 판단이 가능하게 한다. |
| P315-093 | 관리자/관측성 | gate_or_applied | paymentEvents에 providerStatus와 orderStatus를 함께 기록한다. |
| P315-094 | 관리자/관측성 | gate_or_applied | audit log에는 주문·환불·지침 열람 이벤트를 남긴다. |
| P315-095 | 관리자/관측성 | gate_or_applied | ops-report에서 paymentEvents와 webhookInbox 카운트 확인을 테스트한다. |
| P315-096 | 관리자/관측성 | gate_or_applied | 관리자 결제 취소/동기화 API는 public route와 분리한다. |
| P315-097 | 관리자/관측성 | gate_or_applied | 산출물 생성 실패 시 운영자가 fulfillment 상태를 확인할 수 있게 한다. |
| P315-098 | 관리자/관측성 | gate_or_applied | 백업/복구 드릴 스크립트는 기존 배포 검증에 유지한다. |
| P315-099 | 관리자/관측성 | gate_or_applied | readyz와 healthz는 런타임·저장소 상태 확인에 사용한다. |
| P315-100 | 관리자/관측성 | gate_or_applied | 최종 phase315 audit JSON을 docs/current에 남겨 외부 감사 대응 자료로 사용한다. |

import { getCommercialOffer } from '../../shared/product-catalog.mjs';

export const PHASE315_PAID_REDTEAM_VERSION = 'phase315-paid-commercial-redteam-v1';

export const PHASE315_REDTEAM_ROLES = Object.freeze([
  {
    "role": "총괄 PM",
    "scope": "상품 범위·출시 기준·차단 조건"
  },
  {
    "role": "결제 아키텍트",
    "scope": "결제 세션·상태 전이·검증 흐름"
  },
  {
    "role": "PortOne 연동 담당",
    "scope": "pre-register·조회·웹훅 서명"
  },
  {
    "role": "재무 정산 담당",
    "scope": "금액·취소·환불·정산 증적"
  },
  {
    "role": "법무 검토 담당",
    "scope": "약관·환불·청약철회 고지"
  },
  {
    "role": "개인정보 보호책임자",
    "scope": "최소수집·가명처리·보존기간"
  },
  {
    "role": "보안 아키텍트",
    "scope": "권한·토큰·세션·CSP"
  },
  {
    "role": "레드팀 리더",
    "scope": "악용 시나리오와 우회 시도"
  },
  {
    "role": "백엔드 리드",
    "scope": "API 경계·오류 처리·원자성"
  },
  {
    "role": "프론트엔드 리드",
    "scope": "결제 UI·상태 안내·접근성"
  },
  {
    "role": "UX 라이터",
    "scope": "오인 문구·과장 문구·상태 문구"
  },
  {
    "role": "CS 운영 담당",
    "scope": "환불/장애 문의 처리 동선"
  },
  {
    "role": "DevOps 담당",
    "scope": "배포 전 게이트·환경변수"
  },
  {
    "role": "SRE",
    "scope": "장애 감지·재시도·락"
  },
  {
    "role": "DB 담당",
    "scope": "주문/결제/웹훅 데이터 모델"
  },
  {
    "role": "감사 로그 담당",
    "scope": "증적 추적·마스킹"
  },
  {
    "role": "품질보증 리드",
    "scope": "회귀·E2E·통합 테스트"
  },
  {
    "role": "접근성 담당",
    "scope": "키보드·라벨·상태 안내"
  },
  {
    "role": "성능 담당",
    "scope": "번들·응답·캐시"
  },
  {
    "role": "SEO 담당",
    "scope": "공개 페이지 색인과 보안 파일"
  },
  {
    "role": "관리자 콘솔 담당",
    "scope": "운영자 작업과 권한 분리"
  },
  {
    "role": "상품기획자",
    "scope": "상품 범위·제공물·가격"
  },
  {
    "role": "고객 여정 담당",
    "scope": "무료→유료→산출물 흐름"
  },
  {
    "role": "콘텐츠 발행 담당",
    "scope": "20분 인사이트·품질 게이트"
  },
  {
    "role": "데이터 보존 담당",
    "scope": "거래기록·개인정보 파기"
  },
  {
    "role": "위험진단 엔진 담당",
    "scope": "진단 근거와 품질 한계"
  },
  {
    "role": "문서 산출물 담당",
    "scope": "PDF/대시보드 산출물 품질"
  },
  {
    "role": "구독 운영 담당",
    "scope": "수동 갱신·만료 처리"
  },
  {
    "role": "환불 운영 담당",
    "scope": "중복 요청·검토 큐"
  },
  {
    "role": "부정사용 방지 담당",
    "scope": "토큰 추측·반복 다운로드"
  },
  {
    "role": "API 계약 담당",
    "scope": "응답 스키마·민감정보 제거"
  },
  {
    "role": "오류 메시지 담당",
    "scope": "내부 정보 노출 차단"
  },
  {
    "role": "환경설정 담당",
    "scope": "상용 필수키와 launch gate"
  },
  {
    "role": "백업 담당",
    "scope": "복구 가능성·암호화"
  },
  {
    "role": "메일 발송 담당",
    "scope": "영수/환불/장애 알림"
  },
  {
    "role": "브라우저 호환 담당",
    "scope": "모바일/데스크톱 동작"
  },
  {
    "role": "CDN 캐시 담당",
    "scope": "캐시 무효화·정적자원 버전"
  },
  {
    "role": "운영 모니터링 담당",
    "scope": "헬스·readyz·ops report"
  },
  {
    "role": "상용 출시 승인자",
    "scope": "go/no-go 체크"
  },
  {
    "role": "침해대응 담당",
    "scope": "웹훅·계정 이상 징후"
  },
  {
    "role": "개발자 경험 담당",
    "scope": "스크립트·런북·문서"
  },
  {
    "role": "데이터 분석 담당",
    "scope": "전환·환불·구매지표"
  },
  {
    "role": "국문 교정 담당",
    "scope": "오탈자·깨진 문자"
  },
  {
    "role": "표시광고 담당",
    "scope": "성과 보장·가격 표시"
  },
  {
    "role": "전자상거래 담당",
    "scope": "고지·통신판매 정보"
  },
  {
    "role": "개인정보 UI 담당",
    "scope": "동의·철회·내보내기"
  },
  {
    "role": "로그 보안 담당",
    "scope": "payload redaction"
  },
  {
    "role": "테스트 데이터 담당",
    "scope": "시드와 운영 데이터 분리"
  },
  {
    "role": "릴리즈 매니저",
    "scope": "ZIP·manifest·검증로그"
  },
  {
    "role": "외부 감사 대응 담당",
    "scope": "증적 제출 가능성"
  }
]);

export const PHASE315_IMPROVEMENT_BACKLOG = Object.freeze([
  {
    "id": "P315-001",
    "area": "결제",
    "status": "gate_or_applied",
    "action": "클라이언트가 보낸 가격과 상품명은 무시하고 서버 카탈로그 금액만 주문에 기록한다."
  },
  {
    "id": "P315-002",
    "area": "결제",
    "status": "gate_or_applied",
    "action": "무료 상품은 checkout-session 생성 대상에서 제외한다."
  },
  {
    "id": "P315-003",
    "area": "결제",
    "status": "gate_or_applied",
    "action": "결제 대상 siteId 또는 domain이 없으면 주문 생성을 차단한다."
  },
  {
    "id": "P315-004",
    "area": "결제",
    "status": "gate_or_applied",
    "action": "동일 idempotency key가 다른 요청 본문으로 재사용되면 409로 차단한다."
  },
  {
    "id": "P315-005",
    "area": "결제",
    "status": "gate_or_applied",
    "action": "결제 provider가 disabled이거나 prelaunch 제한 상태이면 결제창을 열지 않는다."
  },
  {
    "id": "P315-006",
    "area": "결제",
    "status": "gate_or_applied",
    "action": "PortOne 필수 환경값이 누락된 경우 결제 세션을 생성하지 않는다."
  },
  {
    "id": "P315-007",
    "area": "결제",
    "status": "gate_or_applied",
    "action": "결제 완료는 클라이언트 성공 콜백만으로 확정하지 않고 provider 조회 결과로만 paid 처리한다."
  },
  {
    "id": "P315-008",
    "area": "결제",
    "status": "gate_or_applied",
    "action": "결제 금액·주문번호·customData plan 불일치 시 주문을 failed로 전환한다."
  },
  {
    "id": "P315-009",
    "area": "결제",
    "status": "gate_or_applied",
    "action": "READY 또는 가상계좌 상태는 pending으로 유지하고 산출물 unlock을 금지한다."
  },
  {
    "id": "P315-010",
    "area": "결제",
    "status": "gate_or_applied",
    "action": "결제 완료 후 산출물 생성이 실패하지 않도록 paid 처리 경로에서 fulfillment를 보장한다."
  },
  {
    "id": "P315-011",
    "area": "권한",
    "status": "gate_or_applied",
    "action": "orderId 단독 조회를 금지하고 accessToken 또는 소유 계정 세션을 요구한다."
  },
  {
    "id": "P315-012",
    "area": "권한",
    "status": "gate_or_applied",
    "action": "portal-summary의 주문 접근도 order API와 동일한 권한 조건으로 통일한다."
  },
  {
    "id": "P315-013",
    "area": "권한",
    "status": "gate_or_applied",
    "action": "fulfillment 조회는 결제 완료 주문과 유효 접근권이 있어야 한다."
  },
  {
    "id": "P315-014",
    "area": "권한",
    "status": "gate_or_applied",
    "action": "fulfillment-download는 결제 완료 주문과 유효 접근권이 있어야 한다."
  },
  {
    "id": "P315-015",
    "area": "권한",
    "status": "gate_or_applied",
    "action": "guidance 문서는 siteId만으로 열리지 않도록 구매 권한을 요구한다."
  },
  {
    "id": "P315-016",
    "area": "권한",
    "status": "gate_or_applied",
    "action": "회원 소유성은 customerId 또는 정규화 이메일 기준으로만 판정한다."
  },
  {
    "id": "P315-017",
    "area": "권한",
    "status": "gate_or_applied",
    "action": "비회원 accessToken 비교는 timing-safe 비교 함수를 사용한다."
  },
  {
    "id": "P315-018",
    "area": "권한",
    "status": "gate_or_applied",
    "action": "주문 토큰은 public 응답에서 필요한 경우에만 반환한다."
  },
  {
    "id": "P315-019",
    "area": "권한",
    "status": "gate_or_applied",
    "action": "관리자 전용 상태 변경 API는 public route와 완전히 분리한다."
  },
  {
    "id": "P315-020",
    "area": "권한",
    "status": "gate_or_applied",
    "action": "만료된 접근권은 410으로 구분해 재구매/지원 안내가 가능하게 한다."
  },
  {
    "id": "P315-021",
    "area": "환불",
    "status": "gate_or_applied",
    "action": "결제 완료 주문이 아니면 환불 요청을 차단한다."
  },
  {
    "id": "P315-022",
    "area": "환불",
    "status": "gate_or_applied",
    "action": "환불 요청 가능 기간을 초과한 주문은 접수하지 않는다."
  },
  {
    "id": "P315-023",
    "area": "환불",
    "status": "gate_or_applied",
    "action": "동일 주문의 requested/reviewing 환불 요청 중복 생성을 막는다."
  },
  {
    "id": "P315-024",
    "area": "환불",
    "status": "gate_or_applied",
    "action": "환불 요청은 주문 소유자 또는 주문 토큰 보유자만 생성할 수 있다."
  },
  {
    "id": "P315-025",
    "area": "환불",
    "status": "gate_or_applied",
    "action": "환불 요청 시 주문 금액·플랜·고객 식별자를 증적으로 저장한다."
  },
  {
    "id": "P315-026",
    "area": "환불",
    "status": "gate_or_applied",
    "action": "운영자 환불 알림 메일은 민감정보를 마스킹한 meta만 포함한다."
  },
  {
    "id": "P315-027",
    "area": "환불",
    "status": "gate_or_applied",
    "action": "환불 정책 버전을 주문 consent와 연결해 사후 분쟁 증적을 확보한다."
  },
  {
    "id": "P315-028",
    "area": "환불",
    "status": "gate_or_applied",
    "action": "부분취소/전체취소 provider 상태를 주문 상태와 분리해 기록한다."
  },
  {
    "id": "P315-029",
    "area": "환불",
    "status": "gate_or_applied",
    "action": "환불 검토 큐는 결제 상태와 산출물 제공 상태를 함께 보도록 문서화한다."
  },
  {
    "id": "P315-030",
    "area": "환불",
    "status": "gate_or_applied",
    "action": "중복 결제·오류 결제와 단순 변심 요청을 분리 처리하도록 운영 보고서에 명시한다."
  },
  {
    "id": "P315-031",
    "area": "개인정보",
    "status": "gate_or_applied",
    "action": "결제 동의 증적에는 원문 IP 대신 ipHash만 저장한다."
  },
  {
    "id": "P315-032",
    "area": "개인정보",
    "status": "gate_or_applied",
    "action": "user-agent는 원문 대신 목적별 hash로 저장한다."
  },
  {
    "id": "P315-033",
    "area": "개인정보",
    "status": "gate_or_applied",
    "action": "webhook payload는 감사 로그에 저장하기 전 개인정보 마스킹을 적용한다."
  },
  {
    "id": "P315-034",
    "area": "개인정보",
    "status": "gate_or_applied",
    "action": "providerRaw와 accessToken은 public order 응답에서 제거한다."
  },
  {
    "id": "P315-035",
    "area": "개인정보",
    "status": "gate_or_applied",
    "action": "paymentSession 응답은 공개 허용 필드만 반환한다."
  },
  {
    "id": "P315-036",
    "area": "개인정보",
    "status": "gate_or_applied",
    "action": "provider payment 원본은 id/status/amount/paidAt 중심으로 축소 반환한다."
  },
  {
    "id": "P315-037",
    "area": "개인정보",
    "status": "gate_or_applied",
    "action": "결제수단 원문 카드번호 또는 인증정보 저장 경로가 없도록 검증한다."
  },
  {
    "id": "P315-038",
    "area": "개인정보",
    "status": "gate_or_applied",
    "action": "개인정보 export/deactivate 기능과 유료 주문 접근권을 충돌 없이 유지한다."
  },
  {
    "id": "P315-039",
    "area": "개인정보",
    "status": "gate_or_applied",
    "action": "보존기간 정리 대상에서 거래기록과 개인정보를 구분한다."
  },
  {
    "id": "P315-040",
    "area": "개인정보",
    "status": "gate_or_applied",
    "action": "개인정보 보호책임자와 사업자 정보가 환경변수로 확정되지 않으면 상용 게이트를 실패시킨다."
  },
  {
    "id": "P315-041",
    "area": "보안",
    "status": "gate_or_applied",
    "action": "PDF 다운로드 라우트에도 표준 보안 헤더를 적용한다."
  },
  {
    "id": "P315-042",
    "area": "보안",
    "status": "gate_or_applied",
    "action": "baseHeaders를 route context에 명시적으로 주입해 다운로드 500 오류를 차단한다."
  },
  {
    "id": "P315-043",
    "area": "보안",
    "status": "gate_or_applied",
    "action": "결제 완료와 웹훅 처리에는 주문별 distributed lock을 적용한다."
  },
  {
    "id": "P315-044",
    "area": "보안",
    "status": "gate_or_applied",
    "action": "checkout-session에는 대상/이메일 기준 lock을 적용해 중복 생성 경쟁을 줄인다."
  },
  {
    "id": "P315-045",
    "area": "보안",
    "status": "gate_or_applied",
    "action": "public diagnose와 checkout, payment-complete에 rate limit을 적용한다."
  },
  {
    "id": "P315-046",
    "area": "보안",
    "status": "gate_or_applied",
    "action": "웹훅 strict 모드에서는 서명 검증 실패를 401로 거부한다."
  },
  {
    "id": "P315-047",
    "area": "보안",
    "status": "gate_or_applied",
    "action": "웹훅 중복/동시 처리는 paymentId lock으로 충돌을 줄인다."
  },
  {
    "id": "P315-048",
    "area": "보안",
    "status": "gate_or_applied",
    "action": "CSP에 PortOne SDK와 frame/connect 출처를 명시한다."
  },
  {
    "id": "P315-049",
    "area": "보안",
    "status": "gate_or_applied",
    "action": "관리자 shared key는 상용 타깃에서 account RBAC 요구로 격리한다."
  },
  {
    "id": "P315-050",
    "area": "보안",
    "status": "gate_or_applied",
    "action": "client debug console 및 inline event handler가 남지 않도록 보안 검사를 유지한다."
  },
  {
    "id": "P315-051",
    "area": "운영/배포",
    "status": "gate_or_applied",
    "action": "release:predeploy와 delivery:final을 phase315 최종 게이트로 상향한다."
  },
  {
    "id": "P315-052",
    "area": "운영/배포",
    "status": "gate_or_applied",
    "action": "상용 오픈 전 DB·Redis·S3/R2·SMTP·Turnstile·PortOne 필수값을 검사한다."
  },
  {
    "id": "P315-053",
    "area": "운영/배포",
    "status": "gate_or_applied",
    "action": "런타임 active state는 릴리즈 ZIP에서 제거하고 seed만 유지한다."
  },
  {
    "id": "P315-054",
    "area": "운영/배포",
    "status": "gate_or_applied",
    "action": "운영 중 provider 장애 시 고객에게 재확인 안내를 반환한다."
  },
  {
    "id": "P315-055",
    "area": "운영/배포",
    "status": "gate_or_applied",
    "action": "PortOne provider 오류는 502로 구분해 재시도 UX가 가능하게 한다."
  },
  {
    "id": "P315-056",
    "area": "운영/배포",
    "status": "gate_or_applied",
    "action": "외부 결제 provider는 URL 미설정 시 paymentReady=false로 노출한다."
  },
  {
    "id": "P315-057",
    "area": "운영/배포",
    "status": "gate_or_applied",
    "action": "실서버 배포 후 live verification을 별도 단계로 남겨둔다."
  },
  {
    "id": "P315-058",
    "area": "운영/배포",
    "status": "gate_or_applied",
    "action": "Coolify/Contabo/Docker 배포 템플릿은 그대로 유지하면서 final gate만 갱신한다."
  },
  {
    "id": "P315-059",
    "area": "운영/배포",
    "status": "gate_or_applied",
    "action": "시크릿 위생 검사를 ZIP 생성 전후로 유지한다."
  },
  {
    "id": "P315-060",
    "area": "운영/배포",
    "status": "gate_or_applied",
    "action": "운영 리포트에 paymentEvents와 webhookInbox 카운트를 포함한다."
  },
  {
    "id": "P315-061",
    "area": "UX",
    "status": "gate_or_applied",
    "action": "결제 전 상품명·가격·기간·대상 사이트·제공방식을 한 화면에서 확인하게 한다."
  },
  {
    "id": "P315-062",
    "area": "UX",
    "status": "gate_or_applied",
    "action": "디지털 산출물 제공 및 청약철회 제한 고지를 별도 동의로 분리한다."
  },
  {
    "id": "P315-063",
    "area": "UX",
    "status": "gate_or_applied",
    "action": "Expert 플랜은 자동정기결제가 아니라 30일 수동 갱신형으로 명시한다."
  },
  {
    "id": "P315-064",
    "area": "UX",
    "status": "gate_or_applied",
    "action": "결제 실패·대기·완료·만료 상태 문구를 분리한다."
  },
  {
    "id": "P315-065",
    "area": "UX",
    "status": "gate_or_applied",
    "action": "산출물 다운로드 가능 상태와 잠금 상태를 portal에서 구분 표시한다."
  },
  {
    "id": "P315-066",
    "area": "UX",
    "status": "gate_or_applied",
    "action": "주문 토큰이 없는 비회원에게는 접근권 안내 문구를 반환한다."
  },
  {
    "id": "P315-067",
    "area": "UX",
    "status": "gate_or_applied",
    "action": "환불 접수 중복 시 duplicate=true를 반환해 사용자 혼선을 줄인다."
  },
  {
    "id": "P315-068",
    "area": "UX",
    "status": "gate_or_applied",
    "action": "인사이트/포털 화면은 v311 단일 디자인 시스템을 유지한다."
  },
  {
    "id": "P315-069",
    "area": "UX",
    "status": "gate_or_applied",
    "action": "오탈자와 깨진 특수문자 후보는 공개 화면 검증에서 차단한다."
  },
  {
    "id": "P315-070",
    "area": "UX",
    "status": "gate_or_applied",
    "action": "결제 후 포털 이동과 PDF 다운로드를 자연스럽게 이어지도록 API 응답을 정리한다."
  },
  {
    "id": "P315-071",
    "area": "테스트",
    "status": "gate_or_applied",
    "action": "phase315 paid redteam 통합 테스트를 추가한다."
  },
  {
    "id": "P315-072",
    "area": "테스트",
    "status": "gate_or_applied",
    "action": "비회원 guidance 무권한 접근이 403인지 확인한다."
  },
  {
    "id": "P315-073",
    "area": "테스트",
    "status": "gate_or_applied",
    "action": "결제 전 order API가 accessToken 없이 403인지 확인한다."
  },
  {
    "id": "P315-074",
    "area": "테스트",
    "status": "gate_or_applied",
    "action": "demo provider 결제 완료 후 paid 상태가 되는지 확인한다."
  },
  {
    "id": "P315-075",
    "area": "테스트",
    "status": "gate_or_applied",
    "action": "결제 완료 후 guidance 접근이 200인지 확인한다."
  },
  {
    "id": "P315-076",
    "area": "테스트",
    "status": "gate_or_applied",
    "action": "결제 완료 후 fulfillment 조회가 unlocked인지 확인한다."
  },
  {
    "id": "P315-077",
    "area": "테스트",
    "status": "gate_or_applied",
    "action": "PDF 다운로드가 실제 application/pdf와 본문을 반환하는지 확인한다."
  },
  {
    "id": "P315-078",
    "area": "테스트",
    "status": "gate_or_applied",
    "action": "paymentSession의 불필요한 paymentRequest 노출이 없는지 확인한다."
  },
  {
    "id": "P315-079",
    "area": "테스트",
    "status": "gate_or_applied",
    "action": "PortOne 정상/비정상 웹훅 테스트를 유지한다."
  },
  {
    "id": "P315-080",
    "area": "테스트",
    "status": "gate_or_applied",
    "action": "provider adapter와 external_http 결제 세션 테스트를 유지한다."
  },
  {
    "id": "P315-081",
    "area": "문서/법무",
    "status": "gate_or_applied",
    "action": "50개 실무 역할 회의 결과를 작업지시서에 기록한다."
  },
  {
    "id": "P315-082",
    "area": "문서/법무",
    "status": "gate_or_applied",
    "action": "100개 개선 항목을 machine-readable JSON과 markdown에 함께 기록한다."
  },
  {
    "id": "P315-083",
    "area": "문서/법무",
    "status": "gate_or_applied",
    "action": "유료 서비스 운영 모델에 phase315 council을 포함한다."
  },
  {
    "id": "P315-084",
    "area": "문서/법무",
    "status": "gate_or_applied",
    "action": "상품 카탈로그 버전을 phase315로 올려 코드와 문서의 일치성을 보장한다."
  },
  {
    "id": "P315-085",
    "area": "문서/법무",
    "status": "gate_or_applied",
    "action": "법률 자문이 아니라 자동진단 참고자료라는 고지를 산출물에 유지한다."
  },
  {
    "id": "P315-086",
    "area": "문서/법무",
    "status": "gate_or_applied",
    "action": "환불·이용약관·개인정보처리방침 동의 버전을 주문에 저장한다."
  },
  {
    "id": "P315-087",
    "area": "문서/법무",
    "status": "gate_or_applied",
    "action": "상용 결제 오픈 전 실제 법무 검토 필요성을 문서에 명시한다."
  },
  {
    "id": "P315-088",
    "area": "문서/법무",
    "status": "gate_or_applied",
    "action": "사업자 정보와 개인정보 보호책임자 입력 필요 항목을 유지한다."
  },
  {
    "id": "P315-089",
    "area": "문서/법무",
    "status": "gate_or_applied",
    "action": "유료 제공물의 SLA와 접근 기간을 상품별로 명시한다."
  },
  {
    "id": "P315-090",
    "area": "문서/법무",
    "status": "gate_or_applied",
    "action": "자동정기결제 미구현 상태에서 월 구독처럼 오인되는 문구를 차단한다."
  },
  {
    "id": "P315-091",
    "area": "관리자/관측성",
    "status": "gate_or_applied",
    "action": "관리자 주문 목록에서 결제·환불·산출물 상태를 추적할 수 있게 기존 구조를 유지한다."
  },
  {
    "id": "P315-092",
    "area": "관리자/관측성",
    "status": "gate_or_applied",
    "action": "webhookInbox에 rawSha256과 검증 상태를 남겨 재처리 판단이 가능하게 한다."
  },
  {
    "id": "P315-093",
    "area": "관리자/관측성",
    "status": "gate_or_applied",
    "action": "paymentEvents에 providerStatus와 orderStatus를 함께 기록한다."
  },
  {
    "id": "P315-094",
    "area": "관리자/관측성",
    "status": "gate_or_applied",
    "action": "audit log에는 주문·환불·지침 열람 이벤트를 남긴다."
  },
  {
    "id": "P315-095",
    "area": "관리자/관측성",
    "status": "gate_or_applied",
    "action": "ops-report에서 paymentEvents와 webhookInbox 카운트 확인을 테스트한다."
  },
  {
    "id": "P315-096",
    "area": "관리자/관측성",
    "status": "gate_or_applied",
    "action": "관리자 결제 취소/동기화 API는 public route와 분리한다."
  },
  {
    "id": "P315-097",
    "area": "관리자/관측성",
    "status": "gate_or_applied",
    "action": "산출물 생성 실패 시 운영자가 fulfillment 상태를 확인할 수 있게 한다."
  },
  {
    "id": "P315-098",
    "area": "관리자/관측성",
    "status": "gate_or_applied",
    "action": "백업/복구 드릴 스크립트는 기존 배포 검증에 유지한다."
  },
  {
    "id": "P315-099",
    "area": "관리자/관측성",
    "status": "gate_or_applied",
    "action": "readyz와 healthz는 런타임·저장소 상태 확인에 사용한다."
  },
  {
    "id": "P315-100",
    "area": "관리자/관측성",
    "status": "gate_or_applied",
    "action": "최종 phase315 audit JSON을 docs/current에 남겨 외부 감사 대응 자료로 사용한다."
  }
]);

export function sanitizePaymentSessionForPublic(session, { includePaymentRequest = false } = {}) {
  if (!session) return null;
  const safe = {
    id: session.id || null,
    orderId: session.orderId || null,
    provider: session.provider || null,
    providerPaymentId: session.providerPaymentId || null,
    providerState: session.providerState || null,
    redirectUrl: session.redirectUrl || null,
    checkoutHints: session.checkoutHints ? { ...session.checkoutHints } : undefined,
    retry: session.retry === true,
    createdAt: session.createdAt || null,
    completedAt: session.completedAt || null,
    lastVerificationSource: session.lastVerificationSource || null,
    lastSyncedAt: session.lastSyncedAt || null,
    lastVerificationError: session.lastVerificationError || null,
    lastProviderSnapshot: session.lastProviderSnapshot ? {
      id: session.lastProviderSnapshot.id || null,
      status: session.lastProviderSnapshot.status || null,
      amountTotal: Number(session.lastProviderSnapshot.amountTotal || 0),
      paidAt: session.lastProviderSnapshot.paidAt || null
    } : undefined
  };
  if (includePaymentRequest && session.paymentRequest) {
    const request = session.paymentRequest;
    safe.paymentRequest = {
      storeId: request.storeId,
      channelKey: request.channelKey,
      paymentId: request.paymentId,
      orderName: request.orderName,
      totalAmount: request.totalAmount,
      currency: request.currency,
      payMethod: request.payMethod,
      customer: request.customer ? {
        id: request.customer.id || undefined,
        fullName: request.customer.fullName || undefined,
        email: request.customer.email || undefined
      } : undefined,
      customData: request.customData ? {
        orderId: request.customData.orderId || undefined,
        siteId: request.customData.siteId || undefined,
        domain: request.customData.domain || undefined,
        plan: request.customData.plan || undefined,
        amount: request.customData.amount || undefined
      } : undefined,
      redirectUrl: request.redirectUrl || undefined,
      forceRedirect: request.forceRedirect === true,
      noticeUrls: Array.isArray(request.noticeUrls) ? [...request.noticeUrls] : undefined
    };
  }
  return Object.fromEntries(Object.entries(safe).filter(([, value]) => value !== undefined));
}

export function sanitizeProviderPaymentForPublic(payment) {
  if (!payment || typeof payment !== 'object') return null;
  const amountTotal = Number(payment?.amount?.total ?? payment?.amount ?? 0) || 0;
  return {
    id: payment.id || null,
    status: payment.status || null,
    amount: { total: amountTotal, currency: payment?.amount?.currency || payment?.currency || 'KRW' },
    paidAt: payment.paidAt || null,
    cancelledAt: payment.cancelledAt || null
  };
}

export function paidAccessWindow(order, now = Date.now()) {
  const offer = getCommercialOffer(order?.plan);
  const days = Number(offer?.accessDurationDays || 0);
  if (!order || order.status !== 'paid') return { active: false, reason: 'not_paid', expiresAt: null, days };
  if (!days) return { active: true, reason: 'no_expiry', expiresAt: null, days };
  const paidAt = Date.parse(order.paidAt || order.createdAt || '');
  if (!Number.isFinite(paidAt)) return { active: true, reason: 'paid_at_missing_grace', expiresAt: null, days };
  const expiresAt = paidAt + days * 24 * 60 * 60 * 1000;
  return { active: now <= expiresAt, reason: now <= expiresAt ? 'active' : 'expired', expiresAt: new Date(expiresAt).toISOString(), days };
}

export function buildPhase315PaidRedteamCouncil() {
  return {
    ok: true,
    version: PHASE315_PAID_REDTEAM_VERSION,
    roleCount: PHASE315_REDTEAM_ROLES.length,
    improvementCount: PHASE315_IMPROVEMENT_BACKLOG.length,
    roles: PHASE315_REDTEAM_ROLES.map((role, index) => ({ id: `role-${String(index + 1).padStart(2, '0')}`, ...role })),
    improvements: PHASE315_IMPROVEMENT_BACKLOG.map(item => ({ ...item })),
    mandatoryGates: [
      'checkout_target_required',
      'server_price_locked',
      'policy_consent_evidence',
      'provider_verified_paid_before_unlock',
      'order_token_or_owner_required',
      'fulfillment_download_auth_and_expiry',
      'guidance_document_auth_required',
      'public_payment_response_sanitized',
      'webhook_signature_or_provider_refetch',
      'release_predeploy_includes_phase315'
    ]
  };
}

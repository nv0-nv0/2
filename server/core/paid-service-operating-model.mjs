import { buildPlanCatalog, buildCommercialOfferCatalog, PRODUCT_CATALOG_VERSION } from '../../shared/product-catalog.mjs';
import { buildPaidRedteamCouncil, PAID_REDTEAM_VERSION } from './paid-service-redteam-control.mjs';

export const PAID_SERVICE_OPERATING_VERSION = 'paid-service-trustops-growth-model-v1';

export const PAID_ORDER_STATES = Object.freeze([
  'catalog_viewed',
  'target_confirmed',
  'consent_captured',
  'checkout_session_created',
  'provider_payment_requested',
  'provider_verified_paid',
  'fulfillment_generated',
  'portal_access_granted',
  'refund_requested',
  'refund_reviewed',
  'closed'
]);

export const PAID_SERVICE_UNLOCK_RULES = Object.freeze([
  { key: 'paid_only_download', label: 'PDF 다운로드는 provider_verified_paid 이후만 허용', required: ['order.status=paid', 'valid_order_token_or_owner'] },
  { key: 'target_required', label: '유료 주문은 siteId 또는 대상 URL이 확정되어야 함', required: ['siteId_or_domain'] },
  { key: 'server_price_source', label: '금액은 서버 카탈로그 기준으로만 계산', required: ['planPrice(server_catalog)'] },
  { key: 'consent_evidence', label: '동의 증적은 정책 버전, 시각, ipHash, userAgentHash로 저장', required: ['privacy', 'terms', 'refund', 'delivery'] },
  { key: 'provider_verification', label: 'PortOne 결제는 클라이언트 응답이 아니라 결제사 조회/웹훅으로 확정', required: ['provider_refetch_or_verified_webhook'] },
  { key: 'guest_token_required', label: '비회원 주문 조회·포털·산출물 접근은 주문 토큰 필요', required: ['accessToken_query_or_header'] },
  { key: 'subscription_scope', label: '전문가 플랜은 자동정기결제 전까지 30일 수동갱신형으로 표시', required: ['autoRecurringBilling=false'] },
  { key: 'refund_review_gate', label: '환불은 주문 상태, 제공 상태, 정책 버전, 중복 요청을 확인한 뒤 처리', required: ['status_paid', 'window_check', 'duplicate_guard'] }
]);

export function buildPaidServiceOperatingModel(options = {}) {
  const offers = options.offers || buildCommercialOfferCatalog();
  const plans = buildPlanCatalog(options.recommendedPlan || 'Report');
  const paymentProvider = options.paymentProvider || 'unknown';
  const paymentReady = Boolean(options.paymentReady);
  const prelaunchMode = Boolean(options.prelaunchMode);
  const commercialLaunchReady = Boolean(options.commercialLaunchReady);
  return {
    ok: true,
    version: PAID_SERVICE_OPERATING_VERSION,
    productCatalogVersion: PRODUCT_CATALOG_VERSION,
    generatedAt: options.generatedAt || new Date().toISOString(),
    payment: {
      provider: paymentProvider,
      paymentReady,
      prelaunchMode,
      commercialLaunchReady,
      authority: 'server_catalog_and_provider_verification',
      clientRole: 'collect_email_target_consent_and_open_payment_window_only',
      serverRole: 'price_lock_order_creation_provider_verification_fulfillment_unlock',
      providerVerification: paymentProvider === 'portone_v2'
        ? 'PortOne payment lookup or verified webhook required before paid unlock'
        : paymentProvider === 'external_http'
          ? 'External payment callback must be verified by integration layer before paid unlock'
          : 'Demo completion is blocked on commercial target'
    },
    catalog: plans.map((plan) => ({
      code: plan.code,
      title: plan.title,
      group: plan.group,
      billingType: plan.billingType,
      price: plan.price,
      period: plan.period,
      serviceScope: plan.serviceScope || null,
      deliveryMode: plan.deliveryMode || null,
      fulfillmentTrigger: plan.fulfillmentTrigger || null,
      fulfillmentSla: plan.fulfillmentSla || null,
      accessDurationDays: plan.accessDurationDays ?? null,
      renewalMode: plan.renewalMode || 'none',
      autoRecurringBilling: plan.autoRecurringBilling === true,
      refundRuleCode: plan.refundRuleCode || null,
      deliverables: plan.deliverables || plan.features || [],
      unlocks: plan.unlocks || []
    })),
    stateMachine: {
      orderStates: PAID_ORDER_STATES,
      happyPath: [
        'catalog_viewed',
        'target_confirmed',
        'consent_captured',
        'checkout_session_created',
        'provider_payment_requested',
        'provider_verified_paid',
        'fulfillment_generated',
        'portal_access_granted'
      ],
      failurePaths: [
        { from: 'checkout_session_created', to: 'closed', reason: 'payment_provider_not_ready_or_expired' },
        { from: 'provider_payment_requested', to: 'closed', reason: 'cancelled_failed_or_amount_mismatch' },
        { from: 'provider_verified_paid', to: 'refund_requested', reason: 'customer_refund_request' }
      ]
    },
    unlockRules: PAID_SERVICE_UNLOCK_RULES,
    evidence: {
      policyVersionsRequired: ['privacyPolicyVersion', 'termsVersion', 'refundPolicyVersion', 'withdrawalNoticeVersion', 'legalEvidenceVersion'],
      privacyMinimization: ['ipHash', 'userAgentHash', 'no_raw_card_data', 'no_raw_provider_payload_in_audit'],
      transactionRecords: ['orderId', 'plan', 'serverAmount', 'paymentProvider', 'paymentSessionId', 'statusHistory', 'paidAt']
    },
    customerExperience: {
      beforePayment: ['상품명', '가격', '기간', '대상 사이트', '제공 방식', '환불·청약철회 안내', '정책 링크'],
      afterPayment: ['주문번호', '결제 상태', '내 사이트 관리 링크', '산출물 상태', '다운로드 링크', '환불 요청 링크'],
      supportFallback: ['결제사 확인 지연 안내', '가상계좌/READY 상태 안내', '운영자 환불 검토 큐']
    },
    redteamFocus: buildPaidServiceRedteamChecklist(),
    paidRedteamCouncil: buildPaidRedteamCouncil(),
    paidRedteamVersion: PAID_REDTEAM_VERSION
  };
}

export function buildPaidServiceRedteamChecklist() {
  return [
    ['offer', '가격·기간·제공물 불일치 제거'],
    ['offer', 'Expert 자동정기결제 오인 문구 차단'],
    ['checkout', '대상 사이트 미확정 결제 차단'],
    ['checkout', '필수 동의 4종 누락 차단'],
    ['checkout', '클라이언트 금액 조작 무시'],
    ['checkout', 'Free 상품 결제 세션 생성 차단'],
    ['checkout', 'idempotency key 재사용 충돌 차단'],
    ['payment', '결제사 조회 전 paid unlock 차단'],
    ['payment', 'amount/currency/orderName 불일치 차단'],
    ['payment', 'READY/가상계좌 상태 pending 유지'],
    ['payment', '웹훅 중복/재전송 idempotency 처리'],
    ['payment', 'PortOne strict webhook 운영 플래그 점검'],
    ['access', '비회원 주문 토큰 없는 조회 차단'],
    ['access', '비회원 포털 orderId 단독 접근 차단'],
    ['access', '미결제 산출물 다운로드 차단'],
    ['fulfillment', '결제 확인 즉시 산출물 생성 보장'],
    ['fulfillment', '리포트 품질 게이트 미달 시 보강 상태 표시'],
    ['refund', '중복 환불 요청 차단'],
    ['refund', '정책 버전·제공 상태 기반 검토 큐'],
    ['compliance', '전자상거래 기록 보존 증적 유지'],
    ['compliance', '개인정보 최소수집·가명처리 유지'],
    ['ops', '운영 결제 disabled/prelaunch 상태에서 차단'],
    ['ops', '운영 DB/Redis/S3 미연결 시 launch gate 실패'],
    ['ux', '결제 실패·보류·완료 상태별 안내 분리'],
    ['ux', '결제 후 포털 이동 URL에 accessToken 포함']
  ].map(([area, label], index) => ({ key: `paid-redteam-${String(index + 1).padStart(2, '0')}`, area, label }));
}

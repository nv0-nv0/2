export const PRODUCT_CATALOG_VERSION = 'trustops-autopilot-commercial-model-v1';

export const COMMERCIAL_PRICE_TABLE = Object.freeze({
  Free: 0,
  Report: 49000,
  FixPack: 79000,
  Monitoring: 59000,
  Expert: 149000,
  Agency: 499000
});

export const COMMERCIAL_OFFER_CATALOG = Object.freeze([
  Object.freeze({
    code: 'Report',
    title: '기본 리포트',
    group: 'paid',
    billingType: 'one_time',
    price: COMMERCIAL_PRICE_TABLE.Report,
    monthlyPrice: COMMERCIAL_PRICE_TABLE.Report,
    period: '1회',
    summary: '사이트별 상세 위험 항목과 개선 우선순위를 확인합니다.',
    targetCustomer: '현재 사이트의 문제와 우선순위를 빠르게 확인하고 싶은 대표·마케터·운영자',
    deliverables: ['공개 접근 확인', '자동 수집 분석', '우선순위 점수 전체 제공', '페이지별 근거 요약', '실행 체크리스트 제공'],
    serviceScope: '결제 시 확정한 1개 사이트 URL에 대한 1회성 디지털 리포트',
    deliveryMode: 'portal_pdf_and_dashboard',
    fulfillmentTrigger: 'provider_verified_paid',
    fulfillmentSla: '결제 확인 즉시 자동 생성, 수동검수 필요 시 영업일 1일 이내 보강',
    accessDurationDays: 90,
    renewalMode: 'none',
    refundRuleCode: 'digital_report_one_time',
    unlocks: ['full_priority_score', 'evidence_summary', 'downloadable_report', 'execution_checklist'],
    referencePrice: 69000,
    valuePackWorth: 99000
  }),
  Object.freeze({
    code: 'FixPack',
    title: '개선 문구팩',
    group: 'paid',
    billingType: 'one_time',
    price: COMMERCIAL_PRICE_TABLE.FixPack,
    monthlyPrice: COMMERCIAL_PRICE_TABLE.FixPack,
    period: '1회',
    summary: '환불, 개인정보, 고객센터, 결제 전 안내 문구를 바로 복사해 적용합니다.',
    targetCustomer: '문제는 알지만 실제 수정 문구를 바로 만들고 싶은 운영자',
    deliverables: ['복사 가능한 개선 문구', 'HTML 블록', '업종별 FAQ', '삽입 위치 안내', '재진단 체크리스트'],
    serviceScope: '결제 시 확정한 1개 사이트 URL에 대한 개선 문구와 HTML 블록 제공',
    deliveryMode: 'portal_copy_pack_and_pdf',
    fulfillmentTrigger: 'provider_verified_paid',
    fulfillmentSla: '결제 확인 즉시 자동 생성',
    accessDurationDays: 90,
    renewalMode: 'none',
    refundRuleCode: 'digital_fix_pack_one_time',
    unlocks: ['copy_ready_fixes', 'html_snippets', 'industry_faq', 'placement_guide'],
    referencePrice: 129000,
    valuePackWorth: 159000
  }),
  Object.freeze({
    code: 'Monitoring',
    title: '월간 모니터링',
    group: 'paid',
    billingType: 'subscription',
    price: COMMERCIAL_PRICE_TABLE.Monitoring,
    monthlyPrice: COMMERCIAL_PRICE_TABLE.Monitoring,
    period: '월',
    summary: '주기적으로 사이트 변경을 감지하고 리스크 변화와 다음 조치를 안내합니다.',
    targetCustomer: '사이트가 자주 바뀌고 문의, 환불, 개인정보 안내 상태를 계속 확인해야 하는 팀',
    deliverables: ['주간 재진단', '변경 감지 요약', '리스크 변화 알림', '개선 문구 재생성', '월간 요약 리포트'],
    serviceScope: '결제 시 확정한 1개 사이트 URL에 대한 30일 모니터링',
    deliveryMode: 'portal_monitoring_and_digest',
    fulfillmentTrigger: 'provider_verified_paid',
    fulfillmentSla: '결제 확인 즉시 첫 점검 생성, 이후 주간 점검',
    accessDurationDays: 30,
    renewalMode: 'manual_renewal_until_recurring_billing_enabled',
    autoRecurringBilling: false,
    refundRuleCode: 'monthly_monitoring_manual_renewal',
    unlocks: ['weekly_recheck', 'change_detection', 'risk_delta', 'operator_digest'],
    referencePrice: 99000,
    valuePackWorth: 139000
  }),
  Object.freeze({
    code: 'Expert',
    title: '전문가 플랜',
    group: 'paid',
    billingType: 'subscription',
    price: COMMERCIAL_PRICE_TABLE.Expert,
    monthlyPrice: COMMERCIAL_PRICE_TABLE.Expert,
    period: '월',
    summary: '맞춤형 지침과 지속 점검을 함께 관리합니다.',
    targetCustomer: '정기 점검, 운영 개선, 고객 신뢰 문서 관리가 필요한 팀',
    deliverables: ['공개 접근 확인', '자동 수집 분석', '우선순위 점수 전체 제공', '상세 근거 정리', '전문가 해설 및 맞춤 제안', '정기 재점검 운영 가이드'],
    serviceScope: '결제 시 확정한 1개 사이트 URL에 대한 30일 운영 관리형 디지털 서비스',
    deliveryMode: 'portal_dashboard_report_and_recurring_guidance',
    fulfillmentTrigger: 'provider_verified_paid',
    fulfillmentSla: '결제 확인 즉시 기본 산출물 생성, 전문가 보강은 영업일 1일 이내 착수',
    accessDurationDays: 30,
    renewalMode: 'manual_renewal_until_recurring_billing_enabled',
    autoRecurringBilling: false,
    refundRuleCode: 'monthly_expert_manual_renewal',
    unlocks: ['full_priority_score', 'expert_commentary', 'recurring_rescan_guidance', 'portal_management', 'operator_checklist'],
    referencePrice: 199000,
    valuePackWorth: 249000
  }),
  Object.freeze({
    code: 'Agency',
    title: '대행사 화이트라벨',
    group: 'paid',
    billingType: 'subscription',
    price: COMMERCIAL_PRICE_TABLE.Agency,
    monthlyPrice: COMMERCIAL_PRICE_TABLE.Agency,
    period: '월',
    summary: '여러 고객 사이트를 관리하고 리포트를 대행사 명의로 재판매할 수 있게 합니다.',
    targetCustomer: '쇼핑몰 제작사, 마케팅 대행사, 홈페이지 운영 대행팀',
    deliverables: ['다중 사이트 관리', '화이트라벨 리포트', '고객별 대시보드', 'CSV 내보내기', 'API 확장 준비'],
    serviceScope: '월 20개 사이트까지의 대행사 운영 워크스페이스',
    deliveryMode: 'agency_workspace_and_whitelabel_reports',
    fulfillmentTrigger: 'provider_verified_paid',
    fulfillmentSla: '결제 확인 즉시 대행사 워크스페이스 제공',
    accessDurationDays: 30,
    renewalMode: 'manual_renewal_until_recurring_billing_enabled',
    autoRecurringBilling: false,
    refundRuleCode: 'monthly_agency_manual_renewal',
    unlocks: ['multi_site_workspace', 'whitelabel_pdf', 'agency_export', 'client_reporting'],
    referencePrice: 790000,
    valuePackWorth: 990000
  })
]);

export function formatWon(value) {
  return Number(value || 0).toLocaleString('ko-KR');
}

export function normalizePlanCode(value, fallback = 'Report') {
  const raw = String(value || '').trim();
  const key = raw.toLowerCase().replace(/[\s_-]+/g, '');
  const aliases = {
    free: 'Free', trial: 'Free', demo: 'Free',
    report: 'Report', basicreport: 'Report', detailedreport: 'Report', proreport: 'Report', pro: 'Report', basic: 'Report',
    fixpack: 'FixPack', fix: 'FixPack', copypack: 'FixPack', templatepack: 'FixPack', industryguide: 'FixPack',
    monitoring: 'Monitoring', monitor: 'Monitoring', auto: 'Monitoring', watch: 'Monitoring',
    expert: 'Expert', expertreport: 'Expert', expertplan: 'Expert', premium: 'Expert', professional: 'Expert',
    agency: 'Agency', whitelabel: 'Agency', whiteLabel: 'Agency', b2b: 'Agency', subscription: 'Monitoring'
  };
  return aliases[key] || (['Free', 'Report', 'FixPack', 'Monitoring', 'Expert', 'Agency'].includes(raw) ? raw : fallback);
}

export function buildCommercialOfferCatalog() {
  return COMMERCIAL_OFFER_CATALOG.map(item => ({ ...item, deliverables: [...item.deliverables] }));
}

export function getCommercialOffer(code) {
  const normalized = normalizePlanCode(code);
  return buildCommercialOfferCatalog().find(item => item.code === normalized) || null;
}

export function planPrice(code) {
  const normalized = normalizePlanCode(code);
  if (normalized === 'Free') return 0;
  const offer = getCommercialOffer(normalized);
  return offer ? Number(offer.price || offer.monthlyPrice || 0) : COMMERCIAL_PRICE_TABLE.Report;
}

export function buildPlanCatalog(recommendedPlan = 'Report') {
  const recommended = normalizePlanCode(recommendedPlan);
  const free = {
    code: 'Free',
    monthlyPrice: 0,
    price: 0,
    period: '무료',
    title: '무료 진단',
    group: 'free',
    billingType: 'free',
    summary: '사이트의 기본 상태를 빠르게 확인합니다.',
    features: ['공개 접근 확인', '자동 수집 분석', '우선순위 점수 일부 제공', 'URL 입력만으로 시작'],
    deliverables: ['공개 접근 확인', '자동 수집 분석', '우선순위 점수 일부 제공'],
    targetCustomer: '먼저 현재 상태를 확인하고 싶은 분',
    serviceScope: '공개 URL 기준 사전 점검 요약',
    deliveryMode: 'browser_summary_only',
    fulfillmentTrigger: 'scan_completed',
    accessDurationDays: 0,
    renewalMode: 'none',
    unlocks: ['partial_priority_score', 'summary_findings'],
    recommended: false
  };
  const paid = buildCommercialOfferCatalog().map(offer => ({
    ...offer,
    features: offer.deliverables.slice(0, 5),
    dailyPrice: 0,
    recommended: offer.code === recommended
  }));
  return [free, ...paid];
}

export function buildCatalogConsistencySnapshot() {
  return {
    version: PRODUCT_CATALOG_VERSION,
    prices: { ...COMMERCIAL_PRICE_TABLE },
    labels: {
      Report: `${formatWon(COMMERCIAL_PRICE_TABLE.Report)}원`,
      FixPack: `${formatWon(COMMERCIAL_PRICE_TABLE.FixPack)}원`,
      Monitoring: `${formatWon(COMMERCIAL_PRICE_TABLE.Monitoring)}원`,
      Expert: `${formatWon(COMMERCIAL_PRICE_TABLE.Expert)}원`,
      Agency: `${formatWon(COMMERCIAL_PRICE_TABLE.Agency)}원`
    },
    canonicalPlans: buildPlanCatalog().map(item => ({ code: item.code, title: item.title, price: item.price, period: item.period }))
  };
}

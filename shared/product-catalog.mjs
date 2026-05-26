export const PRODUCT_CATALOG_VERSION = 'phase300-commercial-catalog-lock-v1';

export const COMMERCIAL_PRICE_TABLE = Object.freeze({
  Free: 0,
  Report: 49000,
  Expert: 149000
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
    referencePrice: 69000,
    valuePackWorth: 99000
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
    referencePrice: 199000,
    valuePackWorth: 249000
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
    expert: 'Expert', expertreport: 'Expert', expertplan: 'Expert', premium: 'Expert', professional: 'Expert',
    fixpack: 'Expert', fix: 'Expert', copypack: 'Expert', templatepack: 'Expert', industryguide: 'Expert',
    auto: 'Expert', agency: 'Expert', subscription: 'Expert'
  };
  return aliases[key] || (['Free', 'Report', 'Expert'].includes(raw) ? raw : fallback);
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
      Expert: `${formatWon(COMMERCIAL_PRICE_TABLE.Expert)}원`
    },
    canonicalPlans: buildPlanCatalog().map(item => ({ code: item.code, title: item.title, price: item.price, period: item.period }))
  };
}

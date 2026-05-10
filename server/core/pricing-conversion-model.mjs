export const PHASE229_PRICING_VERSION = 'phase229-value-priced-quality-lock-v1';

export const PHASE229_PRICE_TABLE = Object.freeze({
  Report: 39000,
  FixPack: 79000,
  Auto: 149000
});

export const PHASE229_PREVIOUS_PRICE_TABLE = Object.freeze({
  Report: 69000,
  FixPack: 99000,
  Auto: 299000
});

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(number(value, min))));
}
function won(value) {
  return `${Math.round(number(value, 0)).toLocaleString('ko-KR')}원`;
}
function netAfterPg(price, pgFeeRate = 0.032) {
  const p = number(price, 0);
  const fee = Math.round(p * number(pgFeeRate, 0.032));
  return { gross: p, paymentFee: fee, netRevenue: p - fee, feeRate: number(pgFeeRate, 0.032) };
}
function conversionIndexFor(code, price) {
  const p = number(price, 0);
  const thresholds = {
    Report: { ideal: 39000, ceiling: 59000, base: 88 },
    FixPack: { ideal: 79000, ceiling: 99000, base: 92 },
    Auto: { ideal: 149000, ceiling: 199000, base: 84 }
  }[code] || { ideal: p || 1, ceiling: p || 1, base: 80 };
  const overIdeal = Math.max(0, p - thresholds.ideal);
  const underIdeal = Math.max(0, thresholds.ideal - p);
  const penalty = overIdeal / Math.max(1, thresholds.ceiling - thresholds.ideal) * 18 + underIdeal / Math.max(1, thresholds.ideal) * 8;
  return clamp(thresholds.base - penalty, 45, 98);
}
function revenueFitScore(code, price) {
  const conversion = conversionIndexFor(code, price);
  const net = netAfterPg(price).netRevenue;
  const netTarget = { Report: 37000, FixPack: 76000, Auto: 144000 }[code] || Math.max(1, price);
  const unitEconomics = clamp((net / Math.max(1, netTarget)) * 82, 40, 96);
  const qualityValue = code === 'FixPack' ? 98 : code === 'Report' ? 92 : 88;
  return clamp(conversion * 0.45 + unitEconomics * 0.35 + qualityValue * 0.20);
}

/**
 * Builds the value-priced catalog used after Phase229.
 * Prices are optimized for first-purchase conversion while preserving digital
 * gross margin and a clear ladder: low-friction report, main FixPack offer,
 * and lower-entry monthly Auto care.
 */
export function buildValuePricedOfferCatalog({ commonAssurance = [] } = {}) {
  const assurance = Array.isArray(commonAssurance) ? commonAssurance : [];
  return [
    {
      code: 'Report',
      group: 'one_time',
      title: '상세 리포트',
      price: PHASE229_PRICE_TABLE.Report,
      period: '1회',
      priority: 1,
      summary: '부담 없는 첫 결제로 문제 위치, 이유, 우선순위, 전체 근거를 확인합니다.',
      targetCustomer: '문제를 확인했지만 아직 수정 범위를 판단해야 하는 분',
      deliverables: ['전체 문제 상세 공개', '근거·한계·우선순위', '공유 가능한 개선 리포트', '재확인 체크리스트', '다음 행동 제안'],
      operations: ['결제 확인 후 전체 문제 상세와 근거 공개', '진단 이력이 없을 경우 기본 점검 양식으로 제공', ...assurance],
      benefits: ['구매 장벽을 낮춰 첫 결제를 쉽게 만듭니다.', '팀과 공유할 근거가 생깁니다.'],
      cta: '39,000원으로 전체 근거 열기',
      referencePrice: 120000,
      valuePackWorth: 195000,
      pricingBasis: 'low-friction-paid-unlock',
      conversionRole: '첫 유료 전환'
    },
    {
      code: 'FixPack',
      group: 'one_time',
      title: 'FixPack',
      price: PHASE229_PRICE_TABLE.FixPack,
      period: '1회',
      priority: 2,
      summary: '문제 확인에서 멈추지 않고 사이트에 바로 붙여넣을 수정 전/후 문장과 운영 문서를 제공합니다.',
      targetCustomer: '오늘 바로 푸터·환불·문의·CTA 문구를 고치고 싶은 분',
      deliverables: ['전체 문제 상세 공개', '수정 전/후 문장', '붙여넣을 위치 안내', '환불·문의·결제 전 안내 문구', '사이트 맞춤 운영 SOP', '재검증 기준'],
      operations: ['우선순위가 높은 문구부터 제공', '고객이 보는 화면 기준으로 정리', '사이트 맞춤 개선 지침과 운영 문서 포함', ...assurance],
      benefits: ['가장 빠르게 실행 가능한 주력 상품입니다.', '고객 불안을 줄이는 안내 흐름을 만들 수 있습니다.'],
      cta: '79,000원으로 문구까지 받기',
      referencePrice: 190000,
      valuePackWorth: 316000,
      pricingBasis: 'main-conversion-and-profit-offer',
      conversionRole: '주력 매출 전환'
    },
    {
      code: 'Auto',
      group: 'subscription',
      title: 'Auto 정기 케어',
      price: PHASE229_PRICE_TABLE.Auto,
      period: '월',
      priority: 3,
      summary: '월 10만 원대 진입가로 변경이 잦은 페이지의 안내 공백과 CTA 흐름을 반복 점검합니다.',
      targetCustomer: '광고·이벤트·랜딩페이지가 자주 바뀌는 팀',
      deliverables: ['정기 재진단', 'CTA 콘텐츠 흐름 관리', '변경 후 안내 공백 확인', '고위험 항목 우선 알림', '내 사이트 관리 대시보드', '게시판 콘텐츠 관리'],
      operations: ['정기 점검 결과 제공', '수정 후보는 확인 후 사용할 수 있도록 제공', '월 단위 반복 관리 기준 제공', ...assurance],
      benefits: ['월 결제 장벽을 낮춰 반복 매출 진입을 쉽게 만듭니다.', '여러 랜딩페이지의 문제를 우선순위로 볼 수 있습니다.'],
      cta: '월 149,000원으로 정기 케어 시작',
      referencePrice: 300000,
      valuePackWorth: 596000,
      pricingBasis: 'subscription-entry-price',
      conversionRole: '반복 매출'
    }
  ].map((offer) => {
    const economics = netAfterPg(offer.price);
    return {
      ...offer,
      previousPrice: PHASE229_PREVIOUS_PRICE_TABLE[offer.code],
      priceDropAmount: Math.max(0, number(PHASE229_PREVIOUS_PRICE_TABLE[offer.code], offer.price) - offer.price),
      priceDropRate: Number((Math.max(0, number(PHASE229_PREVIOUS_PRICE_TABLE[offer.code], offer.price) - offer.price) / Math.max(1, number(PHASE229_PREVIOUS_PRICE_TABLE[offer.code], offer.price))).toFixed(2)),
      conversionFitScore: conversionIndexFor(offer.code, offer.price),
      revenueFitScore: revenueFitScore(offer.code, offer.price),
      netRevenueAfterEstimatedPgFee: economics.netRevenue,
      estimatedPgFee: economics.paymentFee,
      valueMultiple: Number((offer.valuePackWorth / Math.max(1, offer.price)).toFixed(1))
    };
  }).sort((a, b) => a.priority - b.priority);
}

/**
 * Returns the Phase229 pricing decision record used by tests, public APIs, and
 * release notes. It keeps the pricing rationale separate from UI copy so future
 * price changes can be tested without weakening paid-output quality gates.
 */
export function buildPricingRecalculation({ pgFeeRate = 0.032 } = {}) {
  const offers = buildValuePricedOfferCatalog();
  const rows = offers.map((offer) => {
    const net = netAfterPg(offer.price, pgFeeRate);
    return {
      code: offer.code,
      title: offer.title,
      previousPrice: PHASE229_PREVIOUS_PRICE_TABLE[offer.code],
      recommendedPrice: offer.price,
      priceLabel: offer.period === '월' ? `${won(offer.price)} / 월` : won(offer.price),
      priceDropAmount: offer.priceDropAmount,
      priceDropRate: offer.priceDropRate,
      estimatedPaymentFee: net.paymentFee,
      estimatedNetRevenue: net.netRevenue,
      conversionFitScore: offer.conversionFitScore,
      revenueFitScore: offer.revenueFitScore,
      valueMultiple: offer.valueMultiple,
      role: offer.conversionRole,
      reason: offer.pricingBasis
    };
  });
  return {
    ok: true,
    version: PHASE229_PRICING_VERSION,
    recommendedFocusPlan: 'FixPack',
    strategy: '가격 장벽은 낮추고, 유료 결과물의 전체 상세·수정 문구·운영 문서 품질은 잠급니다.',
    pgAssumption: { source: 'PortOne public PG fee table baseline', cardFeeRate: pgFeeRate },
    prices: Object.fromEntries(rows.map((row) => [row.code, row.recommendedPrice])),
    rows,
    qualityLock: {
      minPaidFullDetailScore: 100,
      minSiteOperationsDocumentScore: 100,
      minPaidOutputGateScore: 98,
      freeDemoMustRemainLimited: true,
      paidMustExposeAllIssueDetails: true,
      fixPackMustIncludeBeforeAfterCopy: true,
      autoMustIncludeRecurringCarePlan: true
    },
    conclusion: '전환율과 수익률의 균형점은 Report 39,000원, FixPack 79,000원, Auto 월 149,000원이며, 주력 CTA는 FixPack입니다.'
  };
}

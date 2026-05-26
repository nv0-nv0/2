import { COMMERCIAL_PRICE_TABLE } from '../../shared/product-catalog.mjs';
export const PHASE250_PRICING_VERSION = 'phase250-three-plan-public-catalog-lock-v1';
export const PHASE229_PRICING_VERSION = PHASE250_PRICING_VERSION;

export const PHASE250_PRICE_TABLE = Object.freeze({
  Free: 0,
  Report: COMMERCIAL_PRICE_TABLE.Report,
  Expert: COMMERCIAL_PRICE_TABLE.Expert
});
export const PHASE229_PRICE_TABLE = PHASE250_PRICE_TABLE;
export const PHASE229_PREVIOUS_PRICE_TABLE = Object.freeze({
  Free: 0,
  Report: 69000,
  Expert: 199000
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
    Free: { ideal: 0, ceiling: 1, base: 96 },
    Report: { ideal: COMMERCIAL_PRICE_TABLE.Report, ceiling: 69000, base: 92 },
    Expert: { ideal: COMMERCIAL_PRICE_TABLE.Expert, ceiling: 199000, base: 88 }
  }[code] || { ideal: p || 1, ceiling: p || 1, base: 80 };
  const overIdeal = Math.max(0, p - thresholds.ideal);
  const underIdeal = Math.max(0, thresholds.ideal - p);
  const penalty = overIdeal / Math.max(1, thresholds.ceiling - thresholds.ideal) * 18 + underIdeal / Math.max(1, thresholds.ideal || 1) * 8;
  return clamp(thresholds.base - penalty, 45, 98);
}
function revenueFitScore(code, price) {
  if (code === 'Free') return 100;
  const conversion = conversionIndexFor(code, price);
  const net = netAfterPg(price).netRevenue;
  const netTarget = { Report: 47000, Expert: 143000 }[code] || Math.max(1, price);
  const unitEconomics = clamp((net / Math.max(1, netTarget)) * 82, 40, 96);
  const qualityValue = code === 'Expert' ? 98 : 92;
  return clamp(conversion * 0.45 + unitEconomics * 0.35 + qualityValue * 0.20);
}

export function buildValuePricedOfferCatalog({ commonAssurance = [] } = {}) {
  const assurance = Array.isArray(commonAssurance) ? commonAssurance : [];
  return [
    {
      code: 'Free',
      group: 'free',
      title: '무료 진단',
      price: 0,
      period: '무료',
      priority: 0,
      summary: '문제 영역, 영향 요소, 구분별 개수를 빠르게 확인합니다.',
      targetCustomer: '먼저 현재 상태를 확인하고 싶은 분',
      deliverables: ['문제 영역 개수', '영향 요소 개수', '구분별 문제 개수', 'URL 입력만으로 시작'],
      operations: ['상세 근거와 수정안은 유료 리포트에서 제공', ...assurance],
      benefits: ['부담 없이 현재 상태를 확인합니다.'],
      cta: '무료 진단 시작',
      referencePrice: 0,
      valuePackWorth: 0,
      pricingBasis: 'free-entry',
      conversionRole: '무료 진입'
    },
    {
      code: 'Report',
      group: 'one_time',
      title: '기본 리포트',
      price: PHASE250_PRICE_TABLE.Report,
      period: '1회',
      priority: 1,
      summary: '핵심 문제와 개선 우선순위를 한눈에 파악합니다.',
      targetCustomer: '문제와 우선순위를 빠르게 확인하고 싶은 분',
      deliverables: ['페이지별 문제 근거', '전체 문제 상세 공개', '우선순위 정리', '재확인 체크리스트', '다음 행동 제안'],
      operations: ['결제 확인 후 전체 문제 상세와 근거 공개', '진단 이력이 없을 경우 기본 점검 양식 제공', ...assurance],
      benefits: ['팀과 공유할 근거가 생깁니다.', '수정 전 우선순위를 정할 수 있습니다.'],
      cta: '49,000원으로 기본 리포트 보기',
      referencePrice: 49000,
      valuePackWorth: 69000,
      pricingBasis: 'low-friction-paid-report',
      conversionRole: '첫 유료 전환'
    },
    {
      code: 'Expert',
      group: 'one_time',
      title: '전문가 플랜',
      price: PHASE250_PRICE_TABLE.Expert,
      period: '월',
      priority: 2,
      summary: '상세 근거와 전문가 해설, 맞춤 개선 방향까지 제공합니다.',
      targetCustomer: '구조 개선안과 설명 가능한 근거가 필요한 대표·마케터·운영자',
      deliverables: ['상세 근거 정리', '전문가 해설', '맞춤 개선 방향', '수정 문구 제안', '재점검 기준'],
      operations: ['우선순위가 높은 항목부터 전문가 해설 제공', '고객이 보는 화면 기준으로 정리', ...assurance],
      benefits: ['실제 개선 실행까지 이어가기 쉽습니다.', '고객 불안을 줄이는 구조를 만들 수 있습니다.'],
      cta: '149,000원으로 전문가 플랜 보기',
      referencePrice: 199000,
      valuePackWorth: 249000,
      pricingBasis: 'expert-execution-report',
      conversionRole: '전문 분석 전환'
    }
  ].map((offer) => {
    const economics = netAfterPg(offer.price);
    const previous = PHASE229_PREVIOUS_PRICE_TABLE[offer.code] ?? offer.price;
    return {
      ...offer,
      previousPrice: previous,
      priceDropAmount: Math.max(0, number(previous, offer.price) - offer.price),
      priceDropRate: previous ? Number((Math.max(0, number(previous, offer.price) - offer.price) / Math.max(1, number(previous, offer.price))).toFixed(2)) : 0,
      conversionFitScore: conversionIndexFor(offer.code, offer.price),
      revenueFitScore: revenueFitScore(offer.code, offer.price),
      netRevenueAfterEstimatedPgFee: economics.netRevenue,
      estimatedPgFee: economics.paymentFee,
      valueMultiple: offer.price ? Number((offer.valuePackWorth / Math.max(1, offer.price)).toFixed(1)) : 0
    };
  }).sort((a, b) => a.priority - b.priority);
}

export function buildPricingRecalculation({ pgFeeRate = 0.032 } = {}) {
  const offers = buildValuePricedOfferCatalog();
  const rows = offers.map((offer) => {
    const net = netAfterPg(offer.price, pgFeeRate);
    return {
      code: offer.code,
      title: offer.title,
      previousPrice: PHASE229_PREVIOUS_PRICE_TABLE[offer.code],
      recommendedPrice: offer.price,
      priceLabel: offer.price === 0 ? '0원' : won(offer.price),
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
    version: PHASE250_PRICING_VERSION,
    recommendedFocusPlan: 'Report',
    strategy: '공개 요금제는 무료 진단, 기본 리포트, 전문가 리포트 3개로 고정합니다.',
    pgAssumption: { source: 'estimated PG fee baseline', cardFeeRate: pgFeeRate },
    prices: Object.fromEntries(rows.map((row) => [row.code, row.recommendedPrice])),
    rows,
    qualityLock: {
      freeDemoMustRemainLimited: true,
      freeDemoShowsCountsOnly: true,
      paidMustExposeAllIssueDetails: true,
      reportPriceMustEqualCheckout: COMMERCIAL_PRICE_TABLE.Report,
      expertPriceMustEqualCheckout: COMMERCIAL_PRICE_TABLE.Expert
    },
    conclusion: '공개 가격은 무료 진단 0원, 기본 리포트 49,000원, 전문가 플랜 149,000원으로 전 화면과 결제 흐름에서 일치합니다.'
  };
}

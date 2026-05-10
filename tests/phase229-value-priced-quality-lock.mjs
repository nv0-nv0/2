import assert from 'node:assert/strict';
import { buildPricingRecalculation, buildValuePricedOfferCatalog, PHASE229_PRICING_VERSION } from '../server/core/pricing-conversion-model.mjs';
import { buildPremiumPurchasedAsset } from '../server/core/premium-asset-builder.mjs';
import { buildPhase229OutputQualityLock, PHASE220_SERVICE_QUALITY_VERSION } from '../server/core/service-quality-220.mjs';

const sampleScan = {
  target: 'https://value-store.kr',
  normalizedTarget: 'https://value-store.kr',
  industry: '온라인 쇼핑몰',
  riskScore: 73,
  recommendedPlan: 'FixPack',
  evidenceSummary: { manualReviewCount: 1, scannedPages: [{ finalUrl: 'https://value-store.kr/checkout', status: 200, contentLength: 2400 }] },
  scoreModel: { manualReviewCount: 1 },
  detailFindings: [
    { code: 'REFUND-001', category: '환불 정책', priority: 'P0', title: '결제 버튼 주변 환불 제한 조건 부족', evidence: 'checkout page lacks refund copy', sourcePages: ['https://value-store.kr/checkout'], recommendation: '결제 버튼 주변에 환불 제한 조건과 문의 경로를 표시합니다.', fixTemplate: '산출물 제공 시작 후 환불 제한 조건을 결제 전 안내합니다.', autoFixEligible: true },
    { code: 'PRIVACY-001', category: '개인정보', priority: 'P1', title: '입력폼 주변 개인정보 보유기간 안내 부족', evidence: 'form has no retention copy', sourcePages: ['https://value-store.kr/apply'], recommendation: '수집 목적과 보유기간을 입력폼 하단에 표시합니다.', fixTemplate: '입력 정보는 문의 응대 후 운영 기준에 따라 보관·파기됩니다.', autoFixEligible: true },
    { code: 'CONTACT-001', category: '사업자 정보·문의 경로', priority: 'P1', title: '고객지원 응답 기준 부족', evidence: 'footer lacks response promise', sourcePages: ['https://value-store.kr'], recommendation: '이메일 전용 고객지원과 평일 확인 기준을 함께 표시합니다.', fixTemplate: '평일 09–18시 접수 순서대로 확인합니다.', autoFixEligible: true },
    { code: 'CLAIM-001', category: '광고 표현 리스크', priority: 'P2', title: '보장형 표현 완화 필요', evidence: 'guarantee copy appears in hero', sourcePages: ['https://value-store.kr/landing'], recommendation: '성과 보장 표현을 조건형 안내로 조정합니다.', fixTemplate: '결과는 상황에 따라 달라질 수 있습니다.', autoFixEligible: true }
  ]
};

const checks = [];
function check(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, message: error.message }); }
}

check('phase229 version is active', () => {
  assert.equal(PHASE229_PRICING_VERSION, 'phase229-value-priced-quality-lock-v1');
  assert.equal(PHASE220_SERVICE_QUALITY_VERSION, 'phase229-value-priced-quality-lock-v1');
});

check('price catalog lowers conversion barrier but keeps value economics', () => {
  const offers = buildValuePricedOfferCatalog();
  const map = Object.fromEntries(offers.map((item) => [item.code, item]));
  assert.equal(map.Report.price, 39000);
  assert.equal(map.FixPack.price, 79000);
  assert.equal(map.Auto.price, 149000);
  assert.ok(map.Report.priceDropAmount > 0);
  assert.ok(map.FixPack.conversionFitScore >= 90);
  assert.ok(map.FixPack.revenueFitScore >= map.Report.revenueFitScore - 6);
  assert.ok(map.FixPack.valueMultiple >= 4);
  assert.ok(map.Auto.priceDropRate >= 0.49);
});

check('pricing recalculation recommends FixPack as conversion and profit focus', () => {
  const recalc = buildPricingRecalculation();
  assert.equal(recalc.version, PHASE229_PRICING_VERSION);
  assert.equal(recalc.recommendedFocusPlan, 'FixPack');
  assert.deepEqual(recalc.prices, { Report: 39000, FixPack: 79000, Auto: 149000 });
  assert.ok(recalc.qualityLock.paidMustExposeAllIssueDetails);
  assert.ok(recalc.qualityLock.fixPackMustIncludeBeforeAfterCopy);
  assert.ok(recalc.rows.find((row) => row.code === 'FixPack').estimatedNetRevenue > 74000);
});

check('paid asset quality lock stays at 100 after price reduction', () => {
  const asset = buildPremiumPurchasedAsset({
    order: { id: 'ord_phase229', status: 'paid', plan: 'FixPack', amount: 79000, domain: 'value-store.kr', siteId: 'site_phase229', paidAt: new Date().toISOString() },
    offer: { code: 'FixPack', title: 'FixPack', price: 79000, period: '1회', deliverables: ['전체 상세', '수정 문구', '운영 문서'] },
    scan: sampleScan,
    site: { id: 'site_phase229', domain: 'value-store.kr', industry: '온라인 쇼핑몰' },
    businessProfile: { contactEmail: 'support@value-store.kr' }
  });
  assert.equal(asset.phase229OutputQualityLock.scope, 'phase229_paid_quality_lock');
  assert.equal(asset.phase229OutputQualityLock.ok, true);
  assert.equal(asset.phase229OutputQualityLock.score, 100);
  assert.equal(asset.paidFullDetailContract.completenessScore, 100);
  assert.equal(asset.siteOperationsDocument.qualityScore, 100);
  assert.ok(asset.fixes.length >= 3);
  assert.ok(asset.valueStatement.includes('가격은 낮추되'));
});

check('standalone output quality lock blocks weak assets', () => {
  const lock = buildPhase229OutputQualityLock({
    scan: sampleScan,
    order: { id: 'weak', status: 'paid', plan: 'FixPack', amount: 79000 },
    asset: { plan: 'FixPack', sections: [], fixes: [], acceptanceChecklist: [] }
  });
  assert.equal(lock.ok, false);
  assert.ok(lock.blockers.length >= 1);
});

const failed = checks.filter((item) => !item.ok);
console.log(JSON.stringify({ ok: failed.length === 0, passed: checks.length - failed.length, failed: failed.length, checks }, null, 2));
if (failed.length) process.exit(1);

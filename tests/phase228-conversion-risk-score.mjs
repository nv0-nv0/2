import assert from 'node:assert/strict';
import { buildPublicDiagnosisPackage } from '../server/core/diagnosis-report-package.mjs';
import { buildPremiumPurchasedAsset } from '../server/core/premium-asset-builder.mjs';
import { buildConversionUrgencyModel, buildDemoIssueOverview, PHASE220_SERVICE_QUALITY_VERSION } from '../server/core/service-quality-220.mjs';

const sampleScan = {
  target: 'https://conversion-store.kr',
  normalizedTarget: 'https://conversion-store.kr',
  industry: '온라인 쇼핑몰',
  riskScore: 71,
  riskLevel: '우선 개선',
  evidenceSummary: { manualReviewCount: 2, scannedPages: [{ finalUrl: 'https://conversion-store.kr/checkout', status: 200 }] },
  scoreModel: { manualReviewCount: 2 },
  recommendedPlan: 'FixPack',
  detailFindings: [
    { code: 'REFUND-CTA-001', category: '환불 정책', priority: 'P0', title: '환불 제한 조건이 결제 버튼 주변에 보이지 않음', impact: '결제 전 불안으로 구매 망설임이 생길 수 있습니다.', evidence: 'refund text missing near checkout', sourcePages: ['https://conversion-store.kr/checkout'], recommendation: '결제 버튼 주변에 환불 가능 조건과 제한 조건을 명확히 표시합니다.', fixTemplate: '산출물 제공 시작 후 환불 제한 조건을 결제 전 안내합니다.', autoFixEligible: true },
    { code: 'CONTACT-001', category: '사업자 정보·문의 경로', priority: 'P1', title: '문의 경로와 사업자 정보가 푸터에서 약함', impact: '신뢰 확인 시간이 길어져 이탈 가능성이 커집니다.', evidence: 'footer lacks contact promise', sourcePages: ['https://conversion-store.kr'], recommendation: '푸터에 이메일 전용 고객지원과 답변 기준을 같이 표시합니다.', fixTemplate: '고객지원 이메일과 답변 기준을 표시합니다.', autoFixEligible: true },
    { code: 'PRIVACY-001', category: '개인정보·동의', priority: 'P1', title: '입력폼 주변 수집 목적 안내 부족', impact: '개인정보 입력 직전 이탈이 생길 수 있습니다.', evidence: 'form lacks retention copy', sourcePages: ['https://conversion-store.kr/apply'], recommendation: '수집 목적, 항목, 보관 기간을 입력폼 주변에 표시합니다.', fixTemplate: '개인정보 수집 목적과 보유기간을 안내합니다.', manualReviewRequired: true, autoFixEligible: true },
    { code: 'CLAIM-001', category: '광고 표현 리스크', priority: 'P2', title: '보장형 표현 완화 필요', impact: '과장 표현으로 보일 수 있습니다.', evidence: 'guarantee style claim', sourcePages: ['https://conversion-store.kr/landing'], recommendation: '성과 보장 표현을 조건형 안내로 조정합니다.', fixTemplate: '결과는 보장하지 않으며 상황에 따라 달라질 수 있습니다.', autoFixEligible: true }
  ]
};

const checks = [];
function check(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, message: error.message }); }
}

check('phase228 version is active', () => {
  assert.equal(PHASE220_SERVICE_QUALITY_VERSION, 'phase229-value-priced-quality-lock-v1');
});

check('conversion urgency model exposes visual crisis score and CTA copy', () => {
  const model = buildConversionUrgencyModel(sampleScan, { plan: 'FixPack' });
  assert.equal(model.scope, 'free_demo_conversion_crisis_score');
  assert.ok(model.crisisScore >= 66);
  assert.ok(['높음', '매우 높음', '주의'].includes(model.crisisLabel));
  assert.ok(model.headline.includes('구매'));
  assert.ok(model.primaryCta.includes('결제'));
  assert.ok(model.secondaryCta.includes('FixPack'));
  assert.ok(model.projectedAfterFixScore < model.crisisScore);
  assert.ok(model.conversionBlockers.some((item) => item.label.includes('환불')));
  assert.ok(model.purchasePath.length >= 3);
  assert.ok(model.disclaimer.includes('법률 위반'));
});

check('free demo keeps limited overview but now includes conversion urgency via diagnosis package', () => {
  const diagnosis = buildPublicDiagnosisPackage(sampleScan, { rulesVersion: 'phase228-test' });
  const overview = buildDemoIssueOverview(sampleScan);
  assert.equal(overview.scope, 'free_demo_problem_area_element_count_only');
  assert.equal(diagnosis.conversionUrgency.scope, 'free_demo_conversion_crisis_score');
  assert.equal(diagnosis.serviceQuality.conversionUrgency.scope, 'free_demo_conversion_crisis_score');
  assert.ok(diagnosis.conversionUrgency.crisisScore >= overview.totalIssueCount);
  assert.equal(JSON.stringify(overview).includes('refund text missing near checkout'), false);
});

check('paid asset carries conversion urgency for portal and fulfillment copy', () => {
  const asset = buildPremiumPurchasedAsset({
    order: { id: 'order_phase228', plan: 'FixPack', amount: 149000, domain: 'conversion-store.kr' },
    offer: { code: 'FixPack', title: 'FixPack 수정 패키지', price: 149000 },
    scan: sampleScan,
    site: { id: 'site_phase228', domain: 'conversion-store.kr', industry: '온라인 쇼핑몰' },
    businessProfile: { contactEmail: 'support@conversion-store.kr' }
  });
  assert.equal(asset.conversionUrgency.scope, 'free_demo_conversion_crisis_score');
  assert.ok(asset.conversionUrgency.crisisScore >= 66);
  assert.ok(asset.paidFullDetailContract.allDetailsVisible);
  assert.equal(asset.siteOperationsDocument.qualityScore, 100);
  assert.ok(asset.customerVisibleConversionCopy.includes('전환 위기도'));
});

const failed = checks.filter((item) => !item.ok);
console.log(JSON.stringify({ ok: failed.length === 0, passed: checks.length - failed.length, failed: failed.length, checks }, null, 2));
if (failed.length) process.exit(1);

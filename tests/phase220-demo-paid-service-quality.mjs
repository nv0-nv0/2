import assert from 'node:assert/strict';
import { buildPublicDiagnosisPackage } from '../server/core/diagnosis-report-package.mjs';
import { buildPremiumPurchasedAsset } from '../server/core/premium-asset-builder.mjs';
import { buildDemoAccuracyContract, buildPaidDeliverableBlueprint, buildPaidOutputQualityGate, PHASE220_SERVICE_QUALITY_VERSION } from '../server/core/service-quality-220.mjs';

const scan = {
  requestId: 'phase220-demo-scan',
  target: 'https://example-store.kr',
  normalizedTarget: 'https://example-store.kr/',
  fetched: true,
  provider: 'builtin',
  riskScore: 72,
  riskLevel: '보완 필요',
  recommendedPlan: 'FixPack',
  evidenceSummary: {
    attemptedPageCount: 6,
    successfulPageCount: 5,
    coverageScore: 83,
    confidenceScore: 78,
    manualReviewCount: 2,
    scannedPages: [
      { url: 'https://example-store.kr/', finalUrl: 'https://example-store.kr/', status: 200, contentLength: 2400 },
      { url: 'https://example-store.kr/privacy', finalUrl: 'https://example-store.kr/privacy', status: 200, contentLength: 1200 },
      { url: 'https://example-store.kr/refund', finalUrl: 'https://example-store.kr/refund', status: 200, contentLength: 900 }
    ]
  },
  scoreModel: { manualReviewCount: 2, scoreDisclaimer: '점수는 법적 결론이 아니라 발견 항목의 우선순위입니다.' },
  detailFindings: [
    { code: 'REFUND_VISIBLE', category: '환불 기준', priority: 'P1', title: '환불 기준 위치가 결제 버튼과 떨어져 있음', evidence: 'refund page paragraph', recommendation: '결제 전 버튼 주변에 환불 가능 조건과 제한 기준을 요약합니다.', certainty: 'high', sourcePages: [{ url: 'https://example-store.kr/refund' }] },
    { code: 'PRIVACY_FORM', category: '개인정보', priority: 'P1', title: '입력폼 주변 개인정보 고지가 부족함', evidence: 'form without retention copy', recommendation: '수집 목적·항목·보유기간을 입력폼 주변에 추가합니다.', certainty: 'medium', manualReviewRequired: true },
    { code: 'CONTACT_PATH', category: '고객지원', priority: 'P2', title: '문의 응답 기준이 명확하지 않음', evidence: 'footer email only', recommendation: '영업일 기준 응답 기준과 필요한 정보를 함께 안내합니다.', certainty: 'medium' }
  ]
};

const demo = buildDemoAccuracyContract(scan);
assert.equal(demo.version, PHASE220_SERVICE_QUALITY_VERSION);
assert.ok(demo.score >= 70, `demo score too low: ${demo.score}`);
assert.equal(demo.sourceTrace.attemptedPageCount, 6);
assert.equal(demo.sourceTrace.successfulPageCount, 5);
assert.ok(demo.falsePositiveControls.length >= 4, 'false-positive controls required');
assert.ok(demo.gates.every((item) => typeof item.ok === 'boolean'), 'all demo gates must be boolean');

const blueprint = buildPaidDeliverableBlueprint(scan, 'FixPack');
assert.equal(blueprint.plan, 'FixPack');
assert.ok(blueprint.requiredSections.length >= 12, 'paid blueprint requires full section list');
assert.ok(blueprint.acceptanceChecklist.length >= 10, 'acceptance checklist must be complete');
assert.ok(blueprint.evidenceMatrix.length >= 3, 'evidence matrix must be produced from findings');
assert.ok(blueprint.includedDeliverables.includes('수정 전/후 문구'), 'FixPack must include before/after copy');

const diagnosis = buildPublicDiagnosisPackage(scan, { rulesVersion: 'phase220-test', ctaIntervalMs: 20 * 60_000 });
assert.ok(diagnosis.serviceQuality?.demoAccuracy?.score >= 70, 'public diagnosis must expose phase220 demo accuracy');
assert.ok(diagnosis.paidDeliverableBlueprint?.acceptanceChecklist.length >= 10, 'public diagnosis must expose paid blueprint acceptance checks');
assert.equal(diagnosis.automation.intervalMinutes, 20, 'CTA cadence must remain 20 minutes');
assert.ok(diagnosis.productQualityGate.demoAccuracyScore >= 70, 'product quality gate must include demo accuracy score');

const order = { id: 'ord_phase220', status: 'paid', plan: 'FixPack', amount: 99000, siteId: 'site_phase220', domain: 'https://example-store.kr', email: 'owner@example.com', paidAt: new Date().toISOString() };
const offer = { code: 'FixPack', title: 'FixPack', price: 99000, deliverables: ['상세 리포트', '수정 문구안', '재점검 기준'] };
const asset = buildPremiumPurchasedAsset({ order, offer, scan, site: { id: 'site_phase220', domain: 'https://example-store.kr' }, businessProfile: { contactEmail: 'ct@nv0.kr' }, policyDocuments: [], industryGuide: { industry: '일반 이커머스', checklist: ['환불 기준 확인', '개인정보 안내 확인', '문의 경로 확인'] } });
assert.ok(asset.demoAccuracyContract?.score >= 70, 'premium asset must retain demo accuracy trace');
assert.ok(asset.paidDeliverableBlueprint?.requiredSections.length >= 12, 'premium asset must retain paid blueprint');
assert.ok(asset.paidOutputQualityGate?.score >= 85, `paid output gate score too low: ${asset.paidOutputQualityGate?.score}`);
assert.ok(asset.paidOutputQualityGate?.ok, `paid output gate must pass: ${JSON.stringify(asset.paidOutputQualityGate?.blockers)}`);
assert.ok(asset.outputPerformanceProfile?.demoAccuracyScore >= 70, 'output performance profile must include demo accuracy');
assert.ok(asset.acceptanceChecklist.length >= 10, 'asset acceptance checklist must be complete');
assert.ok(asset.measurementPlan.length >= 5, 'asset measurement plan must be complete');

const standaloneGate = buildPaidOutputQualityGate({ order, asset, scan });
assert.ok(standaloneGate.ok, `standalone paid gate must pass: ${JSON.stringify(standaloneGate.blockers)}`);
assert.ok(standaloneGate.accuracyProtocol.length >= 4, 'accuracy protocol must be visible');

console.log(JSON.stringify({
  ok: true,
  test: 'phase220-demo-paid-service-quality',
  version: PHASE220_SERVICE_QUALITY_VERSION,
  demoScore: demo.score,
  paidGateScore: asset.paidOutputQualityGate.score,
  acceptanceChecks: asset.acceptanceChecklist.length,
  measurementItems: asset.measurementPlan.length,
  ctaIntervalMinutes: diagnosis.automation.intervalMinutes,
  target: 'demo_and_paid_output_quality_100_point_gate'
}, null, 2));

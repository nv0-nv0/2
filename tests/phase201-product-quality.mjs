import assert from 'node:assert/strict';
import { buildPublicDiagnosisPackage } from '../server/core/diagnosis-report-package.mjs';
import { buildPremiumPurchasedAsset } from '../server/core/premium-asset-builder.mjs';
import { buildFulfillmentChecklist } from '../server/services/order-fulfillment.mjs';
import {
  buildAdminOperatingProfile,
  buildDiagnosisAccuracyProfile,
  buildFulfillmentQualityProfile,
  buildReportQualityProfile
} from '../server/core/product-quality-engine.mjs';

const scan = {
  requestId: 'req_phase201',
  siteId: 'site_phase201',
  target: 'https://example.com',
  fetched: true,
  riskScore: 68,
  riskLevel: '높음',
  totalFindings: 4,
  evidenceSummary: {
    coverageScore: 82,
    confidenceScore: 76,
    attemptedPageCount: 4,
    successfulPageCount: 4,
    failedPageCount: 0,
    manualReviewCount: 1,
    scannedPages: [
      { url: 'https://example.com', status: 200, contentLength: 1400 },
      { url: 'https://example.com/privacy', status: 200, contentLength: 2200 },
      { url: 'https://example.com/refund', status: 200, contentLength: 1200 }
    ]
  },
  detailFindings: [
    { code: 'PRIVACY-LINK', title: '개인정보 처리방침 노출 보완', category: '정책', severity: 8, priority: 'P1', certainty: '높음', evidence: 'privacy link detected but retention term missing', recommendation: '수집 항목, 목적, 보유기간을 입력폼 주변에 표시합니다.' },
    { code: 'REFUND-POLICY', title: '환불 기준 문구 보완', category: '정책', severity: 7, priority: 'P1', certainty: '보통', evidence: 'refund page exists but conditions unclear', recommendation: '환불 가능/불가 조건과 문의 경로를 결제 전 단계에 배치합니다.' },
    { code: 'CONTACT', title: '고객지원 경로 정리', category: '운영', severity: 6, priority: 'P2', certainty: '높음', evidence: 'support email visible', recommendation: '이메일 전용 고객지원임을 명확히 표시합니다.' },
    { code: 'MANUAL-CHECK', title: '사업자 정보 최종 확인', category: '운영', severity: 5, priority: 'P2', certainty: '확인 필요', manualReviewRequired: true, evidence: 'registry data requires operator review', recommendation: '사업자번호와 통신판매업 신고 정보를 운영자가 재확인합니다.' }
  ],
  topFindings: ['개인정보 처리방침 노출 보완', '환불 기준 문구 보완', '고객지원 경로 정리']
};

const accuracy = buildDiagnosisAccuracyProfile(scan);
assert.ok(accuracy.score >= 68, `accuracy score too low: ${accuracy.score}`);
assert.equal(accuracy.falsePositiveRisk, 'low');
assert.equal(accuracy.evidenceCoverage.successfulPages, 4);
assert.equal(accuracy.findingReliability.manualReviewCount, 1);

const publicPackage = buildPublicDiagnosisPackage(scan, { source: 'test' });
assert.equal(publicPackage.productQualityGate.accuracyScore, publicPackage.accuracyProfile.score);
assert.ok(publicPackage.productQualityGate.reportQualityScore >= 70);
assert.equal(publicPackage.productQualityGate.blockers.length, 0);

const order = {
  id: 'ord_phase201',
  status: 'paid',
  plan: 'Pro',
  amount: 149000,
  customerEmail: 'buyer@example.com',
  targetUrl: 'https://example.com',
  paidAt: '2026-05-04T00:00:00.000Z',
  accessToken: 'tok_phase201'
};
const offer = { code: 'Pro', title: 'VERIDION Pro', price: 149000 };
const asset = buildPremiumPurchasedAsset({ order, offer, scan, businessProfile: { contactEmail: 'ct@nv0.kr' } });
assert.ok(asset.diagnosisAccuracyProfile.score >= 68);
assert.ok(asset.reportQualityProfile.score >= 75, `report quality too low: ${asset.reportQualityProfile.score}`);
assert.equal(asset.fulfillmentQualityProfile.ok, true);
assert.ok(asset.deliverableIndex.some(item => /상세 문제 분석|요약 대시보드/.test(item.name) && item.included));

const reportQuality = buildReportQualityProfile(asset, scan);
const fulfillmentQuality = buildFulfillmentQualityProfile(order, asset, scan);
assert.ok(reportQuality.blockers.length === 0);
assert.equal(fulfillmentQuality.deliveryState, 'deliverable_ready');

const checklist = buildFulfillmentChecklist(order, asset);
assert.equal(checklist.ok, true);
assert.ok(checklist.items.some(item => item.key === 'report_quality_gate'));
assert.ok(checklist.items.some(item => item.key === 'fulfillment_quality_gate'));

const adminProfile = buildAdminOperatingProfile({
  scans: [scan],
  orders: [order],
  purchasedAssets: [{ ...asset, orderId: order.id }],
  refundRequests: [],
  emailOutbox: [],
  autoFixJobs: []
});
assert.equal(adminProfile.ok, true);
assert.equal(adminProfile.counts.paidWithoutAsset, 0);
assert.ok(adminProfile.latestDiagnosisAccuracy.score >= 68);

console.log(JSON.stringify({ ok: true, tests: 20, phase: 'phase201-product-quality' }, null, 2));

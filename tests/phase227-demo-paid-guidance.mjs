import assert from 'node:assert/strict';
import { buildPublicDiagnosisPackage } from '../server/core/diagnosis-report-package.mjs';
import { buildPremiumPurchasedAsset } from '../server/core/premium-asset-builder.mjs';
import { buildDemoIssueOverview, buildPaidFullDetailContract, buildSiteOperationsDocument, PHASE220_SERVICE_QUALITY_VERSION } from '../server/core/service-quality-220.mjs';

const sampleScan = {
  target: 'https://example-store.kr',
  normalizedTarget: 'https://example-store.kr',
  industry: '온라인 쇼핑몰',
  riskScore: 72,
  riskLevel: '우선 개선',
  evidenceSummary: { manualReviewCount: 1, scannedPages: [{ finalUrl: 'https://example-store.kr/privacy', status: 200 }] },
  scoreModel: { manualReviewCount: 1 },
  detailFindings: [
    { code: 'PRIVACY-001', category: '개인정보', priority: 'P1', title: '개인정보 보관 기간 안내 부족', evidence: 'SECRET_EVIDENCE_PRIVACY', sourcePages: ['https://example-store.kr/privacy'], limitation: '보관 기간 원문 확인 필요', recommendation: '수집 목적, 항목, 보관 기간을 입력폼 주변에 표시합니다.', fixTemplate: '개인정보 수집 목적과 보유기간을 안내합니다.', manualReviewRequired: true },
    { code: 'REFUND-001', category: '환불 정책', priority: 'P0', title: '환불 제한 조건이 결제 전 보이지 않음', evidence: 'SECRET_EVIDENCE_REFUND', sourcePages: ['https://example-store.kr/checkout'], limitation: '결제 단계 확인 필요', recommendation: '결제 버튼 주변에 환불 가능 조건과 제한 조건을 표시합니다.', fixTemplate: '산출물 제공 시작 후 환불 제한 조건을 명확히 안내합니다.' },
    { code: 'BUSINESS-001', category: '사업자 정보', priority: 'P1', title: '고객지원 경로와 사업자 정보 확인 필요', evidence: 'SECRET_EVIDENCE_BUSINESS', sourcePages: ['https://example-store.kr'], limitation: '푸터 확인 필요', recommendation: '푸터에 고객지원 이메일과 사업자 정보를 함께 표시합니다.', fixTemplate: '이메일 전용 고객지원 안내를 표시합니다.' },
    { code: 'MARKETING-001', category: '광고 표현', priority: 'P2', title: '보장형 표현 완화 필요', evidence: 'SECRET_EVIDENCE_MARKETING', sourcePages: ['https://example-store.kr/landing'], limitation: '광고 문구 검토 필요', recommendation: '성과 보장 표현을 조건형 안내로 조정합니다.', fixTemplate: '결과는 보장하지 않으며 상황에 따라 달라질 수 있습니다.' }
  ]
};

const checks = [];
function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, message: error.message });
  }
}

check('phase227 version is active', () => {
  assert.equal(PHASE220_SERVICE_QUALITY_VERSION, 'phase229-value-priced-quality-lock-v1');
});

check('free demo exposes problem areas/elements/counts only', () => {
  const overview = buildDemoIssueOverview(sampleScan);
  assert.equal(overview.scope, 'free_demo_problem_area_element_count_only');
  assert.equal(overview.totalIssueCount, 4);
  assert.ok(overview.areaCount >= 4);
  assert.ok(overview.elementCount >= 12);
  assert.equal(JSON.stringify(overview).includes('SECRET_EVIDENCE_PRIVACY'), false);
  assert.ok(overview.paidUnlockFields.includes('full evidence'));
});

check('paid contract exposes 100% detail rows', () => {
  const paid = buildPaidFullDetailContract({ scan: sampleScan, order: { id: 'order_phase227', plan: 'Pro' } });
  assert.equal(paid.scope, 'paid_full_detail_100_percent_disclosure');
  assert.equal(paid.totalIssueCount, 4);
  assert.equal(paid.exposedIssueCount, 4);
  assert.equal(paid.allDetailsVisible, true);
  assert.equal(paid.completenessScore, 100);
  assert.equal(JSON.stringify(paid).includes('SECRET_EVIDENCE_REFUND'), true);
  assert.ok(paid.issueDetails.every((item) => item.acceptanceCriteria.length >= 3));
});

check('site operations document is customized and 100 score', () => {
  const doc = buildSiteOperationsDocument(sampleScan, { site: { domain: 'example-store.kr', industry: '온라인 쇼핑몰' }, order: { plan: 'Pro' } });
  assert.equal(doc.qualityScore, 100);
  assert.equal(doc.domain, 'example-store.kr');
  assert.ok(doc.sections.length >= 10);
  assert.ok(doc.markdown.includes('example-store.kr 맞춤형 개선 지침'));
  assert.ok(doc.markdown.includes('환불'));
});

check('public diagnosis package includes free demo contract but not paid detail payload', () => {
  const diagnosis = buildPublicDiagnosisPackage(sampleScan, { rulesVersion: 'test' });
  assert.equal(diagnosis.demoIssueOverview.scope, 'free_demo_problem_area_element_count_only');
  assert.equal(Boolean(diagnosis.paidFullDetailContract), false);
  assert.equal(diagnosis.freeDemoContract.locks.includes('fullEvidence'), true);
});

check('premium purchased asset includes all phase227 payloads', () => {
  const asset = buildPremiumPurchasedAsset({
    order: { id: 'order_phase227', plan: 'Pro', amount: 179000, domain: 'example-store.kr' },
    offer: { code: 'Pro', title: 'Pro 실행 패키지', price: 179000 },
    scan: sampleScan,
    site: { id: 'site1', domain: 'example-store.kr', industry: '온라인 쇼핑몰' },
    businessProfile: { contactEmail: 'support@example-store.kr' }
  });
  assert.equal(asset.demoIssueOverview.scope, 'free_demo_problem_area_element_count_only');
  assert.equal(asset.paidFullDetailContract.completenessScore, 100);
  assert.equal(asset.siteOperationsDocument.qualityScore, 100);
  assert.ok(asset.paidOutputQualityGate);
});

const failed = checks.filter((item) => !item.ok);
console.log(JSON.stringify({ ok: failed.length === 0, passed: checks.length - failed.length, failed: failed.length, checks }, null, 2));
if (failed.length) process.exit(1);

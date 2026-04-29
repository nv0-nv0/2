import fs from 'node:fs';
import path from 'node:path';
import { buildPremiumPurchasedAsset, buildPremiumAssetPdfLines } from '../server/core/premium-asset-builder.mjs';

const root = process.cwd();
const missing = [];
const requiredTokens = [
  ['server/core/premium-asset-builder.mjs', ['phase134-all-service-output-maximized', 'buildPurposeOptimization', 'buildDeliverableIndex', 'buildConversionCopyPack', 'buildAcceptanceChecklist', 'buildMeasurementPlan', 'buildRiskRegister', 'buildStakeholderHandoff', 'buildOutputPerformanceProfile']],
  ['apps/public/portal/app.js', ['purposeOptimization', 'deliverableIndex', 'conversionCopyPack', 'acceptanceChecklist', 'measurementPlan', 'riskRegister', 'stakeholderHandoff', 'outputPerformanceProfile']],
  ['apps/public/portal/app.css', ['PHASE134', '.asset-maturity-grid', '.asset-index-grid', '.asset-checklist', '.asset-handoff-grid']]
];
for (const [file, tokens] of requiredTokens) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    missing.push(`${file}: missing`);
    continue;
  }
  const text = fs.readFileSync(full, 'utf8');
  for (const token of tokens) if (!text.includes(token)) missing.push(`${file}: missing ${token}`);
}
const sampleScan = {
  target: 'https://example.kr',
  riskScore: 72,
  riskLevel: '높음',
  industry: '일반 이커머스',
  totalFindings: 4,
  detailFindings: [
    { title: '환불 정책 안내 불명확', priority: 'P1', category: '전자상거래 정책', evidence: '환불 기준 문구 확인 필요', recommendation: '환불 가능 범위와 제한 조건을 결제 전 단계에 표시합니다.', code: 'REFUND' },
    { title: '개인정보 보유기간 안내 부족', priority: 'P1', category: '개인정보', evidence: '보유기간 문구 확인 필요', recommendation: '입력폼 주변에 수집 목적과 보유기간을 표시합니다.', code: 'PRIVACY' },
    { title: '고객지원 경로 부족', priority: 'P2', category: '운영 관리', evidence: '문의 경로 확인 필요', recommendation: '푸터와 결제 전 영역에 고객지원 경로를 표시합니다.', code: 'SUPPORT' },
    { title: 'CTA 문구 단문 노출', priority: 'P2', category: '전환 콘텐츠', evidence: 'CTA 포스팅 품질 확인 필요', recommendation: 'FAQ와 자연스러운 CTA를 포함한 포스팅형 본문으로 교체합니다.', code: 'CTA' }
  ]
};
const offers = {
  Report: { title: '상세 리포트', price: 69000, deliverables: ['정밀 리포트'] },
  FixPack: { title: 'FixPack 수정 문구안', price: 99000, deliverables: ['수정 문구안'] },
  TemplatePack: { title: '문서 템플릿 팩', price: 69000, deliverables: ['템플릿'] },
  IndustryGuide: { title: '업종별 규제 가이드', price: 99000, deliverables: ['가이드'] },
  Basic: { title: 'Basic 모니터링', price: 99000, period: '월', deliverables: ['월간 점검'] },
  Pro: { title: 'Pro 정기 개선', price: 199000, period: '월', deliverables: ['리포트', '수정 문구', '재검사'] },
  Auto: { title: 'Auto 정기 케어', price: 299000, period: '월', deliverables: ['정기 진단', 'CTA 포스팅'] },
  Agency: { title: 'Agency 패키지', price: 399000, period: '월', deliverables: ['복수 도메인', '클라이언트 리포트'] },
  Certified: { title: 'NV0 Certified', price: 199000, deliverables: ['인증 후보 검토'] }
};
function assert(condition, label) {
  if (!condition) missing.push(label);
}
for (const [plan, offer] of Object.entries(offers)) {
  const asset = buildPremiumPurchasedAsset({
    order: { id: `order-${plan}`, plan, amount: offer.price, domain: sampleScan.target, siteId: 'site-test' },
    offer,
    scan: sampleScan,
    site: { domain: sampleScan.target },
    businessProfile: { contactEmail: 'ct@nv0.kr' },
    policyDocuments: [],
    industryGuide: { industry: '일반 이커머스', checklist: ['환불 기준 확인', '개인정보 처리방침 확인'] }
  });
  assert(asset.qualityContract?.version === 'phase134-all-service-output-maximized', `${plan}: quality contract version`);
  assert(asset.purposeOptimization?.productIntent, `${plan}: purposeOptimization`);
  assert((asset.deliverableIndex || []).length >= 7, `${plan}: deliverableIndex`);
  assert(asset.conversionCopyPack?.heroTitles?.length >= 3, `${plan}: conversionCopyPack`);
  assert((asset.acceptanceChecklist || []).length >= 10, `${plan}: acceptanceChecklist`);
  assert((asset.measurementPlan || []).length >= 5, `${plan}: measurementPlan`);
  assert((asset.riskRegister || []).length >= 4, `${plan}: riskRegister`);
  assert(asset.stakeholderHandoff?.operator?.length >= 3, `${plan}: stakeholderHandoff operator`);
  assert(asset.stakeholderHandoff?.developer?.length >= 3, `${plan}: stakeholderHandoff developer`);
  assert(asset.outputPerformanceProfile?.level === 'phase134-all-service-output-max', `${plan}: performance profile`);
  assert((asset.sections || []).length >= 12, `${plan}: sections >= 12`);
  assert((asset.faqs || []).length >= 3, `${plan}: faqs >= 3`);
  assert((asset.tags || []).length >= 7, `${plan}: tags >= 7`);
  const publicCopy = JSON.stringify(asset);
  for (const banned of ['100% 보장합니다', '무조건 해결합니다', '법률 위반입니다', '과태료가 확정됩니다', '매출 상승을 보장']) {
    const riskyFields = JSON.stringify({
      naturalCta: asset.naturalCta,
      valueStatement: asset.valueStatement,
      conversionCopyPack: asset.conversionCopyPack
    });
    assert(!riskyFields.includes(banned), `${plan}: banned claim ${banned}`);
  }
  const lines = buildPremiumAssetPdfLines(asset, { id: `order-${plan}`, plan });
  assert(lines.some(line => line.includes('수용 기준')), `${plan}: pdf acceptance`);
  assert(lines.some(line => line.includes('재점검 지표')), `${plan}: pdf measurement`);
}
if (missing.length) {
  console.error('PHASE134 validation failed');
  for (const row of missing) console.error(' -', row);
  process.exit(1);
}
console.log('PHASE134 all service output quality validation passed');

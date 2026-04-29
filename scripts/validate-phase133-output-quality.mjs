import fs from 'node:fs';
import path from 'node:path';
import { buildPremiumPurchasedAsset, buildPremiumAssetPdfLines } from '../server/core/premium-asset-builder.mjs';

const root = process.cwd();
const requiredTokens = [
  ['server/core/premium-asset-builder.mjs', ['buildPremiumPurchasedAsset', 'qualityContract', 'titleCandidates', 'evidenceMatrix', 'autoPublishingPlan', 'naturalCta', 'SAFE_DISCLAIMER']],
  ['server/index.mjs', ['buildPremiumPurchasedAsset', 'buildPremiumAssetPdfLines']],
  ['apps/public/portal/app.js', ['asset-delivery', 'asset-kpi-grid', 'asset-before-after', '자동 발행 콘텐츠 기준', '제목 후보']],
  ['apps/public/portal/app.css', ['PHASE133', '.asset-delivery', '.asset-section', '.asset-before-after', '.asset-tags']]
];
const missing = [];
for (const [file, tokens] of requiredTokens) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    missing.push(`${file}: missing file`);
    continue;
  }
  const text = fs.readFileSync(full, 'utf8');
  for (const token of tokens) if (!text.includes(token)) missing.push(`${file}: missing token ${token}`);
}
const sampleOrder = { id: 'order-test', plan: 'Auto', amount: 299000, domain: 'https://example.kr', siteId: 'site-test' };
const sampleOffer = { title: 'Auto 정기 케어', price: 299000, period: '월', deliverables: ['정기 진단', 'CTA 포스팅'] };
const sampleScan = { target: 'https://example.kr', riskScore: 72, riskLevel: '높음', industry: '일반 이커머스', totalFindings: 3, detailFindings: [
  { title: '환불 정책 안내 불명확', priority: 'P1', category: '전자상거래 정책', evidence: '환불 기준 문구 확인 필요', recommendation: '환불 가능 범위와 제한 조건을 결제 전 단계에 표시합니다.', code: 'REFUND' },
  { title: '개인정보 보유기간 안내 부족', priority: 'P1', category: '개인정보', evidence: '보유기간 문구 확인 필요', recommendation: '입력폼 주변에 수집 목적과 보유기간을 표시합니다.', code: 'PRIVACY' },
  { title: '고객지원 경로 부족', priority: 'P2', category: '운영 관리', evidence: '문의 경로 확인 필요', recommendation: '푸터와 결제 전 영역에 고객지원 경로를 표시합니다.', code: 'SUPPORT' }
] };
const asset = buildPremiumPurchasedAsset({ order: sampleOrder, offer: sampleOffer, scan: sampleScan, site: { domain: 'https://example.kr' }, businessProfile: { contactEmail: 'ct@nv0.kr' }, policyDocuments: [], industryGuide: { industry: '일반 이커머스', checklist: ['환불 기준 확인', '개인정보 처리방침 확인'] } });
const assert = (condition, label) => { if (!condition) missing.push(label); };
assert(asset.qualityContract?.requiredBlocks?.includes('제목 후보'), 'asset quality contract missing title 후보');
assert((asset.sections || []).length >= 8, 'asset sections must be >= 8');
assert((asset.faqs || []).length >= 3, 'asset faqs must be >= 3');
assert((asset.tags || []).length >= 7, 'asset tags must be >= 7');
assert(asset.autoPublishingPlan?.postStructure?.length >= 8, 'auto publishing structure incomplete');
assert(asset.valueStatement?.includes('구성 가치'), 'value statement missing');
const publicCopy = JSON.stringify({ sections: asset.sections, fixes: asset.fixes, templates: asset.templates, faqs: asset.faqs, naturalCta: asset.naturalCta, valueStatement: asset.valueStatement });
assert(!/(100% 보장합니다|무조건 해결합니다|법률 위반이 확정|매출 상승을 보장합니다)/.test(publicCopy), 'banned overclaim detected in public copy');
const pdfLines = buildPremiumAssetPdfLines(asset, sampleOrder);
assert(pdfLines.length >= 12, 'pdf lines insufficient');
if (missing.length) {
  console.error('PHASE133 validation failed');
  for (const line of missing) console.error(' -', line);
  process.exit(1);
}
console.log('PHASE133 output quality validation passed', { sections: asset.sections.length, fixes: asset.fixes.length, faqs: asset.faqs.length, tags: asset.tags.length, pdfLines: pdfLines.length });

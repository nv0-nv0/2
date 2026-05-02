import fs from 'node:fs';
import { buildSmartProductOrchestration, buildSmartPublicSnapshot } from '../server/core/smart-product-orchestrator.mjs';

const failures = [];

const files = {
  index: fs.readFileSync('server/index.mjs', 'utf8'),
  module: fs.readFileSync('server/core/smart-product-orchestrator.mjs', 'utf8'),
  home: fs.readFileSync('apps/public/home/app.js', 'utf8'),
  demo: fs.readFileSync('apps/public/veridion-demo/app.js', 'utf8'),
  plans: fs.readFileSync('apps/public/plans/app.js', 'utf8'),
  board: fs.readFileSync('apps/public/board/index.html', 'utf8'),
  css: fs.readFileSync('shared/base.css', 'utf8')
};

for (const required of [
  "buildSmartProductOrchestration",
  "buildSmartPublicSnapshot",
  "/api/public/smart-product",
  "journey",
  "p153-smart-ops-v1"
]) {
  if (!files.index.includes(required) && !files.module.includes(required)) failures.push(`Missing required P153 signal: ${required}`);
}

if (!files.index.includes('진단 시작')) failures.push('Top nav CTA should avoid duplicated 무료 진단 label.');
if (!files.home.includes('mountSmartProductPanel')) failures.push('Home should mount Smart NV0 panel.');
if (!files.demo.includes('view.journey')) failures.push('Demo result should use journey orchestration.');
if (!files.plans.includes('renderSmartAdvice(intelligence,plans.orchestration||products.orchestration)')) failures.push('Plans should use orchestration-aware smart advice.');
if (!files.board.includes('무한 조합형 SEO 콘텐츠')) failures.push('Board page should describe unbounded combinatorial content.');
if (!files.css.includes('.smart-product-panel')) failures.push('Shared CSS should include smart product panel styles.');

const fakeScan = {
  requestId: 'req-test',
  target: 'https://example.kr',
  riskScore: 82,
  detailFindings: [
    { code: 'REFUND-POLICY', priority: 'P0', title: '환불 기준 부족' },
    { code: 'PRIVACY-POLICY', priority: 'P1', title: '개인정보처리방침 링크 부족' },
    { code: 'CONTACT-CHANNEL', priority: 'P1', title: '고객지원 경로 부족' }
  ]
};
const offers = [{ code: 'Report' }, { code: 'FixPack' }, { code: 'Auto' }];
const orchestration = buildSmartProductOrchestration({ scan: fakeScan, site: { id: 'site-test', domain: 'example.kr' }, intelligence: { recommendedPlan: 'Auto', riskScore: 82, primaryCta: 'Auto 보기' }, offers, source: 'validation' });
if (!orchestration.ok) failures.push('Orchestration must be ok.');
if (orchestration.version !== 'p153-smart-ops-v1') failures.push('Orchestration version mismatch.');
if (orchestration.recommendedPlan !== 'Auto') failures.push('High risk orchestration should recommend Auto.');
if (!Array.isArray(orchestration.actionCards) || orchestration.actionCards.length < 3) failures.push('Orchestration should provide action cards.');
if (!Array.isArray(orchestration.conversionPath) || orchestration.conversionPath.length < 4) failures.push('Orchestration should provide conversion path.');
if (!orchestration.nextBestAction?.path?.includes('/plans')) failures.push('Next action after scan should point to plans.');

const snapshot = buildSmartPublicSnapshot({ scans: [fakeScan], sites: [{ id: 'site-test', domain: 'example.kr' }], boards: [{ type: 'cta' }] }, { offers });
if (!snapshot.ok || !snapshot.orchestration?.nextBestAction) failures.push('Smart public snapshot should expose next best action.');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  phase: 'P153',
  name: 'Smart Product Operations Layer',
  version: orchestration.version,
  recommendedPlan: orchestration.recommendedPlan,
  actionCards: orchestration.actionCards.length,
  conversionPath: orchestration.conversionPath.length,
  snapshotScore: snapshot.productScore,
  noPromptProductDrift: !files.index.includes('/api/public/prompt-directive')
}, null, 2));

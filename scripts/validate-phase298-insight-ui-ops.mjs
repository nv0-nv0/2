import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  PRODUCT_AGENT_SUITE_VERSION,
  PRODUCT_ENGINE_REGISTRY,
  CONTENT_QUALITY_RULESET_VERSION,
  buildProductInsightDraft,
  auditProductInsightDraft,
  cleanPublicText,
  publishProductInsightIfDue,
  buildProductAgentRuntimeStatus
} from '../server/core/product-agent-suite.mjs';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const pkg = JSON.parse(read('package.json'));
const suiteSource = read('server/core/product-agent-suite.mjs');
const serverIndex = read('server/index.mjs');
const portalCss = read('shared/portal-phase283-dashboard.css');
const adoptedCss = read('shared/veridion-adopted-ui.css');
const portalAppCss = read('apps/public/portal/app.css');

const bannedPublicPattern = /[�□■◆◇●▲▼※★☆♣♥♠♬✓✔✕✖↔⇒⇐⇔→←]/;
const typoSample = '전문가 리포트이 적합합니다. 전문가 플랜로 연결합니다. 20분마다 공개합니다. CTA ✓ →';
const cleaned = cleanPublicText(typoSample);
assert.ok(!bannedPublicPattern.test(cleaned), `cleaner left banned symbol: ${cleaned}`);
assert.ok(!/리포트이|플랜로|20분마다|CTA/.test(cleaned), `cleaner left typo/token: ${cleaned}`);

const now = '2026-05-25T00:00:00.000Z';
const db = { settings: {}, scans: [{ target: 'https://nv0.kr', riskScore: 55, totalFindings: 3, topFindings: ['고객지원 안내', '환불 기준 위치', '개인정보 링크'] }], sites: [], orders: [], boards: [], publications: [] };
const draft = buildProductInsightDraft(db, { nowIso: () => now, businessProfile: { domain: 'https://nv0.kr', tradeName: 'VERIDION' }, autoPublished: true });
const quality = auditProductInsightDraft(draft, []);
assert.equal(quality.ok, true, `draft quality failed: ${quality.failed.join(',')}`);
assert.equal(quality.score, 100, 'draft quality must be 100 after phase298 guards');
assert.ok(!bannedPublicPattern.test(`${draft.title}\n${draft.summary}\n${draft.body}`), 'generated draft must not contain banned public symbols');
assert.ok(!/20분마다|리포트이|플랜로|\bCTA\b/.test(`${draft.title}\n${draft.summary}\n${draft.body}`), 'generated draft must not contain known copy defects');

const first = publishProductInsightIfDue(db, { nowMs: Date.parse(now), nowIso: () => now, uid: prefix => `${prefix}-phase298-a`, businessProfile: { domain: 'https://nv0.kr', tradeName: 'VERIDION' }, autoPublished: true, reason: 'phase298-validator' });
assert.ok(first, 'first publish must run');
const blocked = publishProductInsightIfDue(db, { nowMs: Date.parse(now) + 19 * 60_000, nowIso: () => new Date(Date.parse(now) + 19 * 60_000).toISOString(), uid: prefix => `${prefix}-phase298-b`, businessProfile: { domain: 'https://nv0.kr', tradeName: 'VERIDION' }, autoPublished: true, reason: 'phase298-validator' });
assert.equal(blocked, null, '19 minute publish must remain blocked');
const second = publishProductInsightIfDue(db, { nowMs: Date.parse(now) + 20 * 60_000, nowIso: () => new Date(Date.parse(now) + 20 * 60_000).toISOString(), uid: prefix => `${prefix}-phase298-c`, businessProfile: { domain: 'https://nv0.kr', tradeName: 'VERIDION' }, autoPublished: true, reason: 'phase298-validator' });
assert.ok(second, '20 minute publish must run');
const status = buildProductAgentRuntimeStatus(db, { businessProfile: { domain: 'https://nv0.kr', tradeName: 'VERIDION' } });
assert.equal(status.cadence.intervalMinutes, 20, 'runtime cadence must be 20 minutes');
assert.ok(status.operationAgents.some(agent => agent.id === 'korean-proofreading-agent'), 'korean proofreading agent missing from runtime status');
assert.ok(status.operationAgents.some(agent => agent.id === 'layout-visibility-agent'), 'layout visibility agent missing from runtime status');

const checks = [
  { key: 'suiteVersion', weight: 8, pass: PRODUCT_AGENT_SUITE_VERSION.includes('phase298'), message: 'phase298 suite version applied' },
  { key: 'qualityRuleset', weight: 10, pass: CONTENT_QUALITY_RULESET_VERSION.includes('special-char-guard'), message: 'copy quality ruleset applied' },
  { key: 'engineAgents', weight: 12, pass: PRODUCT_ENGINE_REGISTRY.length >= 12 && PRODUCT_ENGINE_REGISTRY.some(item => item.id === 'special-character-guard-agent') && PRODUCT_ENGINE_REGISTRY.some(item => item.id === 'cadence-watchdog-agent'), message: 'engine and agent registry expanded' },
  { key: 'serverWatchdog', weight: 10, pass: serverIndex.includes('cadence-watchdog-agent') && serverIndex.includes('blocked_quality_gate') && serverIndex.includes('quality-gate-failed'), message: 'server watchdog blocks bad publication' },
  { key: 'contentCleaner', weight: 12, pass: suiteSource.includes('cleanPublicText') && suiteSource.includes('noBrokenGlyphs') && suiteSource.includes('noAwkwardCopy'), message: 'content cleaner and audit checks exist' },
  { key: 'portalNoOverlap', weight: 12, pass: portalCss.includes('PHASE298') && portalCss.includes('height:auto!important') && portalCss.includes('overflow-wrap:anywhere') && portalCss.includes('@media (max-width:820px)'), message: 'portal overlap hardening exists' },
  { key: 'buttonVisibility', weight: 12, pass: portalCss.includes('portal-btn-primary') && portalCss.includes('focus-visible') && adoptedCss.includes('package-wide button visibility') && adoptedCss.includes('color:#fff!important'), message: 'buttons have visible contrast and focus' },
  { key: 'appCssSynced', weight: 6, pass: portalAppCss.includes('PHASE298') && portalAppCss.includes('portal-dashboard-grid'), message: 'portal app css synced' },
  { key: 'phaseScript', weight: 8, pass: pkg.scripts?.['validate:phase298'] === 'node scripts/validate-phase298-insight-ui-ops.mjs' && pkg.scripts?.['phase298:final']?.includes('validate:phase298'), message: 'phase298 npm scripts wired' },
  { key: 'docs', weight: 10, pass: exists('docs/PHASE298_INSIGHT_UI_OPS_TIGHTENING_REPORT.md'), message: 'phase298 delivery report exists' }
];
const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
const failed = checks.filter(item => !item.pass);
const report = {
  ok: failed.length === 0 && score === 100,
  phase: 'phase298',
  score,
  total: 100,
  suiteVersion: PRODUCT_AGENT_SUITE_VERSION,
  rulesetVersion: CONTENT_QUALITY_RULESET_VERSION,
  generatedQualityScore: quality.score,
  checks,
  failed
};
fs.mkdirSync(path.join(ROOT, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/current/PHASE298_INSIGHT_UI_OPS_TIGHTENING_AUDIT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);

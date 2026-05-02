import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
const ok = (name, condition, detail = '') => checks.push({ name, ok: Boolean(condition), detail });

const server = read('server/index.mjs');
const evidenceModel = read('server/core/scan-evidence-model.mjs');
const demoJs = read('apps/public/veridion-demo/app.js');
const demoHtml = read('apps/public/veridion-demo/index.html');
const env = read('.env.example');
const coolify = read('deploy/coolify.env.bulk.txt');
const pkg = JSON.parse(read('package.json'));

ok('phase161 release marker', (server.includes('phase161-zero-cost-max-coverage') || server.includes('phase162-free-auto-disclosure') || server.includes('phase164-zero-cost-hardening-50')) && (pkg.version.includes('phase161-zero-cost-max-coverage') || pkg.version.includes('phase162-free-auto-disclosure') || pkg.version.includes('phase163-remote-backup-security') || pkg.version.includes('phase164-zero-cost-hardening-50') || pkg.version.includes('phase164')));
ok('builtin is default provider', server.includes("const SCAN_PROVIDER = process.env.NV0_SCAN_PROVIDER || 'builtin'") && env.includes('NV0_SCAN_PROVIDER=builtin'));
ok('target fetch enabled by example', env.includes('NV0_TARGET_FETCH_ENABLED=true') && coolify.includes('NV0_TARGET_FETCH_ENABLED=true'));
ok('zero cost controls exist', ['NV0_TARGET_FETCH_MAX_PAGES','NV0_TARGET_FETCH_CONCURRENCY','NV0_TARGET_FETCH_TIMEOUT_MS'].every(token => server.includes(token) && env.includes(token)));
ok('adaptive link extraction exists', server.includes('extractInternalCandidateLinks') && server.includes('scoreProbeUrl') && server.includes('buildProbeUrls(target, discovered)'));
ok('concurrent bounded fetch exists', server.includes('mapWithConcurrency') && server.includes('TARGET_FETCH_CONCURRENCY'));
ok('failed pages are retained', (server + evidenceModel).includes('failedPageCount') && (server + evidenceModel).includes('coverageGaps') && server.includes('not_found_in_scanned_pages'));
ok('business info rule not footer-only', server.includes('hasBusinessIdentity') && !server.includes("hasAny(html, ['footer'])"));
ok('expanded rule catalog', ['PRICE-TOTAL-COST','SHIPPING-DELIVERY-POLICY','RECURRING-BILLING-NOTICE','FORM-CONSENT-PROXIMITY'].every(token => server.includes(token)));
ok('negative evidence copy exists', server.includes('충분히 찾지 못했습니다') && server.includes('negative_public_html_evidence'));
ok('manual review for low certainty and failed pages', server.includes("certainty === '낮음'") && server.includes('coverage.failed.length > 0'));
ok('score model still avoids legal conclusion', (server + evidenceModel).includes('notLegalConclusion: true') && server.includes('canGuaranteeLegalAccuracy: false'));
ok('demo shows adaptive collection', demoJs.includes('홈과 실제 내부 링크에서 정책·결제·문의 후보를 우선 수집합니다'));
ok('demo shows manual review count not penalty as certainty', demoJs.includes('자동 단정 금지 항목') && demoJs.includes('manualReviewCount'));
ok('demo page copy is evidence-first', demoHtml.includes('근거 기반 무료 예비 점검') || demoHtml.includes('전자동 공개 페이지 예비 점검'));
ok('package scripts registered', pkg.scripts['validate:phase161'] === 'node scripts/validate-phase161-zero-cost-max-coverage.mjs' && pkg.scripts['phase161:final']);

const banned = [/정확도 보장/g, /절대 놓치지/g, /법적 확정/g, /위반 확정/g, /성과 보장/g];
for (const [idx, pattern] of banned.entries()) ok(`no impossible overclaim ${idx + 1}`, !pattern.test(demoHtml + demoJs));

const report = {
  generatedAt: new Date().toISOString(),
  ok: checks.every(item => item.ok),
  phase: 'P161-zero-cost-max-coverage',
  scope: 'no paid API by default, adaptive internal link crawling, negative evidence, coverage gaps, expanded rules, bounded concurrency',
  total: checks.length,
  passed: checks.filter(item => item.ok).length,
  failed: checks.filter(item => !item.ok).length,
  checks,
  failures: checks.filter(item => !item.ok)
};
fs.writeFileSync(path.join(root, 'PHASE161_ZERO_COST_MAX_COVERAGE_VALIDATION_20260502.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, report: 'PHASE161_ZERO_COST_MAX_COVERAGE_VALIDATION_20260502.json' }, null, 2));
if (!report.ok) process.exit(1);

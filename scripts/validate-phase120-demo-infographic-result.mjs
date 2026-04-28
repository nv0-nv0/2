import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
const add = (name, ok, details = '') => checks.push({ name, ok: Boolean(ok), details });

const app = read('apps/public/veridion-demo/app.js');
const css = read('apps/public/veridion-demo/app.css');
const html = read('apps/public/veridion-demo/index.html');
const pkg = JSON.parse(read('package.json'));
const listenerIndex = app.indexOf("scanBtn?.addEventListener('click', runScan)");
const mountIndex = app.indexOf('mountTurnstile({');
const apiIndex = app.indexOf('/api/public/diagnose');

add('version:phase120-infographic-demo-result', /phase120-infographic-demo-result/.test(pkg.version));
add('script:phase120-final', pkg.scripts?.['phase120:final']?.includes('validate-phase120-demo-infographic-result.mjs'));
add('demo:listener-before-turnstile', listenerIndex > -1 && mountIndex > -1 && listenerIndex < mountIndex);
add('demo:loading-before-fetch', app.indexOf('진단을 실행하고 있습니다.') > -1 && apiIndex > -1 && app.indexOf('진단을 실행하고 있습니다.') < apiIndex);
add('demo:normalizer-exists', app.includes('function normalizeScan') && app.includes('function normalizeRiskItem') && app.includes('function normalizeActions'));
add('demo:infographic-renderers', ['renderResultHero','renderMetricStrip','renderRiskCards','renderCategoryBoard','renderRecommendedActions','renderValueComparison'].every(token => app.includes(`function ${token}`)));
add('demo:paywall-retained', app.includes('function renderPaywall') && app.includes('renderPaywall(scan)'));
add('demo:free-limit-3-retained', app.includes('const FREE_LIMIT = 3') && app.includes('freeUsage') && html.includes('무료 요약 진단 3회'));
add('demo:xss-safe-escape-used', app.includes('escapeHtml') && app.includes('escapeAttr') && !/innerHTML\s*=\s*[^;]*targetInput\.value/.test(app));
add('demo:visible-error-state', app.includes('result-error-card') && app.includes('진단을 완료하지 못했습니다.') && app.includes('실패:'));
add('html:infographic-copy', html.includes('인포그래픽') && html.includes('점수·위험·개선 순서'));
add('css:infographic-components', ['infographic-hero','score-ring','metric-strip','risk-card-grid','category-board','priority-roadmap','value-comparison','result-cta-panel'].every(token => css.includes(token)));
add('css:responsive-guards', css.includes('@media(max-width:560px)') && css.includes('grid-template-columns:1fr'));
add('css:mobile-overflow-guards', css.includes('overflow-wrap:anywhere') && css.includes('max-width:100%'));
add('css:skeleton-loading', css.includes('demo-skeleton') && css.includes('@keyframes nv0Skeleton'));

const report = {
  generatedAt: new Date().toISOString(),
  ok: checks.every(item => item.ok),
  phase: 'phase120-infographic-demo-result',
  total: checks.length,
  passed: checks.filter(item => item.ok).length,
  failed: checks.filter(item => !item.ok).length,
  checks
};
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/PHASE120_DEMO_INFOGRAPHIC_RESULT_VALIDATION_20260428.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, report: 'docs/PHASE120_DEMO_INFOGRAPHIC_RESULT_VALIDATION_20260428.json' }, null, 2));
if (!report.ok) process.exit(1);

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
const add = (name, ok, details = '') => checks.push({ name, ok: Boolean(ok), details });

const app = read('apps/public/veridion-demo/app.js');
const html = read('apps/public/veridion-demo/index.html');
const server = read('server/index.mjs');
const pkg = JSON.parse(read('package.json'));
const listenerIndex = app.indexOf("scanBtn?.addEventListener('click', runScan)");
const mountIndex = app.indexOf('mountTurnstile({');
const loadSessionIndex = app.lastIndexOf('loadSession();');

add('version:phase119-or-later-demo-click-fixed', /phase119-demo-click-fixed|phase120-infographic-demo-result/.test(pkg.version));
add('script:phase119-final', pkg.scripts?.['phase119:final']?.includes('validate-phase119-demo-click-fix.mjs'));
add('demo:listener-attached-before-turnstile', listenerIndex > -1 && mountIndex > -1 && listenerIndex < mountIndex);
add('demo:listener-attached-before-load-session', listenerIndex > -1 && loadSessionIndex > -1 && listenerIndex < loadSessionIndex);
add('demo:no-top-level-await-mount-turnstile', !/const\s+guard\s*=\s*await\s+mountTurnstile/.test(app));
add('demo:no-startup-await-load-session-before-listener', !/await\s+loadSession\(\);\s*updateBadge\(\);\s*document\.getElementById\('scanBtn'\)/s.test(app));
add('demo:timeout-protected-fetch', app.includes('AbortController') && app.includes('REQUEST_TIMEOUT_MS'));
add('demo:visible-loading-state-before-fetch', app.indexOf('진단을 실행하고 있습니다.') < app.indexOf('/api/public/diagnose'));
add('demo:free-limit-3', app.includes('const FREE_LIMIT = 3') && html.includes('무료 요약 진단 3회'));
add('demo:error-visible-to-user', app.includes('진단을 완료하지 못했습니다.') && app.includes('실패:'));
add('server:diagnose-endpoint-exists', server.includes("pathname === '/api/public/scan' || pathname === '/api/public/diagnose'"));
add('server:diagnose-returns-result', server.includes('result: { ...result, siteId: site.id'));
add('turnstile:script-timeout', read('shared/turnstile.js').includes('timeoutMs = 8000') && read('shared/turnstile.js').includes('Cloudflare Turnstile 스크립트 로딩 시간이 초과되었습니다.'));

const report = {
  generatedAt: new Date().toISOString(),
  ok: checks.every(item => item.ok),
  phase: 'phase119-demo-click-fixed',
  total: checks.length,
  passed: checks.filter(item => item.ok).length,
  failed: checks.filter(item => !item.ok).length,
  checks
};
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/PHASE119_DEMO_CLICK_FIX_VALIDATION_20260428.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, report: 'docs/PHASE119_DEMO_CLICK_FIX_VALIDATION_20260428.json' }, null, 2));
if (!report.ok) process.exit(1);

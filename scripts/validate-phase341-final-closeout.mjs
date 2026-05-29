import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const port = 3241;
const runtimeDir = path.join(root, 'runtime-test-phase341-final-closeout|phase342-merged-best|phase343-final-perfect');
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const checks = [];
function check(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
}
function checkAsync(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => checks.push({ name, ok: true }))
    .catch(error => checks.push({ name, ok: false, error: error.message }));
}

const pkg = JSON.parse(read('package.json'));
const server = read('server/index.mjs');
const phase337Validator = read('scripts/validate-phase337-product-evolution.mjs');
const phase340Validator = read('scripts/validate-phase340-redteam-closeout.mjs');

check('package:phase341-version', () => assert.match(pkg.version, /phase341-final-closeout|phase342-merged-best|phase343-final-perfect|phase345-final-delivery-closeout|phase346-global-hardening-final/));
check('package:delivery-final-current', () => assert.ok(['npm run phase341:final', 'npm run phase342:final', 'npm run phase343:final', 'npm run phase345:final', 'npm run phase346:final'].includes(pkg.scripts['delivery:final'])));
check('package:release-predeploy-current', () => assert.ok(['npm run phase341:final', 'npm run phase342:final', 'npm run phase343:final', 'npm run phase345:final', 'npm run phase346:final'].includes(pkg.scripts['release:predeploy'])));
check('package:phase341-final-chains-phase340', () => assert.match(pkg.scripts['phase341:final'], /phase340:final/));
check('package:phase341-final-runs-validator', () => assert.match(pkg.scripts['phase341:final'], /validate:phase341/));
check('validator:phase337-accepts-terminal-closeout', () => assert.match(phase337Validator, /terminal closeout version/));
check('validator:phase340-accepts-phase341', () => assert.match(phase340Validator, /phase341-final-closeout|phase342-merged-best|phase343-final-perfect|phase345-final-delivery-closeout|phase346-global-hardening-final/));
check('server:canonical-alias-function', () => assert.match(server, /function canonicalPagePath/));
check('server:route-meta-uses-canonical-path', () => assert.match(server, /const canonicalPath = canonicalPagePath\(urlPath\)/));
check('server:structured-data-uses-canonical-url', () => assert.match(server, /const pageUrl = meta\.canonical/));
check('server:sitemap-excludes-resources-alias', () => assert.doesNotMatch(server.match(/function publicSitemapEntries[\s\S]*?return staticEntries;/)?.[0] || '', /path: '\/resources'/));

fs.rmSync(runtimeDir, { recursive: true, force: true });
const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    NODE_ENV: 'test',
    NV0_RUNTIME_DIR: runtimeDir,
    NV0_PLATFORM_TARGET: 'mvp',
    NV0_PAYMENT_PROVIDER: 'demo',
    NV0_PRELAUNCH_MODE: 'false',
    NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT: 'true',
    NV0_PUBLIC_BASE_URL: `http://127.0.0.1:${port}`,
    NV0_ADMIN_KEY: 'phase341-final-closeout|phase342-merged-best|phase343-final-perfect-key'
  },
  stdio: 'ignore'
});
async function stop() {
  if (!child || child.exitCode !== null) return;
  await new Promise(resolve => {
    const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 800);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
    try { child.kill('SIGTERM'); } catch { resolve(); }
  });
}
async function request(pathname, options = {}) {
  const res = await fetch(`http://127.0.0.1:${port}${pathname}`, options);
  const text = await res.text();
  return { res, text };
}
async function ready() {
  for (let i = 0; i < 50; i += 1) {
    try { const res = await fetch(`http://127.0.0.1:${port}/readyz`); if (res.ok) return; } catch {}
    await wait(200);
  }
  throw new Error('server not ready');
}
const banlist = /TrustOps|phase\d+|prelaunch|rollback|canary|sentinel|live verification|SLA|MRR|API 키 관리|운영 큐|자동화 백로그|런칭 컨트롤|프로덕션 센티널/i;
try {
  await ready();
  await checkAsync('live:robots-disallows-private-surfaces', async () => {
    const { res, text } = await request('/robots.txt');
    assert.equal(res.status, 200);
    ['/api/','/admin','/auth','/portal','/checkout'].forEach(token => assert.match(text, new RegExp(`Disallow: ${token.replace('/', '\\/')}`)));
    assert.doesNotMatch(text, /Allow: \/api\/public/);
  });
  await checkAsync('live:sitemap-canonical-only', async () => {
    const { res, text } = await request('/sitemap.xml');
    assert.equal(res.status, 200);
    ['/insights/refund-policy-checklist','/insights/privacy-policy-checklist','/insights/ecommerce-trust-checklist','/insights/conversion-before-payment','/insights/business-info-display','/insights/mobile-checkout-trust'].forEach(route => assert.match(text, new RegExp(route.replaceAll('/', '\\/'))));
    ['/resources','/products','/pricing.html','/risk_result.html','/mypage.html'].forEach(route => assert.doesNotMatch(text, new RegExp(`<loc>[^<]*${route.replaceAll('/', '\\/')}<\/loc>`)));
  });
  const canonicalCases = [
    ['/pricing.html', '/plans', true],
    ['/resources', '/guides', true],
    ['/demo_risk_result.html', '/products/veridion/demo', true],
    ['/mypage.html', '/portal', false],
    ['/auth_management.html', '/auth', false]
  ];
  for (const [alias, canonical, indexable] of canonicalCases) {
    await checkAsync(`live:canonical:${alias}->${canonical}`, async () => {
      const { res, text } = await request(alias, { headers: { accept: 'text/html' } });
      assert.equal(res.status, 200);
      assert.match(text, new RegExp(`<link rel="canonical" href="http:\/\/127\\.0\\.0\\.1:${port}${canonical === '/' ? '\\/' : canonical.replaceAll('/', '\\/')}"`));
      if (indexable) assert.match(text, /index,follow/);
      else assert.match(text, /noindex,nofollow,noarchive/);
      assert.doesNotMatch(text, banlist);
    });
  }
  await checkAsync('live:public-json-clean-and-minimal', async () => {
    for (const route of ['/api/public/health','/api/public/config']) {
      const { res, text } = await request(route);
      assert.equal(res.status, 200, route);
      assert.doesNotMatch(text, banlist, route);
      assert.doesNotMatch(text, /prelaunchMode|deploymentRiskGuard|commercialFinalGate|phase/i, route);
    }
  });
  await checkAsync('live:hidden-operational-endpoint-stays-hidden', async () => {
    const { res, text } = await request('/api/public/trustops-production-sentinel');
    assert.equal(res.status, 404);
    assert.doesNotMatch(text, banlist);
  });
  await checkAsync('live:public-headers-minimized', async () => {
    const { res } = await request('/');
    assert.equal(res.status, 200);
    ['server','x-powered-by','x-vr-risk-guard','x-vr-redirect-owner'].forEach(header => assert.equal(res.headers.has(header), false, header));
    assert.match(res.headers.get('content-security-policy') || '', /default-src 'self'/);
    assert.match(res.headers.get('x-content-type-options') || '', /nosniff/);
  });
} finally {
  await stop();
  fs.rmSync(runtimeDir, { recursive: true, force: true });
}

const failed = checks.filter(item => !item.ok);
const report = {
  ok: failed.length === 0,
  phase: 'phase341-final-closeout|phase342-merged-best|phase343-final-perfect',
  checked: checks.length,
  failed: failed.length,
  closedItems: 18,
  checks,
  failedChecks: failed,
  summary: [
    'delivery:final and release:predeploy now point at the terminal Phase341+ gate',
    'legacy public aliases render canonical SEO metadata instead of duplicate home metadata',
    'sitemap contains canonical indexable URLs only',
    'public JSON/API and response headers remain clean in live runtime audit'
  ]
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE341_FINAL_CLOSEOUT_VALIDATION.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);

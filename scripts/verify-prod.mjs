import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rawBase = String(process.env.NV0_BASE_URL || 'http://127.0.0.1:3210').trim();
const verifyMode = String(process.env.NV0_VERIFY_MODE || (process.env.NV0_BASE_URL ? 'live' : 'local')).toLowerCase();

function normalize(url) {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

const root = normalize(rawBase);
const localBase = /^http:\/\/127\.0\.0\.1:(\d+)$/.exec(root);
let child = null;
const checks = [];

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function canReach(url) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    return res.ok || res.status > 0;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await canReach(`${root}/healthz`)) return;
  if (!localBase && await canReach(`${root}/`)) return;
  if (!localBase) throw new Error(`Server is not reachable at ${root}`);
  const port = localBase[1];
  child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      NV0_ADMIN_KEY: process.env.NV0_ADMIN_KEY || 'verify-prod-key',
      NV0_TRUST_PROXY_HEADERS: process.env.NV0_TRUST_PROXY_HEADERS || 'true'
    },
    stdio: 'inherit'
  });
  for (let i = 0; i < 25; i += 1) {
    await wait(200);
    if (await canReach(`${root}/healthz`)) return;
  }
  throw new Error(`Failed to start local verification server on ${root}`);
}

async function fetchText(path, expectedStatus = 200, mustInclude = '') {
  const res = await fetch(`${root}${path}`, { redirect: 'manual' });
  const text = await res.text();
  if (res.status !== expectedStatus) {
    throw new Error(`${path}: expected ${expectedStatus}, got ${res.status}`);
  }
  if (mustInclude && !text.includes(mustInclude)) {
    throw new Error(`${path}: missing expected text: ${mustInclude}`);
  }
  return { res, text };
}

function assertPublicPageHygiene(pagePath, text) {
  const legacyBrandPattern = /<span class="brand-mark">\s*nv0\s*<\/span>|<a[^>]*class="nv0n-brand"[^>]*>\s*nv0\s*<\/a>/i;
  if (legacyBrandPattern.test(text)) {
    throw new Error(`${pagePath}: legacy nv0 topbar brand is still visible; use VERIDION only`);
  }
  const topbarCount = (text.match(/<(?:header|nav)[^>]+class=\"[^\"]*(?:nv0n-topbar|site-topbar)[^\"]*\"/g) || []).length;
  if (topbarCount > 1) {
    throw new Error(`${pagePath}: duplicate public topbar detected (${topbarCount})`);
  }
  if (/29,000원|89,000원|₩29,000|₩89,000|29000|89000/.test(text)) {
    throw new Error(`${pagePath}: legacy 29,000/89,000 price text remains`);
  }
  if (/hello@nv0\.kr|© 2024/.test(text)) {
    throw new Error(`${pagePath}: legacy contact or year remains`);
  }
}

function persistReport(payload) {
  fs.mkdirSync(path.join(process.cwd(), 'docs/current'), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), 'docs/current/VERIFY_PROD_REPORT.json'), JSON.stringify(payload, null, 2) + '\n');
}

async function main() {
  await ensureServer();

  if (localBase || await canReach(`${root}/healthz`)) {
    const health = await fetchText('/healthz', 200, '"ok": true');
    checks.push({ path: '/healthz', status: health.res.status, ok: true });

    const ready = await fetchText('/readyz', 200, '"ready": true');
    checks.push({ path: '/readyz', status: ready.res.status, ok: true });
  } else {
    checks.push({ path: '/healthz', ok: true, skipped: true, reason: 'not exposed on live public origin' });
    checks.push({ path: '/readyz', ok: true, skipped: true, reason: 'not exposed on live public origin' });
  }

  const home = await fetchText('/', 200, 'VERIDION');
  assertPublicPageHygiene('/', home.text);
  checks.push({ path: '/', status: home.res.status, ok: true, cacheControl: home.res.headers.get('cache-control') || '' });

  const demo = await fetchText('/demo', 200, '무료');
  assertPublicPageHygiene('/demo', demo.text);
  checks.push({ path: '/demo', status: demo.res.status, ok: true });

  const documents = await fetchText('/documents', 200, '문서');
  checks.push({ path: '/documents', status: documents.res.status, ok: true });

  const guides = await fetchText('/guides', 200, '법령');
  checks.push({ path: '/guides', status: guides.res.status, ok: true });

  const plans = await fetchText('/plans', 200, '플랜');
  assertPublicPageHygiene('/plans', plans.text);
  if (!plans.text.includes('₩49,000') || !plans.text.includes('₩149,000')) {
    throw new Error('/plans: canonical 49,000/149,000 prices are missing');
  }
  checks.push({ path: '/plans', status: plans.res.status, ok: true, canonicalPrices: true });

  const legalPages = [
    ['/privacy', '제3자 제공과 처리위탁'],
    ['/terms', '금지 행위'],
    ['/refund', '중복 결제'],
    ['/business-info', '사업자등록번호'],
    ['/board', '인사이트 목록을 확인']
  ];
  for (const [pagePath, expectedText] of legalPages) {
    const page = await fetchText(pagePath, 200, expectedText);
    assertPublicPageHygiene(pagePath, page.text);
    checks.push({ path: pagePath, status: page.res.status, ok: true, hygiene: true });
  }

  const checkout = await fetchText('/checkout', 200, '결제');
  assertPublicPageHygiene('/checkout', checkout.text);
  checks.push({ path: '/checkout', status: checkout.res.status, ok: true });

  const portal = await fetchText('/portal', 200, '내 사이트');
  assertPublicPageHygiene('/portal', portal.text);
  checks.push({ path: '/portal', status: portal.res.status, ok: true });

  const productDemo = await fetchText('/products/veridion/demo', 200, 'VERIDION');
  assertPublicPageHygiene('/products/veridion/demo', productDemo.text);
  checks.push({ path: '/products/veridion/demo', status: productDemo.res.status, ok: true });

  const admin = await fetchText('/admin', 200, '관리자');
  checks.push({ path: '/admin', status: admin.res.status, ok: true, cacheControl: admin.res.headers.get('cache-control') || '' });

  const adminConsole = await fetch(`${root}/admin/console`, { redirect: 'manual' });
  if (adminConsole.status !== 302 || adminConsole.headers.get('location') !== '/admin') {
    throw new Error(`/admin/console: expected redirect to /admin, got ${adminConsole.status} ${adminConsole.headers.get('location') || ''}`);
  }
  checks.push({ path: '/admin/console', status: adminConsole.status, ok: true, location: adminConsole.headers.get('location') });

  for (const page of ['/admin/orders', '/admin/publications', '/admin/library', '/admin/settings', '/admin/diagnostics']) {
    const res = await fetch(`${root}${page}`, { redirect: 'manual' });
    if (res.status !== 302 || res.headers.get('location') !== '/admin') {
      throw new Error(`${page}: expected redirect to /admin, got ${res.status} ${res.headers.get('location') || ''}`);
    }
    checks.push({ path: page, status: res.status, ok: true, location: res.headers.get('location') });
  }

  const configRes = await fetch(`${root}/api/public/config`, { redirect: 'manual' });
  const config = await configRes.json();
  if (!config || config.ok !== true) throw new Error('/api/public/config: invalid payload');
  checks.push({ path: '/api/public/config', status: configRes.status, ok: true, turnstileEnabled: !!config.turnstileEnabled });

  const headers = {
    homeCacheControl: home.res.headers.get('cache-control') || '',
    adminCacheControl: admin.res.headers.get('cache-control') || '',
    xContentTypeOptions: home.res.headers.get('x-content-type-options') || '',
    xFrameOptions: home.res.headers.get('x-frame-options') || '',
    referrerPolicy: home.res.headers.get('referrer-policy') || '',
    strictTransportSecurity: home.res.headers.get('strict-transport-security') || ''
  };

  const report = { ok: true, mode: verifyMode, baseUrl: root, checks, headers, checkedAt: new Date().toISOString() };
  persistReport(report);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  const report = { ok: false, mode: verifyMode, baseUrl: root, error: error.message, checks, checkedAt: new Date().toISOString() };
  persistReport(report);
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  if (child) {
    child.kill('SIGTERM');
    await wait(250);
    if (!child.killed) child.kill('SIGKILL');
  }
  process.exit(process.exitCode || 0);
});

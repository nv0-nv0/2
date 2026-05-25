import { spawn } from 'node:child_process';

const rawBase = String(process.env.NV0_BASE_URL || 'http://127.0.0.1:3210').trim();

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

async function main() {
  await ensureServer();

  const health = await fetchText('/healthz', 200, '"ok": true');
  checks.push({ path: '/healthz', status: health.res.status, ok: true });

  const ready = await fetchText('/readyz', 200, '"ready": true');
  checks.push({ path: '/readyz', status: ready.res.status, ok: true });

  const home = await fetchText('/', 200, 'VERIDION');
  checks.push({ path: '/', status: home.res.status, ok: true, cacheControl: home.res.headers.get('cache-control') || '' });

  const demo = await fetchText('/demo', 200, '무료');
  checks.push({ path: '/demo', status: demo.res.status, ok: true });

  const documents = await fetchText('/documents', 200, '문서');
  checks.push({ path: '/documents', status: documents.res.status, ok: true });

  const guides = await fetchText('/guides', 200, '법령');
  checks.push({ path: '/guides', status: guides.res.status, ok: true });

  const plans = await fetchText('/plans', 200, '플랜');
  checks.push({ path: '/plans', status: plans.res.status, ok: true });

  const checkout = await fetchText('/checkout', 200, '결제');
  checks.push({ path: '/checkout', status: checkout.res.status, ok: true });

  const portal = await fetchText('/portal', 200, '내 사이트');
  checks.push({ path: '/portal', status: portal.res.status, ok: true });

  const productDemo = await fetchText('/products/veridion/demo', 200, 'VERIDION');
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

  console.log(JSON.stringify({ ok: true, baseUrl: root, checks, headers }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, baseUrl: root, error: error.message, checks }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  if (child) {
    child.kill('SIGTERM');
    await wait(250);
    if (!child.killed) child.kill('SIGKILL');
  }
  process.exit(process.exitCode || 0);
});

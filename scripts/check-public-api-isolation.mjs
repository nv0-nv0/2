import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');
const port = 3238;
const runtimeDir = path.join(root, 'runtime-test-public-api-isolation');
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
fs.rmSync(runtimeDir, { recursive: true, force: true });

const hidden = [
  '/api/public/diagnosis-engine',
  '/api/public/privacy-status',
  '/api/public/governance-status',
  '/api/public/risk-guard',
  '/api/public/openapi.json',
  '/api/public/hardening-matrix',
  '/api/public/release-readiness',
  '/api/public/launch-checklist',
  '/api/public/commercial-final-gate',
  '/api/public/commercial-readiness',
  '/api/public/product-agent-status',
  '/api/public/engine-agent-status',
  '/api/public/organism-status',
  '/api/public/product-intelligence',
  '/api/public/product-quality',
  '/api/public/trustops-blueprint',
  '/api/public/fix-generator',
  '/api/public/monitoring-plan',
  '/api/public/revenue-optimization',
  '/api/public/structured-data-package',
  '/api/public/trustops-autopilot',
  '/api/public/customer-lifecycle',
  '/api/public/automation-workqueue',
  '/api/public/trustops-launch-control',
  '/api/public/lifecycle-message-sequence',
  '/api/public/trustops-production-sentinel',
  '/api/public/live-verification-checklist',
  '/api/public/trustops-final-handoff',
  '/api/public/trustops-100-final',
  '/api/public/trustops-complete-delivery'
];
const publicJsonBanlist = /TrustOps|phase\d+|prelaunch|rollback|canary|sentinel|live verification|SLA|MRR|API 키 관리|운영 큐|자동화 백로그|런칭 컨트롤|프로덕션 센티널/i;

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
    NV0_ADMIN_KEY: 'public-api-isolation-key'
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
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { res, text, data };
}
async function ready() {
  for (let i = 0; i < 50; i += 1) {
    try { const res = await fetch(`http://127.0.0.1:${port}/readyz`); if (res.ok) return; } catch {}
    await wait(200);
  }
  throw new Error('server not ready');
}

try {
  await ready();
  const health = await request('/api/public/health');
  assert.equal(health.res.status, 200, 'public health must stay available');
  assert.doesNotMatch(health.text, publicJsonBanlist, 'public health must not expose internal operation tokens');

  const config = await request('/api/public/config');
  assert.equal(config.res.status, 200, 'public config must stay available');
  assert.equal(Object.prototype.hasOwnProperty.call(config.data, 'prelaunchMode'), false, 'public config must not expose launch mode');
  assert.doesNotMatch(config.text, publicJsonBanlist, 'public config must not expose internal operation tokens');

  for (const endpoint of hidden) {
    const method = /fix-generator|monitoring-plan|customer-lifecycle|lifecycle-message-sequence/.test(endpoint) ? 'POST' : 'GET';
    const result = await request(endpoint, method === 'POST' ? { method, headers: { 'content-type': 'application/json' }, body: '{}' } : {});
    assert.equal(result.res.status, 404, `${endpoint} must be isolated from customer public API`);
    assert.doesNotMatch(result.text, publicJsonBanlist, `${endpoint} 404 body must be clean`);
  }

  const metric = await request('/api/public/client-metric', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path: '/checkout?orderId=secret#token', page: 'checkout', loadMs: 100 })
  });
  assert.equal(metric.res.status, 200, 'client metric route remains available');
  const db = JSON.parse(fs.readFileSync(path.join(runtimeDir, 'data', 'db.json'), 'utf8'));
  const last = db.clientMetrics?.at(-1);
  assert.equal(last.path, '/checkout', 'client metric path must strip query and hash');

  const pages = ['/portal', '/checkout', '/auth'];
  for (const page of pages) {
    const result = await request(page, { headers: { accept: 'text/html' } });
    assert.equal(result.res.status, 200, `${page} must render`);
    assert.match(result.text, /application\/ld\+json/, `${page} must include JSON-LD despite noindex`);
    assert.match(result.text, /noindex,nofollow,noarchive/, `${page} must remain noindex`);
  }
  console.log(JSON.stringify({ ok: true, hiddenEndpoints: hidden.length, pagesWithPrivateJsonLd: pages.length }, null, 2));
} finally {
  await stop();
  fs.rmSync(runtimeDir, { recursive: true, force: true });
}

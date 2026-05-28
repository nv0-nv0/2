import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const appPort = 3220;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const testRuntimeDir = path.join(root, 'runtime-test-paid-service-redteam');
fs.rmSync(testRuntimeDir, { recursive: true, force: true });

const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(appPort),
    NODE_ENV: 'test',
    NV0_RUNTIME_DIR: testRuntimeDir,
    NV0_PLATFORM_TARGET: 'mvp',
    NV0_PAYMENT_PROVIDER: 'demo',
    NV0_PRELAUNCH_MODE: 'false',
    NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT: 'true',
    NV0_PUBLIC_SCAN_LIMIT: '200',
    NV0_PUBLIC_BASE_URL: `http://127.0.0.1:${appPort}`,
    NV0_ADMIN_KEY: 'phase315-key'
  },
  stdio: 'ignore'
});


async function stopChild(child) {
  if (!child || child.exitCode !== null) return;
  await new Promise(resolve => {
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch {}
    }, 500);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
    try { child.kill('SIGTERM'); } catch { resolve(); }
  });
}

async function waitUntilReady() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${appPort}/readyz`);
      if (res.ok) return;
    } catch {}
    await wait(200);
  }
  throw new Error('server not ready');
}

async function j(url, options = {}) {
  const res = await fetch(`http://127.0.0.1:${appPort}${url}`, options);
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { res, data, text };
}

try {
  await waitUntilReady();
  const model = await j('/api/public/paid-service-model');
  assert.equal(model.res.status, 200);
  assert.equal(model.data.phase315Council.roleCount, 50);
  assert.equal(model.data.phase315Council.improvementCount, 100);
  assert.match(model.data.version, /phase31[57]/);

  const scan = await j('/api/public/diagnose', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ target: 'https://phase315-paid.example' })
  });
  assert.equal(scan.res.status, 200);
  const siteId = scan.data.result.siteId;
  assert.ok(siteId);

  const unauthGuidance = await j(`/api/public/guidance?siteId=${encodeURIComponent(siteId)}`);
  assert.equal(unauthGuidance.res.status, 403);

  const checkout = await j('/api/public/checkout-session', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'idempotency-key': `phase315-checkout-${Date.now()}` },
    body: JSON.stringify({ plan: 'Report', siteId, buyerEmail: 'buyer315@example.com', privacyConsent: true, termsConsent: true, refundConsent: true, deliveryConsent: true })
  });
  assert.equal(checkout.res.status, 200);
  assert.ok(checkout.data.order.accessToken);
  assert.equal(checkout.data.order.status, 'pending');
  assert.equal(checkout.data.order.providerRaw, undefined);
  assert.equal(checkout.data.paymentSession.paymentRequest, undefined, 'demo checkout must not leak unused payment request');
  const orderId = checkout.data.order.id;
  const token = checkout.data.order.accessToken;

  const orderWithoutToken = await j(`/api/public/order?orderId=${encodeURIComponent(orderId)}`);
  assert.equal(orderWithoutToken.res.status, 403);

  const complete = await j('/api/public/payment/complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ orderId })
  });
  assert.equal(complete.res.status, 200);
  assert.equal(complete.data.order.status, 'paid');
  assert.equal(complete.data.paymentSession.paymentRequest, undefined);

  const guidance = await j(`/api/public/guidance?siteId=${encodeURIComponent(siteId)}&accessToken=${encodeURIComponent(token)}`);
  assert.equal(guidance.res.status, 200);
  assert.ok(guidance.data.guidance);
  assert.equal(guidance.data.accessWindow.active, true);

  const fulfillment = await j(`/api/public/fulfillment?orderId=${encodeURIComponent(orderId)}&accessToken=${encodeURIComponent(token)}`);
  assert.equal(fulfillment.res.status, 200);
  assert.equal(fulfillment.data.locked, false);
  assert.equal(fulfillment.data.order.providerRaw, undefined);
  assert.ok(fulfillment.data.asset);

  const download = await fetch(`http://127.0.0.1:${appPort}/api/public/fulfillment-download?orderId=${encodeURIComponent(orderId)}&accessToken=${encodeURIComponent(token)}`);
  assert.equal(download.status, 200);
  assert.match(download.headers.get('content-type') || '', /application\/pdf/);
  const pdf = await download.arrayBuffer();
  assert.ok(pdf.byteLength > 100, 'downloaded PDF should have content');

  console.log('phase315 paid redteam integration ok');
} finally {
  await stopChild(child);
}

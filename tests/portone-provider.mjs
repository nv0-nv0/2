import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const appPort = 3215;
const payPort = 4312;
const wait = ms => new Promise(r => setTimeout(r, ms));

let paid = false;
const seen = [];
const portoneServer = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const bodyText = chunks.length ? Buffer.concat(chunks).toString('utf8') : '';
  const body = bodyText ? JSON.parse(bodyText) : {};
  seen.push({ method: req.method, url: req.url, body });
  if (req.method === 'POST' && /\/payments\/[^/]+\/pre-register$/.test(req.url || '')) {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({}));
  }
  if (req.method === 'GET' && /\/payments\/[^/]+$/.test(req.url || '')) {
    const paymentId = decodeURIComponent(String(req.url).split('/').pop());
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({
      id: paymentId,
      status: paid ? 'PAID' : 'READY',
      amount: { total: 49000 },
      customData: { orderId: paymentId, plan: 'Basic', amount: 49000 },
      paidAt: paid ? new Date().toISOString() : null,
      paymentMethod: { type: 'CARD' }
    }));
  }
  if (req.method === 'POST' && /\/payments\/[^/]+\/cancel$/.test(req.url || '')) {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ cancellation: { status: 'CANCELLED' } }));
  }
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ message: 'not found' }));
});
await new Promise(resolve => portoneServer.listen(payPort, '127.0.0.1', resolve));

const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(appPort),
    NV0_ADMIN_KEY: 'test-key',
    NV0_TRUST_PROXY_HEADERS: 'true',
    NODE_ENV: 'production',
    NV0_PAYMENT_PROVIDER: 'portone_v2',
    NV0_PORTONE_API_BASE_URL: `http://127.0.0.1:${payPort}`,
    NV0_PORTONE_API_SECRET: 'secret',
    NV0_PORTONE_STORE_ID: 'store-1',
    NV0_PORTONE_CHANNEL_KEY: 'channel-1',
    NV0_PUBLIC_BASE_URL: `http://127.0.0.1:${appPort}`,
    NV0_PORTONE_REDIRECT_URL: `http://127.0.0.1:${appPort}/checkout`,
    NV0_PORTONE_WEBHOOK_VERIFY_MODE: 'optional'
  },
  stdio: 'ignore'
});

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
await waitUntilReady();

async function j(url, options = {}) {
  const res = await fetch(`http://127.0.0.1:${appPort}${url}`, options);
  const data = await res.json();
  return { res, data };
}

try {
  let x = await j('/api/public/checkout-session', { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify({ plan:'Basic', buyerName:'포트원', buyerEmail:'portone@example.com' }) });
  assert.equal(x.res.status, 200);
  assert.equal(x.data.paymentSession.provider, 'portone_v2');
  assert.equal(x.data.paymentSession.providerPaymentId, x.data.order.id);
  assert.equal(x.data.paymentSession.paymentRequest.storeId, 'store-1');
  assert.ok(seen.some(entry => entry.url?.endsWith(`/payments/${x.data.order.id}/pre-register`)));

  let complete = await j('/api/public/payment/complete', { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify({ orderId: x.data.order.id, paymentId: x.data.order.id }) });
  assert.equal(complete.res.status, 200);
  assert.equal(complete.data.pendingSettlement, true);
  assert.equal(complete.data.order.status, 'pending');


  const webhook = await fetch(`http://127.0.0.1:${appPort}/api/public/payment/portone/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ data: { paymentId: x.data.order.id } })
  });
  assert.equal(webhook.status, 200);

  console.log('portone provider ok');
} finally { child.kill('SIGKILL'); if (typeof portoneServer.closeAllConnections === 'function') portoneServer.closeAllConnections(); portoneServer.close(() => {}); process.exit(0); }

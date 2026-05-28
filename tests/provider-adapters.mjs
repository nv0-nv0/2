import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const appPort = 3214;
const scanPort = 4310;
const payPort = 4311;
const wait = ms => new Promise(r => setTimeout(r, ms));

const testRuntimeDir = path.join(root, 'runtime-test-provider-adapters');
fs.rmSync(testRuntimeDir, { recursive: true, force: true });

function startJsonServer(port, handler) {
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
    const payload = await handler(req, body);
    res.writeHead(payload.status || 200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(payload.body));
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}

const scanServer = await startJsonServer(scanPort, async (_req, body) => ({
  body: {
    ok: true,
    result: {
      requestId: 'scan-external-001',
      target: body.target,
      normalizedTarget: body.target,
      summary: 'external provider scan',
      industry: '일반 이커머스',
      riskScore: 66,
      riskLevel: '높음',
      totalFindings: 2,
      estimatedMaxPenalty: 7000000,
      categoryCounts: { '개인정보': 1, '전자상거래': 1 },
      detailFindings: [
        { code: 'PRIVACY-POLICY', category: '개인정보', title: '개인정보처리방침 누락', severity: 26, priority: 'P0', estimatedPenaltyMax: 5000000, recommendation: '정책 링크 추가', autoFixEligible: true },
        { code: 'ECOM-BUSINESS-INFO', category: '전자상거래', title: '사업자 고지 누락', severity: 18, priority: 'P1', estimatedPenaltyMax: 2000000, recommendation: '푸터 고지 추가', autoFixEligible: true }
      ]
    }
  }
}));

const paymentServer = await startJsonServer(payPort, async (_req, body) => ({
  body: {
    ok: true,
    session: {
      sessionId: `ext-pay-${body.orderId}`,
      redirectUrl: `https://pay.example.test/session/${body.orderId}`,
      providerState: 'created'
    }
  }
}));

const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    NV0_RUNTIME_DIR: testRuntimeDir,
    PORT: String(appPort),
    NV0_ADMIN_KEY: 'ext-key',
    NV0_TRUST_PROXY_HEADERS: 'true',
    NV0_SCAN_PROVIDER: 'external_http',
    NV0_SCAN_PROVIDER_URL: `http://127.0.0.1:${scanPort}`,
    NV0_PAYMENT_PROVIDER: 'external_http',
    NV0_PAYMENT_PROVIDER_URL: `http://127.0.0.1:${payPort}`,
    NV0_PAYMENT_REDIRECT_ALLOWED_HOSTS: 'pay.example.test'
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
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${appPort}/readyz`);
      if (res.ok) return;
    } catch {}
    await wait(200);
  }
  throw new Error('server not ready');
}
await waitUntilReady();

async function j(url, options={}) {
  const res = await fetch(`http://127.0.0.1:${appPort}${url}`, options);
  const data = await res.json();
  return { res, data };
}

try {
  let x = await j('/api/public/scan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target: 'https://ext-shop.example' }) });
  assert.equal(x.res.status, 200);
  assert.equal(x.data.result.provider, 'external_http');
  assert.equal(x.data.result.riskScore, 66);
  assert.equal(x.data.result.totalFindings, 2);

  x = await j('/api/public/checkout-session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plan: 'Pro', siteId: x.data.result.siteId, buyerEmail: 'buyer@external.com', privacyConsent: true, termsConsent: true, refundConsent: true, deliveryConsent: true }) });
  assert.equal(x.res.status, 200);
  assert.equal(x.data.paymentSession.provider, 'external_http');
  assert.match(x.data.paymentSession.redirectUrl, /pay\.example\.test/);

  console.log('provider adapters ok');
} finally {
  await stopChild(child);
  await new Promise(resolve => scanServer.close(resolve));
  await new Promise(resolve => paymentServer.close(resolve));
}

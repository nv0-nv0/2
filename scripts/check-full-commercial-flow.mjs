import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const port = Number(process.env.NV0_TEST_PORT || 3291);
const base = `http://127.0.0.1:${port}`;
const startedAt = Date.now();
const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: root,
  env: { ...process.env, PORT: String(port), HOST: '0.0.0.0', NODE_ENV: 'production', NV0_ADMIN_KEY: 'phase21-key', NV0_TRUST_PROXY_HEADERS: 'true', NV0_TARGET_FETCH_ENABLED: 'false', NV0_ENABLE_TURNSTILE: 'false' },
  stdio: 'ignore'
});
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitReady() {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    try { const res = await fetch(`${base}/readyz`); if (res.ok) return; } catch {}
    await wait(150);
  }
  throw new Error('server not ready');
}
async function req(pathname, options = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${base}${pathname}`, { signal: controller.signal, ...options });
    const text = await res.text();
    let data = null; try { data = JSON.parse(text); } catch {}
    return { res, text, data };
  } finally { clearTimeout(t); }
}
function postJson(pathname, body, headers = {}) {
  return req(pathname, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
}
try {
  await waitReady();
  const pages = ['/', '/products/veridion/demo', '/plans', '/solutions', '/documents', '/checkout', '/portal', '/board', '/terms', '/privacy', '/refund', '/business-info'];
  for (const p of pages) {
    const r = await req(p);
    assert.equal(r.res.status, 200, `${p} should render`);
    assert.ok(!/불러오는 중\.\.\.<\/|Loading\.\.\./i.test(r.text), `${p} should not remain in raw loading state`);
    assert.ok(r.text.includes('ct@nv0.kr'), `${p} should include support email footer`);
  }
  let x = await req('/api/public/products');
  assert.equal(x.data.ok, true);
  const offerCodes = x.data.offers.map(o => o.code);
  for (const code of ['Report','FixPack','TemplatePack','IndustryGuide','Basic','Pro','Auto','Certified','Agency']) assert.ok(offerCodes.includes(code), `offer ${code}`);
  x = await req('/api/public/plans?riskScore=77');
  assert.equal(x.data.ok, true);
  assert.ok(x.data.plans.some(p => p.code === 'Pro'));
  x = await postJson('/api/public/document-preview', { businessName: '테스트상점', representative: '홍길동', domain: 'https://example.com', contactEmail: 'owner@example.com', subscriptionBilling: true });
  assert.equal(x.data.ok, true);
  assert.equal(x.data.preview.documents.length, 4);
  x = await postJson('/api/public/scan', { target: 'https://example.com', email: 'lead@example.com' });
  assert.equal(x.data.ok, true);
  const siteId = x.data.result.siteId;
  for (const plan of ['Report','FixPack','TemplatePack','IndustryGuide','Basic','Pro','Auto','Certified','Agency']) {
    const checkout = await postJson('/api/public/checkout-session', { plan, siteId, buyerName: '홍길동', buyerEmail: `${plan.toLowerCase()}@example.com` });
    assert.equal(checkout.data.ok, true, `${plan} checkout`);
    assert.equal(checkout.data.order.plan, plan);
    const unpaid = await req(`/api/public/fulfillment?orderId=${encodeURIComponent(checkout.data.order.id)}`);
    assert.equal(unpaid.data.locked, true, `${plan} should be locked before payment`);
    const paid = await postJson('/api/public/payment/complete', { orderId: checkout.data.order.id });
    assert.equal(paid.data.ok, true, `${plan} payment complete`);
    assert.equal(paid.data.order.status, 'paid');
    const fulfilled = await req(`/api/public/fulfillment?orderId=${encodeURIComponent(checkout.data.order.id)}`);
    assert.equal(fulfilled.data.ok, true);
    assert.equal(fulfilled.data.locked, false);
    assert.ok(fulfilled.data.asset?.type, `${plan} asset type`);
    const summary = await req(`/api/public/portal-summary?orderId=${encodeURIComponent(checkout.data.order.id)}`);
    assert.equal(summary.data.ok, true, `${plan} portal summary`);
    assert.equal(summary.data.summary.order.id, checkout.data.order.id);
  }
  const report = { ok: true, checkedPages: pages.length, checkedOffers: offerCodes.length, durationMs: Date.now() - startedAt };
  const out = path.join(root, 'docs', 'PHASE21_FULL_COMMERCIAL_FLOW_TEST_20260424.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  child.kill('SIGKILL');
  if (typeof child.unref === 'function') child.unref();
}
process.exit(0);

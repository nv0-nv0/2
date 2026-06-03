import assert from 'node:assert/strict';

const baseUrl = String(process.env.NV0_LIVE_BASE_URL || process.env.BASE_URL || '').trim().replace(/\/+$/, '');
const timeoutMs = Number(process.env.NV0_LIVE_SMOKE_TIMEOUT_MS || 8000);

function withTimeout(signalMs = timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), signalMs);
  return { controller, done: () => clearTimeout(timer) };
}

async function fetchJson(url, options = {}) {
  const { controller, done } = withTimeout();
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    return { res, data, text };
  } finally {
    done();
  }
}

if (!baseUrl) {
  console.log(JSON.stringify({
    ok: true,
    skipped: true,
    reason: 'NV0_LIVE_BASE_URL is not set; offline package gate passed and live smoke remains operator-run.',
    command: 'NV0_LIVE_BASE_URL=https://nv0.kr npm run live:smoke'
  }, null, 2));
  process.exit(0);
}

const checks = [];
async function add(name, fn) {
  try {
    const detail = await fn();
    checks.push({ name, ok: true, detail });
  } catch (error) {
    checks.push({ name, ok: false, error: error.message });
  }
}

await add('healthz-json-ok', async () => {
  const { res, data } = await fetchJson(`${baseUrl}/healthz`);
  assert.equal(res.status, 200);
  assert.equal(data.ok, true);
  return { status: res.status };
});

await add('public-health-no-store', async () => {
  const { res, data } = await fetchJson(`${baseUrl}/api/public/health`);
  assert.equal(res.status, 200);
  assert.equal(data.ok, true);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  return { status: res.status };
});

await add('public-config-ok', async () => {
  const { res, data } = await fetchJson(`${baseUrl}/api/public/config`);
  assert.equal(res.status, 200);
  assert.equal(data.ok, true);
  return { status: res.status };
});

await add('public-module-mime-ok', async () => {
  const res = await fetch(`${baseUrl}/shared/product-catalog.mjs`);
  assert.equal(res.status, 200);
  assert.match(String(res.headers.get('content-type') || ''), /text\/javascript/i);
  return { status: res.status, contentType: res.headers.get('content-type') };
});

await add('public-diagnose-valid-url', async () => {
  const { res, data } = await fetchJson(`${baseUrl}/api/public/diagnose`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ target: process.env.NV0_LIVE_SMOKE_TARGET || 'https://example.com' })
  });
  assert.equal(res.status, 200);
  assert.equal(data.ok, true);
  assert.ok(data.result?.requestId || data.result?.target || data.result?.summary);
  return { status: res.status, provider: data.result?.provider, resultStatus: data.result?.resultStatus };
});

await add('public-diagnose-hash-normalized', async () => {
  const { res, data } = await fetchJson(`${baseUrl}/api/public/diagnose`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ target: 'https://example.com/path?from=smoke#fragment' })
  });
  assert.equal(res.status, 200);
  assert.equal(data.ok, true);
  assert.doesNotMatch(String(data.result?.normalizedTarget || ''), /#fragment/);
  return { status: res.status, target: data.result?.target, normalizedTarget: data.result?.normalizedTarget };
});

await add('public-diagnose-malformed-url', async () => {
  const { res, data } = await fetchJson(`${baseUrl}/api/public/diagnose`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ target: 'not a url' })
  });
  assert.equal(res.status, 400);
  assert.equal(data.ok, false);
  return { status: res.status, code: data.code };
});

await add('public-diagnose-unsafe-protocol-rejected', async () => {
  const { res, data } = await fetchJson(`${baseUrl}/api/public/diagnose`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ target: 'javascript:alert(1)' })
  });
  assert.equal(res.status, 400);
  assert.equal(data.ok, false);
  return { status: res.status, error: data.error };
});

const failed = checks.filter(item => !item.ok);
const report = { ok: failed.length === 0, baseUrl, checked: checks.length, failed: failed.length, checks };
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);

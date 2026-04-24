import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const port = 3216;
const base = `http://127.0.0.1:${port}`;

const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    HOST: '0.0.0.0',
    NV0_ADMIN_KEY: 'contracts-key',
    NV0_TRUST_PROXY_HEADERS: 'true',
    NV0_TARGET_FETCH_ENABLED: 'false',
    NV0_ENABLE_TURNSTILE: 'false',
    NODE_ENV: 'production'
  },
  stdio: 'ignore',
  detached: false
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitReady() {
  for (let i = 0; i < 50; i += 1) {
    if (child.exitCode !== null) throw new Error(`server exited before ready: ${child.exitCode}`);
    try {
      const res = await fetch(`${base}/healthz`, { signal: AbortSignal.timeout(1000) });
      if (res.ok) return;
    } catch {}
    await wait(200);
  }
  throw new Error('server not ready');
}
async function request(url, options = {}) {
  const res = await fetch(`${base}${url}`, { ...options, signal: AbortSignal.timeout(5000) });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  return { res, text, data };
}

try {
  await waitReady();
  const normalizedTargets = [
    'https://example.com',
    'https://example.com/',
    'https://example.com#section-a',
    'https://example.com/#section-b'
  ];
  const first = await request('/api/public/scan', { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify({ target: normalizedTargets[0] }) });
  assert.equal(first.res.status, 200);
  for (const target of normalizedTargets.slice(1)) {
    const current = await request('/api/public/scan', { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify({ target }) });
    assert.equal(current.res.status, 200);
    assert.equal(current.data.result.cached, true);
    assert.ok(current.data.result.cachedFromRequestId);
    assert.notEqual(current.data.result.requestId, current.data.result.cachedFromRequestId);
  }

  const malformedPublic = await request('/api/public/scan', { method:'POST', headers:{ 'content-type':'application/json' }, body:'{"' });
  assert.equal(malformedPublic.res.status, 400);

  for (const invalid of [{}, { target: 'ftp://example.com' }, { target: 'javascript:alert(1)' }, { target: 'example.com' }]) {
    const x = await request('/api/public/scan', { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify(invalid) });
    assert.equal(x.res.status, 400);
  }

  const previewBadEmail = await request('/api/public/document-preview', { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify({ businessName:'테스트', contactEmail:'not-an-email' }) });
  assert.equal(previewBadEmail.res.status, 400);
  const previewTooManyProcessors = await request('/api/public/document-preview', { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify({ businessName:'테스트', delegatedProcessors: Array.from({ length: 25 }, (_, i) => `p${i}`) }) });
  assert.equal(previewTooManyProcessors.res.status, 400);

  const auth = await request('/api/admin/session', { method:'POST', headers:{ 'content-type':'application/json', 'x-forwarded-proto':'https' }, body: JSON.stringify({ key:'contracts-key' }) });
  assert.equal(auth.res.status, 200);
  const cookie = auth.res.headers.get('set-cookie') || '';
  const csrf = auth.data.csrfToken;

  const malformedAdmin = await request('/api/admin/rules', { method:'POST', headers:{ 'content-type':'application/json', cookie, 'x-nv0-csrf': csrf }, body:'{"' });
  assert.equal(malformedAdmin.res.status, 400);

  const invalidSettings = await request('/api/admin/settings', { method:'POST', headers:{ 'content-type':'application/json', cookie, 'x-nv0-csrf': csrf }, body: JSON.stringify({ defaultAlertChannel:'sms' }) });
  assert.equal(invalidSettings.res.status, 400);
  const invalidRule = await request('/api/admin/rules', { method:'POST', headers:{ 'content-type':'application/json', cookie, 'x-nv0-csrf': csrf }, body: JSON.stringify({ code:'bad rule code', severity:500 }) });
  assert.equal(invalidRule.res.status, 400);
  const invalidPublication = await request('/api/admin/publications/publish-now', { method:'POST', headers:{ 'content-type':'application/json', cookie, 'x-nv0-csrf': csrf }, body: JSON.stringify({ title:'', body:'본문' }) });
  assert.equal(invalidPublication.res.status, 400);
  const invalidSystemType = await request('/api/admin/system-items', { method:'POST', headers:{ 'content-type':'application/json', cookie, 'x-nv0-csrf': csrf }, body: JSON.stringify({ type:'unknown', title:'제목' }) });
  assert.equal(invalidSystemType.res.status, 400);
  const invalidOps = await request('/api/admin/ops', { method:'POST', headers:{ 'content-type':'application/json', cookie, 'x-nv0-csrf': csrf }, body: JSON.stringify({ action:'destroy' }) });
  assert.equal(invalidOps.res.status, 400);

  console.log(JSON.stringify({ ok: true, checked: 14 }, null, 2));
} finally {
  child.kill('SIGKILL');
  if (typeof child.unref === 'function') child.unref();
}

process.exit(0);

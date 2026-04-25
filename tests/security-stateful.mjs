import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const port = 3218;
const base = `http://127.0.0.1:${port}`;
let child = null;

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function request(path, options = {}) {
  const res = await fetch(`${base}${path}`, { redirect: 'manual', ...options });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  return { res, text, data };
}

async function ensureServer() {
  child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'production', NV0_ADMIN_KEY: 'stateful-test-key', NV0_TRUST_PROXY_HEADERS: 'true' },
    stdio: 'ignore'
  });
  for (let i = 0; i < 30; i += 1) {
    await wait(200);
    try {
      const res = await fetch(`${base}/healthz`);
      if (res.ok) return;
    } catch {}
  }
  throw new Error('server not ready');
}

async function main() {
  await ensureServer();
  let r = await request('/api/admin/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key: 'stateful-test-key' })
  });
  assert.equal(r.res.status, 200);
  const cookie = r.res.headers.get('set-cookie') || '';
  const csrf = r.data?.csrfToken;
  assert.ok(cookie && csrf, 'session cookie and csrf required');

  const protectedPosts = [
    ['/api/admin/publications/publish-now', { title: 'x', body: 'y', type: 'manual' }],
    ['/api/admin/legal-updates/seed', {}],
    ['/api/admin/ops', { action: 'report' }]
  ];

  for (const [pathname, body] of protectedPosts) {
    r = await request(pathname, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify(body)
    });
    assert.equal(r.res.status, 403, `${pathname} must reject missing csrf`);
  }

  r = await request('/api/admin/ops', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie, 'x-nv0-csrf': csrf },
    body: JSON.stringify({ action: 'report' })
  });
  assert.equal(r.res.status, 200);
  assert.equal(r.data?.ok, true);

  r = await request('/api/admin/publications/publish-now', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie, 'x-nv0-csrf': csrf },
    body: JSON.stringify({ title: '보안상태 테스트', body: 'ok', type: 'manual' })
  });
  assert.equal(r.res.status, 200);
  assert.equal(r.data?.ok, true);

  console.log(JSON.stringify({ ok: true, checked: protectedPosts.length + 2 }, null, 2));
  if (child) { try { child.kill('SIGKILL'); } catch {} }
  process.reallyExit ? process.reallyExit(0) : process.exit(0);
}

main().catch(error => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  if (child) {
    try { child.kill('SIGKILL'); } catch {}
    await Promise.race([
      new Promise(resolve => child.once('exit', resolve)),
      wait(250)
    ]);
  }
  process.exit(process.exitCode || 0);
});

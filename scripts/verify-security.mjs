import { spawn } from 'node:child_process';

const rawBase = String(process.env.NV0_BASE_URL || 'http://127.0.0.1:3212').trim();
const base = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
const localBase = /^http:\/\/127\.0\.0\.1:(\d+)$/.exec(base);
let child = null;

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function canReach(url) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    return res.ok || res.status > 0;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await canReach(`${base}/healthz`)) return;
  if (!localBase) throw new Error(`Server is not reachable at ${base}`);
  child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: localBase[1],
      NV0_ADMIN_KEY: process.env.NV0_ADMIN_KEY || 'verify-security-key',
      NV0_TRUST_PROXY_HEADERS: process.env.NV0_TRUST_PROXY_HEADERS || 'true',
      NODE_ENV: 'production'
    },
    stdio: 'inherit'
  });
  for (let i = 0; i < 25; i += 1) {
    await wait(200);
    if (await canReach(`${base}/healthz`)) return;
  }
  throw new Error(`Failed to start local verification server on ${base}`);
}

async function request(path, options = {}) {
  const res = await fetch(`${base}${path}`, { redirect: 'manual', ...options });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  return { res, text, data };
}

function requireHeader(name, value, expected, checks) {
  if (!value || !value.includes(expected)) {
    throw new Error(`Expected header ${name} to include ${expected}, got ${value || '(empty)'}`);
  }
  checks.push({ type: 'header', name, value, expected, ok: true });
}

async function main() {
  await ensureServer();
  const checks = [];

  let r = await request('/');
  if (r.res.status != 200) throw new Error(`/ expected 200, got ${r.res.status}`);
  if (r.text.includes('/admin')) throw new Error('Public home must not expose /admin link');
  requireHeader('cache-control', r.res.headers.get('cache-control') || '', 'max-age=60', checks);
  requireHeader('x-content-type-options', r.res.headers.get('x-content-type-options') || '', 'nosniff', checks);
  requireHeader('x-frame-options', r.res.headers.get('x-frame-options') || '', 'DENY', checks);
  requireHeader('content-security-policy', r.res.headers.get('content-security-policy') || '', "style-src 'self'", checks);
  requireHeader('content-security-policy', r.res.headers.get('content-security-policy') || '', "require-trusted-types-for 'script'", checks);
  if ((r.res.headers.get('content-security-policy') || '').includes("'unsafe-inline'")) throw new Error('CSP must not allow unsafe-inline');
  checks.push({ type: 'content', path: '/', ok: true, note: '관리자 흔적 없음' });

  r = await request('/shared/base.css');
  if (r.res.status != 200) throw new Error(`/shared/base.css expected 200, got ${r.res.status}`);
  requireHeader('cache-control', r.res.headers.get('cache-control') || '', 'immutable', checks);

  r = await request('/admin');
  if (r.res.status != 200) throw new Error(`/admin expected 200, got ${r.res.status}`);
  if (!r.text.includes('autocomplete="off"')) throw new Error('/admin input must disable autocomplete');
  if (!r.text.includes('value=""')) throw new Error('/admin input must render blank default value');
  if (!r.text.includes('관리자 키 게이트')) throw new Error('/admin gate text missing');
  if ((r.res.headers.get('cache-control') || '') != 'no-store') throw new Error('/admin must be no-store');
  checks.push({ type: 'gate', path: '/admin', ok: true });

  r = await request('/admin/console');
  if (r.res.status !== 302 || r.res.headers.get('location') !== '/admin') {
    throw new Error(`/admin/console should redirect to /admin when unauthenticated`);
  }
  checks.push({ type: 'auth', path: '/admin/console', ok: true, location: r.res.headers.get('location') });

  let x = await request('/api/admin/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key: 'wrong-key' })
  });
  if (x.res.status !== 401) throw new Error('Wrong admin key must return 401');
  checks.push({ type: 'auth', path: '/api/admin/session', ok: true, note: 'wrong key rejected' });

  x = await request('/api/admin/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key: process.env.NV0_ADMIN_KEY || 'verify-security-key' })
  });
  if (x.res.status !== 200 || !x.data?.csrfToken) throw new Error('Admin session login failed');
  const cookie = x.res.headers.get('set-cookie') || '';
  if (!cookie.includes('HttpOnly')) throw new Error('Admin session cookie must be HttpOnly');
  if (!cookie.includes('SameSite=Strict')) throw new Error('Admin session cookie must be SameSite=Strict');
  if (!cookie.includes('Secure')) throw new Error('Admin session cookie must be Secure in production verification');
  const csrf = x.data.csrfToken;
  checks.push({ type: 'auth', path: '/api/admin/session', ok: true, note: 'correct key accepted' });

  x = await request('/api/admin/settings', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ supportEmail: 'blocked@example.com' })
  });
  if (x.res.status !== 403) throw new Error('Admin POST without CSRF must return 403');
  checks.push({ type: 'csrf', path: '/api/admin/settings', ok: true, note: 'missing csrf blocked' });

  x = await request('/api/admin/settings', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie, 'x-nv0-csrf': csrf },
    body: JSON.stringify({ supportEmail: 'security@example.com' })
  });
  if (x.res.status !== 200 || x.data?.settings?.supportEmail !== 'security@example.com') {
    throw new Error('Admin POST with CSRF failed');
  }
  checks.push({ type: 'csrf', path: '/api/admin/settings', ok: true, note: 'csrf accepted' });

  x = await request('/api/admin/status', { headers: { cookie } });
  if (x.res.status !== 200) throw new Error('/api/admin/status expected 200 with session');
  if ((x.res.headers.get('cache-control') || '') !== 'no-store') throw new Error('/api/admin/status must be no-store');
  checks.push({ type: 'cache', path: '/api/admin/status', ok: true, cacheControl: x.res.headers.get('cache-control') });

  x = await request('/readyz');
  if (x.res.status !== 200 || x.data?.runtimeWritable !== true) throw new Error('/readyz must confirm runtimeWritable');
  checks.push({ type: 'readiness', path: '/readyz', ok: true, runtimeWritable: x.data.runtimeWritable });

  console.log(JSON.stringify({ ok: true, baseUrl: base, checks }, null, 2));
}

main().catch(error => {
  console.error(JSON.stringify({ ok: false, baseUrl: base, error: error.message }, null, 2));
  process.exitCode = 1;
}).finally(() => {
  if (child) child.kill('SIGTERM');
});

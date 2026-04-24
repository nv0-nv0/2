import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const port = 3215;
const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    NV0_ADMIN_KEY: 'routes-smoke-key',
    NV0_TRUST_PROXY_HEADERS: 'true',
    NODE_ENV: 'production'
  },
  stdio: 'inherit'
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function fetchText(pathname, options = {}) {
  const res = await fetch(`http://127.0.0.1:${port}${pathname}`, { redirect: 'manual', ...options });
  const text = await res.text();
  return { res, text };
}

await wait(800);

try {
  const publicPages = [
    ['/', 'NV0 / Veridion'],
    ['/demo', '일반 데모'],
    ['/documents', '문서 생성'],
    ['/guides', '법령'],
    ['/plans', '플랜'],
    ['/checkout', '구독 신청'],
    ['/portal', '고객 포털'],
    ['/products/veridion/demo', 'Veridion 전용 데모']
  ];

  for (const [pathname, needle] of publicPages) {
    const { res, text } = await fetchText(pathname);
    assert.equal(res.status, 200, `${pathname} status`);
    assert.ok(text.includes(needle), `${pathname} text`);
  }

  const unauthAdminPages = ['/admin/console', '/admin/orders', '/admin/publications', '/admin/library', '/admin/settings', '/admin/diagnostics'];
  for (const pathname of unauthAdminPages) {
    const { res } = await fetchText(pathname);
    assert.equal(res.status, 302, `${pathname} redirect status`);
    assert.equal(res.headers.get('location'), '/admin', `${pathname} redirect target`);
  }

  let auth = await fetchText('/api/admin/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key: 'routes-smoke-key' })
  });
  assert.equal(auth.res.status, 200);
  const cookie = auth.res.headers.get('set-cookie') || '';
  assert.ok(cookie.includes('nv0_admin_sid='));

  const authAdminPages = [
    ['/admin', '관리자 키 게이트'],
    ['/admin/console', '관리자 허브'],
    ['/admin/orders', '구독·사이트 운영'],
    ['/admin/publications', 'CTA 발행 관리'],
    ['/admin/library', '자료실'],
    ['/admin/settings', '설정'],
    ['/admin/diagnostics', '운영 진단']
  ];

  for (const [pathname, needle] of authAdminPages) {
    const { res, text } = await fetchText(pathname, { headers: { cookie } });
    assert.equal(res.status, 200, `${pathname} authed status`);
    assert.ok(text.includes(needle), `${pathname} authed text`);
  }

  console.log(JSON.stringify({ ok: true, checked: publicPages.length + unauthAdminPages.length + authAdminPages.length }, null, 2));
} finally {
  child.kill('SIGTERM');
}

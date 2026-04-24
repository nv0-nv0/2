import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const port = Number(process.env.NV0_TEST_PORT || 3215);
const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: root,
  env: { ...process.env, PORT: String(port), NV0_ADMIN_KEY: 'routes-smoke-key', NV0_TRUST_PROXY_HEADERS: 'true', NODE_ENV: 'production', NV0_TARGET_FETCH_ENABLED: 'false', NV0_ENABLE_TURNSTILE: 'false' },
  stdio: 'ignore'
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function fetchText(pathname, options = {}) {
  const res = await fetch(`http://127.0.0.1:${port}${pathname}`, { redirect: 'manual', ...options });
  const text = await res.text();
  return { res, text };
}

try {
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try { const { res } = await fetchText('/api/public/health'); if (res.status === 200) { ready = true; break; } } catch {}
    await wait(250);
  }
  assert.ok(ready, 'server ready');

  const publicPages = [
    ['/', ['NV0 Veridion', '온라인 사업 리스크']],
    ['/demo', ['간단 진단', '무료 진단']],
    ['/documents', ['정책 문서', '템플릿']],
    ['/guides', ['법령', '가이드']],
    ['/plans', ['요금', '플랜']],
    ['/checkout', ['유료 플랜', '결제']],
    ['/portal', ['고객 포털']],
    ['/products/veridion/demo', ['Veridion', '진단']],
    ['/solutions', ['상품 구조', '상용화']]
  ];

  for (const [pathname, needles] of publicPages) {
    const { res, text } = await fetchText(pathname);
    assert.equal(res.status, 200, `${pathname} status`);
    assert.ok(needles.some(needle => text.includes(needle)), `${pathname} text`);
  }

  const unauthAdminPages = ['/admin/console', '/admin/orders', '/admin/publications', '/admin/library', '/admin/settings', '/admin/diagnostics'];
  for (const pathname of unauthAdminPages) {
    const { res } = await fetchText(pathname);
    assert.equal(res.status, 302, `${pathname} redirect status`);
    assert.equal(res.headers.get('location'), '/admin', `${pathname} redirect target`);
  }

  let auth = await fetchText('/api/admin/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: 'routes-smoke-key' }) });
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
  child.kill('SIGKILL');
  if (typeof child.unref === 'function') child.unref();
}
process.exit(0);

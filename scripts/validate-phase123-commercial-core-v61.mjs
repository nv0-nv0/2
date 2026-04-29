import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const checks = [];
function add(key, ok, detail = '') {
  checks.push({ key, ok: !!ok, detail });
}

const server = read('server/index.mjs');
const nav = read('shared/session-nav.js');
const css = read('shared/base.css');
const portalHtml = read('apps/public/portal/index.html');
const portalJs = read('apps/public/portal/app.js');
const authHtml = read('apps/public/auth/index.html');
const checkoutHtml = read('apps/public/checkout/index.html');
const demoHtml = read('apps/public/veridion-demo/index.html');

add('session-nav:server-injection', /injectSessionNavScript/.test(server) && /\/shared\/session-nav\.js/.test(server));
add('session-nav:session-check', /\/api\/public\/auth\/session/.test(nav) && /credentials:\s*'same-origin'/.test(nav));
add('session-nav:logout-action', /\/api\/public\/auth\/logout/.test(nav) && /method:\s*'POST'/.test(nav));
add('session-nav:login-replaced-with-button', /replaceWith\(button\)/.test(nav) && /textContent\s*=\s*'로그아웃'/.test(nav));
add('session-nav:no-html-injection', !/innerHTML\s*=/.test(nav) && /textContent/.test(nav));
add('style:logout-button', /nav-logout-button/.test(css) && /\.site-menu button/.test(css));
add('style:brand-mark-polished', /brand-mark/.test(css) && /\.site-topbar \.brand:before\{display:none/.test(css));
add('style:focus-visible', /focus-visible/.test(css) && /outline-offset/.test(css));
add('style:mobile-menu-grid', /@media\(max-width:900px\)/.test(css) && /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(css));
add('style:reduced-motion', /prefers-reduced-motion:reduce/.test(css));
add('portal:glyph-normalized', !/[⌂▣◴✎▤▧⚡🔔✓↗✦⌕↻＋↓]/.test(portalHtml + portalJs));
add('portal:table-overflow-safe', /nv74-site-render\{overflow-x:auto/.test(css) && /nv74-site-table\{min-width/.test(css));
add('aria:auth-states-live', /id="loginState" role="status" aria-live="polite"/.test(authHtml) && /id="registerState" role="status" aria-live="polite"/.test(authHtml));
add('aria:checkout-states-live', /id="checkoutState" role="status" aria-live="polite"/.test(checkoutHtml));
add('aria:demo-states-live', /id="demoState" role="status" aria-live="polite"/.test(demoHtml) && /id="turnstileState" role="status" aria-live="polite"/.test(demoHtml));

const failed = checks.filter(item => !item.ok);
const report = {
  ok: failed.length === 0,
  phase: 'PHASE123_COMMERCIAL_CORE_V6_1',
  checkedAt: new Date().toISOString(),
  summary: {
    total: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length
  },
  checks
};
fs.writeFileSync(path.join(root, 'docs', 'PHASE123_COMMERCIAL_CORE_V61_VALIDATION_20260428.json'), JSON.stringify(report, null, 2));
assert.equal(failed.length, 0, JSON.stringify(failed, null, 2));
console.log(JSON.stringify(report.summary, null, 2));

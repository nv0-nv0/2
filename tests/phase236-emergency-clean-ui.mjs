import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const publicPages = globSync('apps/public/*/index.html').sort();
const finalCss = '/shared/nv0-phase236-emergency-clean-ui.css';
const forbiddenSheets = [
  '/shared/base.css',
  '/shared/design-system.css',
  '/shared/visibility.css',
  '/shared/unified-infographic.css',
  '/shared/nv0-clean-visibility-system.css',
  '/shared/nv0-final-100-ui-system.css',
  'app.css',
  'phase218',
  'phase224',
  'phase230',
  'phase231',
  'phase232',
  'phase233',
];

assert.equal(publicPages.length, 17, '17 public HTML pages must be present');
for (const page of publicPages) {
  const html = readFileSync(page, 'utf8');
  const links = [...html.matchAll(/<link[^>]+rel=["'][^"']*stylesheet[^"']*["'][^>]*>/gi)].map((m) => m[0]);
  assert.equal(links.length, 1, `${page} must have exactly one stylesheet`);
  assert.ok(links[0].includes(finalCss), `${page} must use phase236 CSS only`);
  for (const bad of forbiddenSheets) {
    assert.ok(!links[0].includes(bad), `${page} must not load forbidden stylesheet ${bad}`);
  }
  assert.match(html, /<body[^>]+class=["'][^"']*nv0-phase236-clean/, `${page} must use phase236 body class`);
  assert.ok(!/body[^>]+class=["'][^"']*(nv0-dark|nv0-final-100|nv0-clean-ui|phase23[0-5])/.test(html), `${page} must not use stale visual body classes`);
}

const css = readFileSync('shared/nv0-phase236-emergency-clean-ui.css', 'utf8');
for (const token of [
  '--nv-bg:#f6faff',
  '--nv-ink:#0a1728',
  '--nv-text:#1d3048',
  'body.nv0-phase236-clean',
  'background:#fff!important',
  'main article',
  'main aside',
  'color:var(--nv-text)!important',
  'grid-template-columns:repeat(auto-fit,minmax(240px,1fr))',
]) {
  assert.ok(css.includes(token), `phase236 CSS missing ${token}`);
}

console.log(JSON.stringify({ ok: true, publicPages: publicPages.length, assertions: 17 * 5 + 9 }, null, 2));

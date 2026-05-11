import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const cssPath = join(ROOT, 'shared/phase233-contrast-authority-clean-system.css');
const css = readFileSync(cssPath, 'utf8');

function hexToRgb(hex) {
  const clean = hex.replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
}
function luminance(hex) {
  return hexToRgb(hex).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrast(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

const pairs = [
  ['body text on white', '#243b55', '#ffffff', 9],
  ['primary ink on white', '#07182f', '#ffffff', 16],
  ['muted text on white', '#52677f', '#ffffff', 5],
  ['subtle text on white', '#5f7186', '#ffffff', 4.5],
  ['blue chip text on chip', '#123f96', '#eef6ff', 7],
  ['green chip text on chip', '#065f46', '#ecfdf5', 7],
  ['warm chip text on chip', '#7c2d12', '#fff7ed', 7],
  ['red chip text on chip', '#991b1b', '#fff1f2', 6],
  ['primary button white on blue', '#ffffff', '#1d4ed8', 6],
];
for (const [name, fg, bg, min] of pairs) {
  assert.ok(contrast(fg, bg) >= min, `${name} contrast ${contrast(fg, bg).toFixed(2)} < ${min}`);
}

const requiredTokens = [
  '--p233-ink:#07182f',
  '--p233-card:#ffffff',
  'body.phase233-clarity-authority',
  '--nv-text:var(--p233-ink)!important',
  '--p230-text:var(--p233-ink)!important',
  '.sr-only{position:absolute!important',
  'background:linear-gradient(135deg,#1d4ed8 0%,#0284c7 100%)!important',
  '.business-footer{',
  'grid-template-columns:repeat(4,minmax(0,1fr))!important',
];
for (const token of requiredTokens) assert.ok(css.includes(token), `missing ${token}`);

const publicDir = join(ROOT, 'apps/public');
const pages = readdirSync(publicDir).filter((name) => statSync(join(publicDir, name)).isDirectory());
assert.equal(pages.length, 17, 'expected 17 public pages');
for (const name of pages) {
  const html = readFileSync(join(publicDir, name, 'index.html'), 'utf8');
  assert.ok(html.includes('/shared/phase233-contrast-authority-clean-system.css'), `${name} missing phase233 css`);
  assert.ok(html.includes('phase233-clarity-authority'), `${name} missing body authority class`);
  const lastCss = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]).pop();
  assert.equal(lastCss, '/shared/phase233-contrast-authority-clean-system.css', `${name} phase233 must load last`);
}

console.log(JSON.stringify({ ok: true, passed: 9 + requiredTokens.length + pages.length * 3 }, null, 2));

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const css = read('shared/veridion-rebrand.css');
const htmlFiles = [
  'apps/public/home/index.html',
  'apps/public/demo/index.html',
  'apps/public/veridion-demo/index.html',
  'apps/public/plans/index.html',
  'apps/public/checkout/index.html',
  'apps/public/auth/index.html',
  'apps/public/portal/index.html'
];
const checks = [];
function add(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
}

add('css:phase347-layer-present', () => assert.match(css, /Phase347 unified diagnosis flow \+ button contrast hardening/));
add('css:primary-button-dark-bg-white-text', () => {
  assert.match(css, /--vr-button-bg:#075e54/);
  assert.match(css, /--vr-button-fg:#ffffff/);
  assert.match(css, /#scanBtn\)/);
});
add('css:secondary-button-white-bg-dark-text', () => {
  assert.match(css, /--vr-button-secondary-bg:#ffffff/);
  assert.match(css, /--vr-button-secondary-fg:#07111f/);
  assert.match(css, /\.bridge-actions button/);
});
add('css:disabled-button-visible', () => {
  assert.match(css, /--vr-button-disabled-bg:#d8e2ec/);
  assert.match(css, /--vr-button-disabled-fg:#475467/);
  assert.match(css, /aria-busy="true"/);
});
add('css:dark-context-ghost-is-white-on-transparent', () => assert.match(css, /\.vr-hero,.vr-report-header,.vr-dark-card,.vr-app-shell,.vr-footer/));
add('css:status-notices-have-non-identical-bg-and-text', () => {
  assert.match(css, /notice\.warn/);
  assert.match(css, /background:#fff8e6;color:#7a3d00/);
  assert.match(css, /background:#e8f8f3;color:#064e3b/);
  assert.match(css, /background:#f8fbff;color:#344054/);
});
for (const file of htmlFiles) {
  const html = read(file);
  add(`${file}:buttons-have-text`, () => {
    const buttonMatches = [...html.matchAll(/<button\b[^>]*>(.*?)<\/button>/gis)];
    for (const match of buttonMatches) assert.ok(match[1].replace(/<[^>]+>/g, '').trim().length > 0, `${file} empty button`);
  });
}

const failures = checks.filter(x => !x.ok);
const report = { ok: failures.length === 0, phase: 'phase347-button-contrast-contract', checked: checks.length, failed: failures.length, failures };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE347_BUTTON_CONTRAST_CONTRACT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const demoJs = read('apps/public/demo/app.js');
const demoCss = read('apps/public/demo/app.css');
const server = read('server/index.mjs');
const checks = [];
function add(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
}

add('server-csp-keeps-inline-style-blocked', () => {
  assert.match(server, /"style-src 'self'"/);
  assert.doesNotMatch(server, /style-src[^\n"]*'unsafe-inline'/);
});
add('demo-templates-have-no-inline-style-attributes', () => {
  assert.doesNotMatch(demoJs, /\bstyle\s*=/i);
});
add('demo-uses-csp-safe-meter-classes', () => {
  assert.match(demoJs, /function meterWidthClass\(/);
  assert.match(demoJs, /function percentClass\(/);
  assert.ok(demoCss.includes('.vr-meter-width{width:calc(var(--vr-pct,0)*1%)}'));
});
add('visual-percent-class-coverage-0-to-100', () => {
  for (let value = 0; value <= 100; value += 1) {
    assert.ok(demoCss.includes(`.vr-pct-${value}{--vr-pct:${value}}`), `missing vr-pct-${value}`);
  }
});
add('legacy-variable-class-coverage-0-to-100', () => {
  for (let value = 0; value <= 100; value += 1) {
    assert.ok(demoCss.includes(`.vr-crisis-${value}{--crisis:${value}}`), `missing vr-crisis-${value}`);
    assert.ok(demoCss.includes(`.vr-target-${value}{--target:${value}}`), `missing vr-target-${value}`);
    assert.ok(demoCss.includes(`.vr-score-${value}{--score:${value}}`), `missing vr-score-${value}`);
  }
});

const failures = checks.filter(item => !item.ok);
const report = { ok: failures.length === 0, contract: 'phase357-csp-inline-style-contract', checkedAt: new Date().toISOString(), checked: checks.length, failed: failures.length, failures, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE357_CSP_VISUAL_INTEGRITY.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);

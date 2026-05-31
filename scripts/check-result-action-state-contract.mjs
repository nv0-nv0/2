import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
function add(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
}

const pages = ['apps/public/home/index.html', 'apps/public/demo/index.html', 'apps/public/veridion-demo/index.html'];
for (const file of pages) {
  const html = read(file);
  add(`${file}:retry-disabled-before-result`, () => assert.match(html, /id="retryBtn"[^>]*disabled[^>]*aria-disabled="true"|id="retryBtn"[^>]*aria-disabled="true"[^>]*disabled/));
  add(`${file}:unlock-disabled-before-result`, () => assert.match(html, /id="unlockBtn"[^>]*disabled[^>]*aria-disabled="true"|id="unlockBtn"[^>]*aria-disabled="true"[^>]*disabled/));
  add(`${file}:no-premature-portal-hop-copy`, () => assert.doesNotMatch(html, /고객 포털에서 이어보기/));
}
const demoJs = read('apps/public/demo/app.js');
add('demo-js:action-state-function', () => assert.match(demoJs, /function updateResultActions/));
add('demo-js:save-scan-enables-actions', () => assert.match(demoJs, /saveScan\(scan\).*updateResultActions\(true\)/s));
add('demo-js:unlock-empty-state-warning', () => assert.match(demoJs, /먼저 사이트 주소를 입력해 무료 진단을 실행하세요/));
add('demo-js:busy-does-not-enable-result-actions', () => assert.match(demoJs, /updateResultActions\(\);/));

const failures = checks.filter(item => !item.ok);
const report = { ok: failures.length === 0, phase: 'phase348-result-action-state', checked: checks.length, failed: failures.length, failures };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE348_RESULT_ACTION_STATE_CONTRACT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);

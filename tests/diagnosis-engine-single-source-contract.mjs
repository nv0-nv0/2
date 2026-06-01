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

const home = read('apps/public/home/index.html');
const demo = read('apps/public/demo/index.html');
const productDemo = read('apps/public/veridion-demo/index.html');
const demoJs = read('apps/public/demo/app.js');
const aliasJs = read('apps/public/veridion-demo/app.js');

for (const [name, html] of Object.entries({ demo, productDemo })) {
  add(`${name}:single-source-body-marker`, () => assert.match(html, /data-diagnosis-engine="single-source"/));
  add(`${name}:loads-canonical-demo-js`, () => assert.match(html, /<script src="\/apps\/public\/demo\/app\.js" type="module"><\/script>/));
  add(`${name}:does-not-load-alias-runtime`, () => assert.doesNotMatch(html, /\/apps\/public\/veridion-demo\/app\.js/));
  add(`${name}:canonical-form-and-result`, () => {
    for (const token of ['id="unifiedDiagnosisForm"','id="targetUrl"','id="scanBtn"','id="demoState"','id="demoResult"','id="cancelScanBtn"','id="recentTargetList"','id="targetPreview"']) assert.ok(html.includes(token), token);
  });
  add(`${name}:primary-action-copy-consistent`, () => assert.match(html, /사이트 무료 진단 실행/));
}
add('home:routes-to-canonical-demo-without-embedding-engine', () => {
  assert.doesNotMatch(home, /id="unifiedDiagnosisForm"/);
  assert.match(home, /href="\/products\/veridion\/demo"/);
  assert.match(home, /<script src="\/apps\/public\/home\/app\.js" type="module"><\/script>/);
  assert.doesNotMatch(home, /\/apps\/public\/demo\/app\.js/);
});
add('alias-js:imports-canonical-engine-only', () => {
  assert.match(aliasJs, /import '\/apps\/public\/demo\/app\.js'/);
  assert.ok(aliasJs.length < 900, 'alias should not duplicate the full diagnosis engine');
});
add('canonical-js:owns-public-diagnose-endpoint', () => assert.match(demoJs, /\/api\/public\/diagnose/));
add('canonical-js:updates-result-actions', () => assert.match(demoJs, /function updateResultActions/));
add('canonical-js:owns-recent-history-and-toolbar', () => {
  assert.match(demoJs, /RECENT_TARGETS_KEY/);
  assert.match(demoJs, /renderResultToolbar/);
  assert.match(demoJs, /cancelActiveScan/);
});

const failures = checks.filter(item => !item.ok);
const report = { ok: failures.length === 0, phase: 'phase348-diagnosis-engine-single-source', checked: checks.length, failed: failures.length, failures };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE348_DIAGNOSIS_ENGINE_SINGLE_SOURCE_CONTRACT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);

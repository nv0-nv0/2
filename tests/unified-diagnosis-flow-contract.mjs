import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const files = {
  home: read('apps/public/home/index.html'),
  demo: read('apps/public/demo/index.html'),
  demoJs: read('apps/public/demo/app.js'),
  homeJs: read('apps/public/home/app.js')
};
const checks = [];
function add(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
}

for (const [name, html] of Object.entries({ demo: files.demo })) {
  add(`${name}:unified-marker`, () => assert.match(html, /data-unified-diagnosis="home-and-demo"/));
  add(`${name}:same-form-id`, () => assert.match(html, /id="unifiedDiagnosisForm"/));
  add(`${name}:same-target-input`, () => assert.match(html, /id="targetUrl"/));
  add(`${name}:same-scan-submit-button`, () => assert.match(html, /id="scanBtn"[^>]*type="submit"/));
  add(`${name}:bootstrap-guard-loaded`, () => assert.match(html, /<script src="\/apps\/public\/demo\/bootstrap\.js(?:\?v=[^"]+)?"><\/script>/));
  add(`${name}:same-state-and-result`, () => {
    assert.match(html, /id="demoState"/);
    assert.match(html, /id="demoResult"/);
    assert.match(html, /id="freeUsageLead"/);
    assert.match(html, /id="freeUsageBadge"/);
    assert.match(html, /id="cancelScanBtn"/);
    assert.match(html, /id="recentTargetList"/);
    assert.match(html, /id="targetPreview"/);
  });
}
add('home:delegates-to-dedicated-diagnosis-page', () => {
  assert.doesNotMatch(files.home, /id="unifiedDiagnosisForm"/);
  assert.match(files.home, /href="\/products\/veridion\/demo"/);
  assert.match(files.home, /무료 진단 화면으로 이동합니다/);
});
add('home:loads-home-engine-only', () => {
  assert.match(files.home, /\/apps\/public\/home\/app\.js/);
  assert.doesNotMatch(files.home, /\/apps\/public\/demo\/app\.js/);
});
add('home:compact-engine-marker', () => assert.match(files.homeJs, /homeCompactReady/));
add('demo-js:form-submit-listener', () => assert.match(files.demoJs, /unifiedDiagnosisForm\?\.addEventListener\('submit'/));
add('demo-js:single-public-diagnose-endpoint', () => assert.match(files.demoJs, /\/api\/public\/diagnose/));
add('demo-js:no-home-auto-portal-timer', () => assert.doesNotMatch(files.demoJs, /AUTO_PORTAL_DELAY_MS|homeDemoRedirectCountdown|자동 이동 준비/));
add('demo-js:recent-and-toolbar-tools', () => {
  assert.match(files.demoJs, /RECENT_TARGETS_KEY/);
  assert.match(files.demoJs, /resultCopySummaryBtn/);
  assert.match(files.demoJs, /cancelActiveScan/);
  assert.match(files.demoJs, /window\.__veridionRunScan = runScan/);
});
add('home:copy-promises-clear-separation', () => {
  assert.match(files.home, /사이트 주소를 입력하면 무료 진단 화면으로 이동합니다/);
  assert.match(files.home, /무료 진단 화면으로 이동합니다/);
});

const failures = checks.filter(x => !x.ok);
const report = { ok: failures.length === 0, phase: 'unified-diagnosis-flow-contract', checked: checks.length, failed: failures.length, failures };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/UNIFIED_DIAGNOSIS_FLOW_CONTRACT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);

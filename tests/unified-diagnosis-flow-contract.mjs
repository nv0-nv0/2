import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const files = {
  home: read('apps/public/home/index.html'),
  demo: read('apps/public/demo/index.html'),
  alias: read('apps/public/veridion-demo/index.html'),
  demoJs: read('apps/public/demo/app.js'),
  homeJs: read('apps/public/home/app.js')
};
const checks = [];
function add(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
}

for (const [name, html] of Object.entries({ home: files.home, demo: files.demo, alias: files.alias })) {
  add(`${name}:unified-marker`, () => assert.match(html, /data-unified-diagnosis="home-and-demo"/));
  add(`${name}:same-form-id`, () => assert.match(html, /id="unifiedDiagnosisForm"/));
  add(`${name}:same-target-input`, () => assert.match(html, /id="targetUrl"/));
  add(`${name}:same-submit`, () => assert.match(html, /id="scanBtn"[^>]*type="submit"/));
  add(`${name}:same-state-and-result`, () => {
    assert.match(html, /id="demoState"/);
    assert.match(html, /id="demoResult"/);
    assert.match(html, /id="freeUsageLead"/);
    assert.match(html, /id="freeUsageBadge"/);
  });
}
add('home:uses-demo-engine-script', () => assert.match(files.home, /\/apps\/public\/demo\/app\.js/));
add('home:does-not-load-divergent-home-engine', () => assert.doesNotMatch(files.home, /\/apps\/public\/home\/app\.js/));
add('home:legacy-entry-imports-demo-engine', () => assert.match(files.homeJs, /import '\/apps\/public\/demo\/app\.js'/));
add('demo-js:form-submit-listener', () => assert.match(files.demoJs, /unifiedDiagnosisForm\?\.addEventListener\('submit'/));
add('demo-js:single-public-diagnose-endpoint', () => assert.match(files.demoJs, /\/api\/public\/diagnose/));
add('demo-js:no-home-auto-portal-timer', () => assert.doesNotMatch(files.demoJs, /AUTO_PORTAL_DELAY_MS|homeDemoRedirectCountdown|자동 이동 준비/));
add('home:copy-promises-result-first-journey', () => {
  assert.match(files.home, /주소 입력부터 결과 확인까지 한 화면에서 끝냅니다/);
  assert.match(files.home, /먼저 결과를 보여준 뒤 필요한 경우에만 저장·상세 리포트로 연결합니다/);
  assert.doesNotMatch(files.home, /무의미하게|같은 진단 엔진|메인과 진단 페이지/);
});

const failures = checks.filter(x => !x.ok);
const report = { ok: failures.length === 0, phase: 'phase347-unified-diagnosis-flow-contract', checked: checks.length, failed: failures.length, failures };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE347_UNIFIED_DIAGNOSIS_FLOW_CONTRACT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const checks = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (name, ok, detail = '') => {
  checks.push({ name, ok, detail });
  if (!ok) errors.push({ name, detail });
};

const app = read('apps/public/veridion-demo/app.js');
const css = read('apps/public/veridion-demo/app.css');
const index = read('apps/public/veridion-demo/index.html');

assert('phase122 version script is available', read('package.json').includes('phase122:final'));
assert('click listener remains registered synchronously', app.indexOf("scanBtn?.addEventListener('click', runScan)") < app.indexOf('mountTurnstile({'));
assert('executive snapshot renderer exists', app.includes('renderExecutiveSnapshot'));
assert('report sample renderer exists', app.includes('renderReportSample'));
assert('quality notice renderer exists', app.includes('renderQualityNotice'));
assert('executive snapshot is rendered before metric strip', app.lastIndexOf('renderExecutiveSnapshot(view)') < app.lastIndexOf('renderMetricStrip(view)'));
assert('result sample differentiates free and paid output', app.includes('무료 요약') && app.includes('상세 리포트'));
assert('unconfirmed operational values are not asserted', app.includes('확인 필요') && app.includes('단정하지 않고'));
assert('phase122 css classes exist', css.includes('.executive-snapshot') && css.includes('.report-sample') && css.includes('.quality-notice'));
assert('mobile media query exists for phase122 blocks', css.includes('@media(max-width:900px)') && css.includes('@media(max-width:560px)'));
assert('demo index still links app module', index.includes('/apps/public/veridion-demo/app.js'));
assert('runtime reports directory exists and is empty', exists('runtime/reports') && fs.readdirSync(path.join(root, 'runtime/reports')).length === 0);

const report = {
  generatedAt: new Date().toISOString(),
  ok: errors.length === 0,
  passed: checks.filter((item) => item.ok).length,
  failed: errors.length,
  checks
};

fs.writeFileSync(path.join(root, 'docs', 'PHASE122_DEMO_REDELIVERY_QA_REVIEW_20260428.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);

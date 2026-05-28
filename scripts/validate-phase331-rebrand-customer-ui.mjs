import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const failures = [];
const checks = [];
function check(name, condition, detail = '') {
  const ok = Boolean(condition);
  checks.push({ name, ok, detail });
  if (!ok) failures.push({ name, detail });
}

const home = read('apps/public/home/index.html');
const portal = read('apps/public/portal/index.html');
const portalJs = read('apps/public/portal/app.js');
const demo = read('apps/public/veridion-demo/index.html');
const demoJs = read('apps/public/veridion-demo/app.js');
const css = read('shared/veridion-clean-v311.css');
const pkg = JSON.parse(read('package.json'));

check('version:phase331', /phase331-rebrand-customer-ui/.test(pkg.version), pkg.version);
check('home:v331-brand-marker', home.includes('data-veridion-brand="v331"'));
check('portal:v331-brand-marker', portal.includes('data-veridion-brand="v331"'));
check('demo:v331-brand-marker', demo.includes('data-veridion-brand="v331"'));
check('css:rebrand-system', css.includes('VERIDION rebrand system v331'));
for (const selector of ['.v331-topbar', '.v331-hero', '.v331-preview', '.v331-app-shell', '.v331-dashboard', '.v331-report-header', '.v331-footer']) {
  check(`css:${selector}`, css.includes(selector));
}
for (const copy of ['웹사이트의 신뢰와 준법을 진단하고', '전환율을 높이세요', '종합 신뢰 점수', '무료 진단 시작']) {
  check(`home-copy:${copy}`, home.includes(copy));
}
for (const copy of ['고객 포털', '종합 점수 추이', '우선 조치 항목 TOP 5', '등록된 사이트', '이번 주 추천 조치']) {
  check(`portal-copy:${copy}`, portal.includes(copy));
}
for (const id of ['portalRiskGauge', 'portalAssetList', 'saveSiteForm', 'portalFeed', 'portalAccountState']) {
  check(`portal-id:${id}`, portal.includes(id));
}
check('portal-js:customer-only-fetches', portalJs.includes('/api/public/account') && portalJs.includes('/api/public/board?page=1&pageSize=3'));
check('portal-js:no-internal-fetches', !/trustops|sentinel|launch-control|final-handoff|automation-workqueue/i.test(portalJs));
check('demo:no-prelaunch-copy', !/prelaunch|프리런치|런칭|launch control/i.test(demo + demoJs));
for (const rel of ['docs/design-reference/veridion-home-rebrand-reference.png', 'docs/design-reference/veridion-customer-portal-reference.png', 'docs/design-reference/veridion-diagnosis-report-reference.png']) {
  check(`design-reference:${rel}`, exists(rel));
}
const publicSource = [home, portal, portalJs, demo, demoJs].join('\n');
for (const forbidden of ['phase319', 'phase320', 'phase321', '프로덕션 센티널', '런칭 컨트롤', 'TrustOps 오토파일럿', '운영 큐', '자동화 백로그', 'canary', 'rollback', 'live verification', 'SLA']) {
  check(`public-forbidden:${forbidden}`, !publicSource.includes(forbidden));
}
check('responsive:1100', css.includes('max-width:1100px') || css.includes('max-width: 1100px'));
check('responsive:760', css.includes('max-width:760px') || css.includes('max-width: 760px'));
check('responsive:520', css.includes('max-width:520px') || css.includes('max-width: 520px'));
const report = { ok: failures.length === 0, phase: 'phase331-rebrand-customer-ui', checkedAt: new Date().toISOString(), checks, failures };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE331_REBRAND_CUSTOMER_UI_VALIDATION.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, phase: report.phase, checked: checks.length, failed: failures.length, report: 'docs/current/PHASE331_REBRAND_CUSTOMER_UI_VALIDATION.json' }, null, 2));
if (failures.length) process.exit(1);

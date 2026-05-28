import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });

const publicDir = path.join(root, 'apps/public');
const htmlFiles = fs.readdirSync(publicDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => `apps/public/${entry.name}/index.html`)
  .filter(exists)
  .sort();

const publicJsFiles = fs.readdirSync(publicDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => `apps/public/${entry.name}/app.js`)
  .filter(exists)
  .sort();

const css = read('shared/veridion-rebrand.css');
const publicSource = htmlFiles.map(read).join('\n') + '\n' + publicJsFiles.map(read).join('\n') + '\n' + css;

const forbiddenCopy = [
  '위험 진단', '요금 안내', '내 사이트 관리', '보안 점수88', '성능 점수76', 'SEO 점수90', '접근성 점수75',
  '키워드</a>', 'API 키 관리', '20분에 1회', '20분마다', '자동 발행', 'TrustOps', '프로덕션 센티널',
  '런칭 컨트롤', '운영 큐', '자동화 백로그', 'rollback', 'canary', 'live verification', 'SLA', 'MRR',
  'phase319', 'phase320', 'phase321', 'prelaunch'
];
const forbiddenSource = [
  '/shared/veridion-clean-v311.css', 'veridion-clean-v311.css', 'data-veridion-clean="v311"',
  'data-veridion-brand="v331"', 'data-veridion-rebrand="v333"', 'data-veridion-rebrand="v332"',
  'v311-', 'v331-', 'v332-', 'v333-', 'nv0n-', 'nv74-'
];

check('public-html-count', htmlFiles.length >= 15, String(htmlFiles.length));
check('clean-css-exists', exists('shared/veridion-rebrand.css'));
check('compat-css-empty-import-only', read('shared/veridion-clean-v311.css').trim() === "@import url('/shared/veridion-rebrand.css');");
for (const file of htmlFiles) {
  const html = read(file);
  const slug = file.split('/').at(-2);
  check(`${slug}:clean-marker`, html.includes('data-veridion-rebrand="clean"'));
  check(`${slug}:rebrand-css`, html.includes('/shared/veridion-rebrand.css'));
  check(`${slug}:single-footer`, (html.match(/<footer\b/gi) || []).length === 1);
  check(`${slug}:single-main`, (html.match(/<main\b/gi) || []).length === 1);
  check(`${slug}:no-inline-event`, !/\son[a-z]+\s*=/.test(html));
  check(`${slug}:no-inline-style`, !/style="/.test(html));
  for (const token of forbiddenCopy) check(`${slug}:no-old-copy:${token}`, !html.includes(token));
  for (const token of forbiddenSource) check(`${slug}:no-old-source:${token}`, !html.includes(token));
}
for (const token of forbiddenCopy) check(`public-source:no-old-copy:${token}`, !publicSource.includes(token));
for (const token of forbiddenSource) check(`public-source:no-old-source:${token}`, !publicSource.includes(token));
check('css:clean-brand-root', css.includes('VERIDION Rebrand Design System') && css.includes('body[data-veridion-rebrand="clean"]'));
check('css:no-legacy-css-token', !/v311-|v331-|v332-|v333-|nv0n-|nv74-|veridion-clean-v311/.test(css));
check('home:functional-ids-preserved', ['homeInstantDemoForm','homeTargetUrl','homeDemoState','homeDemoResult'].every(t => read('apps/public/home/index.html').includes(t)));
check('portal:functional-ids-preserved', ['portalRiskGauge','saveSiteForm','portalAssetList','portalFeed'].every(t => read('apps/public/portal/index.html').includes(t)));
check('board:functional-ids-preserved', ['boardSearchForm','boardList','boardPagination'].every(t => read('apps/public/board/index.html').includes(t)));
check('demo:functional-ids-preserved', ['targetUrl','scanBtn','demoResult','turnstileToken'].every(t => read('apps/public/veridion-demo/index.html').includes(t)));
check('server:rebrand-css-injection', read('server/index.mjs').includes('/shared/veridion-rebrand.css'));
check('server:accepts-current-csrf-header', read('server/index.mjs').includes("req.headers['x-vr-csrf']"));
const pkg = JSON.parse(read('package.json'));
check('package:phase334-version', /phase334-clean-rebrand/.test(pkg.version));
check('package:phase334-final-script', Boolean(pkg.scripts?.['phase334:final']));

const failed = checks.filter(item => !item.ok);
const report = { ok: failed.length === 0, phase: 'phase334-clean-rebrand', score: failed.length === 0 ? 100 : Math.max(0, 100 - failed.length), checked: checks.length, failed: failed.length, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE334_CLEAN_REBRAND_VALIDATION.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, phase: report.phase, score: report.score, checked: report.checked, failed: report.failed, report: 'docs/current/PHASE334_CLEAN_REBRAND_VALIDATION.json' }, null, 2));
if (failed.length) {
  console.error(JSON.stringify(failed.slice(0, 25), null, 2));
  process.exit(1);
}

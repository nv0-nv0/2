import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const publicDir = path.join(root, 'apps/public');
const htmlFiles = fs.readdirSync(publicDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => `apps/public/${entry.name}/index.html`)
  .filter(exists)
  .sort();

const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });
const forbiddenPublicCopy = [
  '위험 진단', '내 사이트 관리', '요금 안내', '보안 점수88', '성능 점수76', 'SEO 점수90', '접근성 점수75',
  '키워드</a>', 'API 키 관리', '20분에 1회', '20분마다', '자동 발행', 'TrustOps', '프로덕션 센티널',
  '런칭 컨트롤', '운영 큐', '자동화 백로그', 'rollback', 'canary', 'live verification', 'SLA', 'MRR',
  'phase319', 'phase320', 'phase321', 'prelaunch'
];
const forbiddenUnverifiedClaims = ['10,000+', '98%', '고객 만족도', '김소연', '이준호', '박지민', 'AI 기반', '무제한 진단', '전담 지원'];

check('public-html-count', htmlFiles.length >= 15, String(htmlFiles.length));
for (const file of htmlFiles) {
  const html = read(file);
  const slug = file.split('/').at(-2);
  check(`${slug}:vr-marker`, html.includes('data-veridion-rebrand="clean"'));
  check(`${slug}:brand-css`, html.includes('/shared/veridion-rebrand.css'));
  check(`${slug}:single-static-footer`, (html.match(/<footer\b/gi) || []).length === 1);
  check(`${slug}:single-main`, (html.match(/<main\b/gi) || []).length === 1);
  for (const token of forbiddenPublicCopy) check(`${slug}:no-forbidden-copy:${token}`, !html.includes(token));
  for (const token of forbiddenUnverifiedClaims) check(`${slug}:no-unverified-claim:${token}`, !html.includes(token));
}
const publicClient = htmlFiles.map(read).join('\n')
  + '\n' + ['apps/public/home/app.js', 'apps/public/portal/app.js', 'apps/public/board/app.js', 'apps/public/veridion-demo/app.js', 'apps/public/checkout/app.js'].filter(exists).map(read).join('\n');
for (const token of forbiddenPublicCopy) check(`public-client:no-forbidden:${token}`, !publicClient.includes(token));
for (const token of forbiddenUnverifiedClaims) check(`public-client:no-unverified:${token}`, !publicClient.includes(token));
check('public-client:no-broken-glyph', !/[▤☑⋮✓↗█░⚠◆▣⚖›🤖◎⋈✦◷]/.test(publicClient));
check('portal:customer-safe-cadence', read('apps/public/portal/app.js').includes("text('#portalPublishCadence', '정기 업데이트')"));
check('board:customer-safe-cadence', read('apps/public/board/app.js').includes("$('#boardCadence').textContent = '정기 업데이트'"));
const css = read('shared/veridion-rebrand.css');
check('css:vr-layer', css.includes('live rebrand hardening v333') && css.includes('body[data-veridion-rebrand="clean"] .vr-main'));
const routes = read('server/routes/public.mjs');
check('routes:internal-public-endpoints-hidden', routes.includes('customerHiddenOperationalEndpoints') && routes.includes("'/api/public/trustops-production-sentinel'") && routes.includes("return json(req, res, 404"));
check('routes:no-public-cadence-minutes', !/publicationCadence:\s*\{[^}]*intervalMinutes/.test(routes));
const pkg = JSON.parse(read('package.json'));
check('package:phase333-version', /phase333/.test(pkg.version));
check('package:phase333-final-script', Boolean(pkg.scripts?.['phase333:final']));

fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
const failed = checks.filter((item) => !item.ok);
const report = { ok: failed.length === 0, phase: 'phase333-100point-rebrand', score: failed.length === 0 ? 100 : Math.max(0, 100 - failed.length), checked: checks.length, failed: failed.length, checks };
fs.writeFileSync(path.join(root, 'docs/current/PHASE333_100POINT_REBRAND_VALIDATION.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, phase: report.phase, score: report.score, checked: report.checked, failed: report.failed, report: 'docs/current/PHASE333_100POINT_REBRAND_VALIDATION.json' }, null, 2));
if (failed.length) {
  console.error(JSON.stringify(failed.slice(0, 20), null, 2));
  process.exit(1);
}

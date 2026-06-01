import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });

const requiredFiles = [
  'server/index.mjs',
  'server/routes/public.mjs',
  'shared/veridion-rebrand.css',
  'apps/public/home/index.html',
  'apps/public/portal/index.html',
  'apps/public/portal/app.js',
  'apps/public/board/index.html',
  'apps/public/board/app.js',
  'apps/public/veridion-demo/index.html',
  'apps/public/plans/index.html',
  'apps/public/auth/index.html',
  'Dockerfile',
  'package.json'
];
for (const file of requiredFiles) add(`exists:${file}`, exists(file));

const pkg = JSON.parse(read('package.json'));
add('package:clean-rebrand-version', /phase33[45]-(clean-rebrand|unified-organism)|phase340-redteam-100-closeout|phase341-final-closeout|phase342-merged-best|phase343-final-perfect|phase345-final-delivery-closeout|phase346-global-hardening-final|phase347-unified-diagnosis-final|phase348-final-unified-engine-closeout|phase349-customer-journey-closeout|phase350-global-cta-semantics-closeout|phase351-prompt-full-sweep-closeout|phase353-full-package-closeout|phase354-deployment-security-closeout|phase355-organization-closeout|phase350-global-cta-semantics-closeout|phase351-prompt-full-sweep-closeout/.test(pkg.version));

const appHtmlFiles = [];
for (const area of ['apps/public', 'apps/admin']) {
  for (const entry of fs.readdirSync(path.join(root, area), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = path.join(area, entry.name, 'index.html').replace(/\\/g, '/');
    if (exists(file)) appHtmlFiles.push(file);
  }
}

const forbiddenPublic = [
  '위험 진단', '요금 안내', '내 사이트', '보안 점수88', '성능 점수76', 'SEO 점수90', '접근성 점수75',
  'API 키 관리', '20분에 1회', '20분마다', '자동 발행', 'TrustOps', '프로덕션 센티널', '런칭 컨트롤',
  '운영 큐', '자동화 백로그', 'rollback', 'canary', 'live verification', 'SLA', 'MRR', 'phase319', 'phase320', 'phase321', 'prelaunch'
];
const forbiddenSource = ['veridion-clean-v311.css','data-veridion-clean="v311"','data-veridion-brand="v331"','data-veridion-rebrand="v333"','v311-','v331-','v332-','v333-','nv0n-','nv74-'];

for (const file of appHtmlFiles) {
  const html = read(file);
  add(`${file}:rebrand-css`, html.includes('/shared/veridion-rebrand.css'));
  add(`${file}:clean-marker`, html.includes('data-veridion-rebrand="clean"'));
  add(`${file}:single-main`, (html.match(/<main\b/gi) || []).length === 1);
  add(`${file}:single-footer`, file.includes('apps/admin/') || (html.match(/<footer\b/gi) || []).length === 1);
  add(`${file}:no-inline-event`, !/\son[a-z]+\s*=/.test(html));
  add(`${file}:no-inline-script`, !/<script(?![^>]*src=)(?![^>]*type="application\/ld\+json")/.test(html));
  for (const token of forbiddenSource) add(`${file}:no-old-source:${token}`, !html.includes(token));
  if (file.includes('apps/public/')) for (const token of forbiddenPublic) add(`${file}:no-old-copy:${token}`, !html.includes(token));
}

const publicClientFiles = appHtmlFiles.filter(f => f.includes('apps/public/'))
  .concat(['apps/public/home/app.js','apps/public/veridion-demo/app.js','apps/public/checkout/app.js','apps/public/portal/app.js','apps/public/board/app.js'].filter(exists));
const publicClient = publicClientFiles.map(read).join('\n') + '\n' + read('shared/veridion-rebrand.css');
for (const token of forbiddenPublic) add(`public:no-old-copy:${token}`, !publicClient.includes(token));
for (const token of forbiddenSource) add(`public:no-old-source:${token}`, !publicClient.includes(token));
add('public:no-broken-glyph-source', !/[▤☑⋮✓↗█░⚠◆▣⚖›🤖◎⋈✦◷]/.test(publicClient));
add('public:no-console-log', !/console\.log\(/.test(publicClient));
add('portal:functional-ids-preserved', ['portalRiskGauge','saveSiteForm','portalFeed'].every(t => read('apps/public/portal/index.html').includes(t)));
add('board:functional-ids-preserved', ['boardList','boardSearchForm','boardPagination'].every(t => read('apps/public/board/index.html').includes(t)));
add('home:functional-ids-preserved', ['vr-home-two-column','homeSignalGrid','homeAudienceGrid','/apps/public/home/app.js'].every(t => read('apps/public/home/index.html').includes(t)));
add('demo:functional-ids-preserved', ['cancelScanBtn','recentTargetList','targetPreview','/apps/public/demo/app.css'].every(t => read('apps/public/demo/index.html').includes(t)));

const passed = checks.filter((check) => check.ok).length;
const failed = checks.length - passed;
const report = { generatedAt: new Date().toISOString(), ok: failed === 0, phase: 'phase335-unified-organism-test', total: checks.length, passed, failed, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE335_TEST_SUMMARY.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed, failed, report: 'docs/current/PHASE335_TEST_SUMMARY.json' }, null, 2));
if (!report.ok) process.exit(1);

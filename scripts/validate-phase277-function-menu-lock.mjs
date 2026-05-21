import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const expectedMenu = [
  ['위험 진단', '/products/veridion/demo'],
  ['서비스', '/service'],
  ['요금 안내', '/plans'],
  ['인사이트', '/board'],
  ['내 사이트', '/portal'],
  ['문의하기', '/business-info']
];
const htmlFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(path.relative(root, full));
  }
}
walk(path.join(root, 'apps/public'));
const topbarFiles = htmlFiles.filter(file => read(file).includes('nv0n-primary-nav'));
for (const file of topbarFiles) {
  const html = read(file);
  const nav = html.match(/<nav[^>]*class="[^"]*nv0n-primary-nav[^"]*"[^>]*>([\s\S]*?)<\/nav>/)?.[1] || '';
  const labels = [...nav.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(m => [m[2].trim(), m[1].trim()]);
  add(`top-menu:original:${file}`, JSON.stringify(labels) === JSON.stringify(expectedMenu), JSON.stringify(labels));
}
const allHtml = htmlFiles.map(file => read(file)).join('\n');
const css = read('shared/veridion-adopted-ui.css');
const pkg = JSON.parse(read('package.json'));
add('package:phase277-version', /phase277|phase278/.test(pkg.version) && pkg.name === 'veridion-public-risk-diagnostic');
add('brand:veridion-visible', /VERIDION/.test(allHtml));
add('brand:business-legal-nv0-only', allHtml.includes('상호: 엔브이제로(NV0)'));
add('copy:no-duplicate-demo', !allHtml.includes('무료 진단 진단') && !allHtml.includes('작동되는 무료 진단'));
add('purpose:no-domain-registrar-copy', !/(도메인 검색|장바구니|TLD 선택|도메인 등록|호스팅 판매|SSL 인증서 구매)/.test(allHtml));
add('contact:ct-only', allHtml.includes('ct@nv0.kr') && !allHtml.includes('hello@nv0.kr') && !allHtml.includes('ct@VERIDION'));
add('design:stitch-tokens-kept', css.includes('--veridion-bg:#f7f9fb') && css.includes('--veridion-max:1280px') && css.includes('--veridion-primary:#2563eb'));
add('design:top-menu-preserved-css', css.includes('PHASE277 function-connection') && css.includes('.nv0n-primary-nav') && css.includes('overflow-x:auto'));
add('function:home-instant-demo-connected', read('apps/public/home/index.html').includes('id="homeInstantDemoForm"') && read('apps/public/home/index.html').includes('id="homeTargetUrl"') && read('apps/public/home/app.js').includes("'/api/diagnostics/start'") && read('apps/public/home/app.js').includes("'/api/public/diagnose'"));
add('function:demo-page-connected', read('apps/public/veridion-demo/index.html').includes('id="targetUrl"') && read('apps/public/veridion-demo/index.html').includes('id="scanBtn"') && read('apps/public/veridion-demo/index.html').includes('id="demoResult"') && /api\/public\/(scan|diagnose)/.test(read('apps/public/veridion-demo/app.js')));
add('function:portal-connected', read('apps/public/portal/index.html').includes('id="saveSiteForm"') && read('apps/public/portal/app.js').includes('/api/public/portal-summary') && read('apps/public/portal/app.js').includes('/api/public/board') && read('apps/public/portal/app.js').includes('/api/public/account/sites'));
add('function:board-connected', read('apps/public/board/index.html').includes('id="boardList"') && read('apps/public/board/app.js').includes('/api/public/board'));
add('function:auth-empty-connected', read('apps/public/auth/index.html').includes('id="loginForm"') && read('apps/public/auth/index.html').includes('data-nv0-empty-default="true"') && read('apps/public/auth/app.js').includes('/api/public/auth/login'));
add('function:server-routes-kept', read('server/routes/public.mjs').includes('/api/public/board') && read('server/routes/payment.mjs').includes('/api/public/portal-summary') && read('server/routes/public.mjs').includes('/api/diagnostics/start'));
add('function:autopublish-kept', read('server/index.mjs').includes('setInterval(() => {\nrunCtaAutopublish') && read('server/routes/payment.mjs').includes("reason: 'portal-summary'"));

const failed = checks.filter(c => !c.ok);
const report = { ok: failed.length === 0, passed: checks.length - failed.length, failed: failed.length, checkedTopbarFiles: topbarFiles.length, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE277_FUNCTION_MENU_LOCK_AUDIT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, checkedTopbarFiles: topbarFiles.length, report: 'docs/current/PHASE277_FUNCTION_MENU_LOCK_AUDIT.json' }, null, 2));
if (!report.ok) process.exit(1);

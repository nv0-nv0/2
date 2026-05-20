import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const add = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const htmlFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(path.relative(root, full));
  }
}
walk(path.join(root, 'apps/public'));
const allHtml = htmlFiles.map(read).join('\n');
const css = read('shared/veridion-adopted-ui.css');
const pkg = JSON.parse(read('package.json'));
add('product-name:VERIDION-visible', /VERIDION/.test(allHtml));
add('product-name:header-brand', /class="nv0n-brand"[^>]*>VERIDION<\/a>/.test(allHtml) || /nv0-brand-mark">VERIDION/.test(allHtml));
add('product-name:package', pkg.name === 'veridion-public-risk-diagnostic' && /phase276/.test(pkg.version));
add('legal-contact:single-email', allHtml.includes('ct@nv0.kr') && !allHtml.includes('hello@nv0.kr') && !allHtml.includes('ct@VERIDION'));
add('legal-domain:not-broken', !read('server/index.mjs').includes('https://VERIDION') && !read('server/index.mjs').includes('ct@VERIDION'));
add('stitch-css:tokens', css.includes('--veridion-bg:#f7f9fb') && css.includes('--veridion-max:1280px'));
add('stitch-css:flat-cards', css.includes('box-shadow:none!important') && css.includes('border-radius:12px!important'));
add('stitch-css:compact-buttons', css.includes('border-radius:var(--veridion-radius-sm)') && css.includes('--veridion-primary:#2563eb'));
add('stitch-css:light-footer', css.includes('background:#e6e8ea!important'));
add('purpose-filter:no-domain-cart-copy', !/(도메인 검색|장바구니|TLD|도메인 등록|도메인 가격)/.test(allHtml));
add('purpose-filter:diagnosis-kept', allHtml.includes('무료 진단') && allHtml.includes('인사이트') && allHtml.includes('내 사이트'));
add('demo-copy:customer-facing', read('apps/public/veridion-demo/index.html').includes('사이트 주소만 입력하면 핵심 안내 공백을 바로 확인할 수 있습니다') && !read('apps/public/veridion-demo/index.html').includes('입력창을 맨 위에 배치'));
add('portal:publish-status-hardened', read('apps/public/portal/app.js').includes('발행 확인 필요') && read('server/routes/payment.mjs').includes("reason: 'portal-summary'"));
add('portal:layout-preserved', read('apps/public/portal/index.html').includes('portal-dashboard-grid') && read('shared/veridion-adopted-ui.css').includes('grid-template-columns:minmax(0,1fr) 360px'));
add('function:instant-demo-preserved', read('apps/public/home/index.html').includes('homeInstantDemoForm') && read('apps/public/home/app.js').includes('/api/diagnostics/start'));
add('function:auth-empty-default-preserved', read('apps/public/auth/index.html').includes('data-nv0-empty-default="true"'));

const failed = checks.filter(c => !c.ok);
const report = { ok: failed.length === 0, passed: checks.length - failed.length, failed: failed.length, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE276_VERIDION_STITCH_ADOPTED_AUDIT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, report: 'docs/current/PHASE276_VERIDION_STITCH_ADOPTED_AUDIT.json' }, null, 2));
if (!report.ok) process.exit(1);

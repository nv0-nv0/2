import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const checks = [];
const add = (name, ok, detail = undefined) => checks.push({ name, ok: Boolean(ok), ...(detail ? { detail } : {}) });

const cssPath = 'shared/design-system.css';
add('design-system:exists', exists(cssPath));
const css = exists(cssPath) ? read(cssPath) : '';

for (const token of [
  '--nv-bg:#0B1220',
  '--nv-surface:#111C31',
  '--nv-primary:#3B82F6',
  '--nv-accent:#38BDF8',
  '--nv-text:#F8FAFC',
  '--nv-radius-xl:24px',
  '--nv-shadow-blue',
  '.nv191-action-grid',
  '.nv191-action-card',
  '.nv0-kpi-grid',
  '.nv0-gauge path[stroke="#ef4444"]',
  '.checkout-layout',
  '.nv74-dashboard-shell',
  'body:not(.nv0-dark) .page-head',
  '@media(max-width:860px)'
]) add(`design-css:${token}`, css.includes(token));

add('design-css:two-column-portal-actions', /\.nv191-action-grid\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s.test(css));
add('design-css:content-board-two-column', /\.nv191-content-board \.nv74-feed-render\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s.test(css));
add('design-css:purple-orange-neutralized', css.includes('.purple,.orange,[class*="purple"],[class*="orange"]'));
add('design-css:professional-surface-system', css.includes('linear-gradient(180deg,rgba(17,28,49,.98),rgba(11,23,41,.98))'));
add('design-css:no-strong-purple-primary', !/#8B5CF6|#A855F7|#7C3AED|139,92,246|168,85,247/.test(css));

const htmlFiles = [];
function walk(dir) {
  for (const item of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, item.name);
    if (item.isDirectory()) walk(rel);
    else if (item.name === 'index.html') htmlFiles.push(rel.replaceAll('\\', '/'));
  }
}
walk('apps');
add('pages:index-html-count', htmlFiles.length >= 20, { count: htmlFiles.length });

for (const file of htmlFiles) {
  const html = read(file);
  const vis = html.indexOf('/shared/visibility.css');
  const ds = html.indexOf('/shared/design-system.css');
  add(`${file}:design-system-linked`, ds > -1);
  add(`${file}:design-system-after-visibility`, vis > -1 && ds > vis);
  add(`${file}:base-css-linked`, html.includes('/shared/base.css'));
  add(`${file}:no-inline-style`, !/style="/.test(html));
  add(`${file}:no-replacement-char`, !html.includes('�'));
}

const publicPages = [
  'apps/public/home/index.html',
  'apps/public/plans/index.html',
  'apps/public/board/index.html',
  'apps/public/checkout/index.html',
  'apps/public/documents/index.html',
  'apps/public/veridion-demo/index.html',
  'apps/public/portal/index.html'
];
for (const file of publicPages) {
  const html = read(file);
  add(`${file}:footer-visible`, html.includes('business-footer'));
}

const portalHtml = read('apps/public/portal/index.html');
const portalJs = read('apps/public/portal/app.js');
const portalCss = read('apps/public/portal/app.css');
const sidebarPrimary = portalHtml.indexOf('nv191-sidebar-primary');
const nav = portalHtml.indexOf('class="nv74-nav"');
add('portal:new-site-registration-above-menu', sidebarPrimary > -1 && nav > -1 && sidebarPrimary < nav);
add('portal:removed-custom-guidance', !portalHtml.includes('맞춤 지침') && !portalJs.includes('맞춤 지침'));
add('portal:removed-paid-output-check', !portalHtml.includes('결제 후 산출물 확인') && !portalJs.includes('결제 후 산출물 확인'));
add('portal:next-actions-2x2-preserved', portalCss.includes('.nv191-action-grid') && css.includes('.nv191-action-grid'));

const pkg = JSON.parse(read('package.json'));
add('package:validate-script', pkg.scripts?.['validate:phase192'] === 'node scripts/validate-phase192-design-system.mjs');
add('package:final-script', typeof pkg.scripts?.['phase192:final'] === 'string' && pkg.scripts['phase192:final'].includes('validate:phase192'));
add('package:version-phase192', String(pkg.version).includes('phase192'));

const failed = checks.filter(item => !item.ok);
const report = {
  generatedAt: new Date().toISOString(),
  ok: failed.length === 0,
  phase: 192,
  title: 'Global design system unification validation',
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks
};
fs.writeFileSync(path.join(root, 'PHASE192_GLOBAL_DESIGN_SYSTEM_UNIFICATION_VALIDATION_20260504.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, report: 'PHASE192_GLOBAL_DESIGN_SYSTEM_UNIFICATION_VALIDATION_20260504.json' }, null, 2));
if (!report.ok) process.exit(1);

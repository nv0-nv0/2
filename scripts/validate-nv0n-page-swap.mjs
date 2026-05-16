import { promises as fs } from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const pages = [
  ['/', 'apps/public/home/index.html', ['data-nv0n-page="true"', '/shared/nv0n-runtime.css', '/shared/nv0n-runtime.js']],
  ['/service', 'apps/public/service/index.html', ['서비스 상세 정보', '/apps/public/service/app.js']],
  ['/plans', 'apps/public/plans/index.html', ['요금 안내', '/apps/public/plans/app.js']],
  ['/products/veridion/demo', 'apps/public/veridion-demo/index.html', ['id="targetUrl"', 'id="scanBtn"', 'id="demoResult"', '/apps/public/veridion-demo/app.js']],
  ['/portal', 'apps/public/portal/index.html', ['id="saveSiteForm"', 'id="portalPrimary"', 'id="portalFeed"', '/apps/public/portal/app.js']],
  ['/board', 'apps/public/board/index.html', ['id="boardList"', 'id="boardSearch"', 'id="boardPagination"', '/apps/public/board/app.js']]
];
const errors = [];
for (const [route, rel, markers] of pages) {
  const body = await fs.readFile(path.join(ROOT, rel), 'utf8');
  for (const marker of markers) if (!body.includes(marker)) errors.push(`${route} missing ${marker}`);
  if (/cdn\.tailwindcss\.com|tailwind\.config|fonts\.googleapis\.com/.test(body)) errors.push(`${route} still depends on blocked external/inline Tailwind/font resources`);
  if (/href="#"/.test(body)) errors.push(`${route} contains inert href="#"`);
}
const runtimeCss = await fs.readFile(path.join(ROOT, 'shared/nv0n-runtime.css'), 'utf8');
const runtimeJs = await fs.readFile(path.join(ROOT, 'shared/nv0n-runtime.js'), 'utf8');
if (!runtimeCss.includes('.nv0n-page')) errors.push('runtime CSS missing nv0n-page scope');
if (!runtimeJs.includes('bindActionButtons')) errors.push('runtime JS missing action binding');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(JSON.stringify({ ok: true, checkedRoutes: pages.map(p => p[0]), mode: 'nv0n-local-csp-safe-page-swap' }, null, 2));

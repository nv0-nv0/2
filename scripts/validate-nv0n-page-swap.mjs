import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const pages = [
  ['/', 'apps/public/home/index.html', ['data-nv0n-page="true"', '/shared/nv0n-generated.css', '/shared/nv0n-runtime.css', '/shared/nv0n-runtime.js', '/apps/public/home/app.js']],
  ['/service', 'apps/public/service/index.html', ['서비스 상세 정보', '/apps/public/service/app.js']],
  ['/plans', 'apps/public/plans/index.html', ['요금 안내', '/apps/public/plans/app.js']],
  ['/demo', 'apps/public/demo/index.html', ['리스크 진단 결과', '/apps/public/demo/app.js']],
  ['/products/veridion/demo', 'apps/public/veridion-demo/index.html', ['무료 진단 실행', 'id="targetUrl"', 'id="scanBtn"', 'id="demoResult"', '/apps/public/veridion-demo/app.js']],
  ['/portal', 'apps/public/portal/index.html', ['내 사이트 관리', 'id="saveSiteForm"', 'id="portalPrimary"', 'id="portalFeed"', '/apps/public/portal/app.js']],
  ['/board', 'apps/public/board/index.html', ['법률 리스크 인사이트', 'id="boardList"', 'id="boardSearch"', 'id="boardPagination"', '/apps/public/board/app.js']],
  ['/auth', 'apps/public/auth/index.html', ['id="loginForm"', 'id="registerForm"', 'id="resetRequestForm"', 'id="resetForm"', '/apps/public/auth/app.js']]
];
const errors = [];
for (const [route, rel, markers] of pages) {
  const body = await fs.readFile(path.join(ROOT, rel), 'utf8');
  for (const marker of markers) if (!body.includes(marker)) errors.push(`${route} missing ${marker}`);
  if (/cdn\.tailwindcss\.com|tailwind\.config|fonts\.googleapis\.com/.test(body)) errors.push(`${route} still depends on blocked external/inline Tailwind/font resources`);
  if (/href="#"/.test(body)) errors.push(`${route} contains inert href="#"`);
  const topbarMatch = body.match(/<header[^>]*class="[^"]*nv0n-topbar[^"]*"[\s\S]*?<\/header>/i);
  if (!topbarMatch) errors.push(`${route} missing visible topbar header`);
  const topbar = topbarMatch?.[0] || '';
  for (const requiredLink of ['/products/veridion/demo', '/service', '/plans', '/board', '/portal', '/business-info']) {
    if (!topbar.includes(`href="${requiredLink}"`)) errors.push(`${route} topbar missing ${requiredLink}`);
  }
  if (!topbar.includes('class="nv0n-primary-nav"')) errors.push(`${route} topbar missing nv0n-primary-nav`);
  if (/hidden\s+md:flex|md:hidden/.test(topbar)) errors.push(`${route} topbar still contains breakpoint-hidden navigation classes`);
}


const authHtml = await fs.readFile(path.join(ROOT, 'apps/public/auth/index.html'), 'utf8');
const authJs = await fs.readFile(path.join(ROOT, 'apps/public/auth/app.js'), 'utf8');
if (/id=\"(?:loginEmail|registerEmail|resetEmail|resetConfirmEmail)\"[^>]*value=\"[^\"]+@/.test(authHtml)) errors.push('auth page exposes an email address inside an email input value');
if (/id="(?:loginEmail|registerEmail|resetEmail|resetConfirmEmail)"[^>]*value="(?!")/.test(authHtml)) errors.push('auth email input has a non-empty value attribute');
if (/searchParams\.get\(['"]email['"]\)|loginEmail\.value\s*=\s*email|registerEmail\.value\s*=\s*email|data\.customer\.email/.test(authJs)) errors.push('auth app pre-fills or displays email identity');
const generatedCss = await fs.readFile(path.join(ROOT, 'shared/nv0n-generated.css'), 'utf8');
if (!generatedCss.includes('.text-primary')) errors.push('generated CSS missing Tailwind utility coverage');

const runtimeCss = await fs.readFile(path.join(ROOT, 'shared/nv0n-runtime.css'), 'utf8');
const runtimeJs = await fs.readFile(path.join(ROOT, 'shared/nv0n-runtime.js'), 'utf8');
if (!runtimeCss.includes('.nv0n-page')) errors.push('runtime CSS missing nv0n-page scope');
if (!runtimeJs.includes('bindActionButtons')) errors.push('runtime JS missing action binding');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(JSON.stringify({ ok: true, checkedRoutes: pages.map(p => p[0]), mode: 'nv0n-local-csp-safe-page-swap' }, null, 2));

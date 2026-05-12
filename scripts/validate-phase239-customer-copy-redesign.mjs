import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const publicDir = path.join(ROOT, 'apps', 'public');
const adminDir = path.join(ROOT, 'apps', 'admin');
const cssPath = path.join(ROOT, 'shared', 'nv0-clean-slate-20260512.css');

const publicSlugs = (await fs.readdir(publicDir, { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name).sort();
const adminSlugs = (await fs.readdir(adminDir, { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name).sort();

const requiredCustomerTerms = ['고객', '무료 진단', '결제', '환불', '문의', '개인정보'];
const bannedPublicTokens = ['API 연결', '테스트 결제', '확인용 결제', '품질 게이트', '작업지시서', '관리자 화면', '운영자', '내부용'];
const requiredIds = {
  board: ['boardState', 'boardList', 'boardPagination', 'boardActivity'],
  documents: ['docForm', 'docState', 'docView', 'copyDocBtn', 'saveDocBtn'],
  checkout: ['buyerEmail', 'plan', 'checkoutBtn', 'checkoutState', 'orderSummary'],
  portal: ['saveSiteForm', 'portalState', 'portalPrimary', 'portalFeed'],
  auth: ['loginForm', 'registerForm', 'resetRequestForm', 'resetForm'],
  'veridion-demo': ['targetUrl', 'scanBtn', 'retryBtn', 'demoState', 'demoResult']
};

const errors = [];
const checked = [];
for (const slug of publicSlugs) {
  const dir = path.join(publicDir, slug);
  const htmlPath = path.join(dir, 'index.html');
  const jsPath = path.join(dir, 'app.js');
  const html = await fs.readFile(htmlPath, 'utf8');
  const js = await fs.readFile(jsPath, 'utf8');
  const combined = `${html}\n${js}`;
  if (!html.includes('phase239-copy')) errors.push(`${slug}: phase239-copy body class missing`);
  if (!html.includes('/shared/nv0-clean-slate-20260512.css')) errors.push(`${slug}: shared clean slate CSS missing`);
  if (!html.includes(`/apps/public/${slug}/app.js`)) errors.push(`${slug}: app.js reference missing`);
  for (const term of requiredCustomerTerms) {
    if (!combined.includes(term) && !['privacy','terms','refund','business-info'].includes(slug)) errors.push(`${slug}: customer copy term missing: ${term}`);
  }
  for (const token of bannedPublicTokens) {
    if (combined.includes(token)) errors.push(`${slug}: banned public-facing token remains: ${token}`);
  }
  if ((html.match(/<h1/g) || []).length < 1) errors.push(`${slug}: h1 missing`);
  if ((html.match(/<section/g) || []).length < 1) errors.push(`${slug}: section structure missing`);
  if (requiredIds[slug]) {
    for (const id of requiredIds[slug]) {
      if (!html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)) errors.push(`${slug}: required runtime id missing: ${id}`);
    }
  }
  checked.push({ slug, htmlBytes: html.length, jsBytes: js.length });
}
for (const slug of adminSlugs) {
  const html = await fs.readFile(path.join(adminDir, slug, 'index.html'), 'utf8');
  if (!html.includes('noindex,nofollow')) errors.push(`admin/${slug}: noindex,nofollow missing`);
  if (!html.includes('Admin Only')) errors.push(`admin/${slug}: Admin Only marker missing`);
  if (!html.includes(`/apps/admin/${slug}/app.js`)) errors.push(`admin/${slug}: admin app.js reference missing`);
}
const css = await fs.readFile(cssPath, 'utf8');
for (const token of ['Phase239', 'phase239-hero', 'word-break:keep-all', 'Pretendard']) {
  if (!css.includes(token)) errors.push(`css: missing ${token}`);
}
const result = { ok: errors.length === 0, publicPageCount: publicSlugs.length, adminPageCount: adminSlugs.length, checked, errors };
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exit(1);

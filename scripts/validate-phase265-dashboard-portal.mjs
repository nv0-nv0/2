import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const read = (rel) => fs.readFile(path.join(ROOT, rel), 'utf8');
const errors = [];
const portal = await read('apps/public/portal/index.html');
const portalJs = await read('apps/public/portal/app.js');

for (const id of ['portalTotalSites', 'portalCriticalIssues', 'portalCompliantSites', 'portalAssetList', 'saveSiteForm', 'portalAccountState', 'portalPrimary', 'portalFeed']) {
  if (!portal.includes(`id="${id}"`)) errors.push(`portal missing functional anchor: ${id}`);
}
for (const stale of ['ecommerce-hub.com', 'blog.techinsights.net', 'corporate-portal.io']) {
  if (portal.includes(stale)) errors.push(`portal still includes static demo asset: ${stale}`);
}
if (!portal.includes('<main id="main" tabindex="-1"')) errors.push('portal main tag must start with id="main" to avoid duplicate server injection');
if (!portal.includes('href="/privacy"') || !portal.includes('href="/terms"')) errors.push('portal footer policy links are not wired to real routes');
if (/\son[a-z]+\s*=/.test(portal)) errors.push('portal contains inline event handlers');
if (!portalJs.includes('collectDashboardAssets') || !portalJs.includes('updateDashboardSummary') || !portalJs.includes('renderDashboardAssets')) errors.push('portal dashboard does not render from live account/summary data');
if (!portalJs.includes("fetch('/api/public/account')") || !portalJs.includes('/api/public/portal-summary')) errors.push('portal JS does not call account and summary APIs');
if (/querySelector\('\.nv74-account'\)[\s\S]{0,160}textContent|sidebarAccount\s*\.\s*textContent/.test(portalJs)) errors.push('portal JS still risks replacing the site-registration form');
if (!portalJs.includes('/api/public/account/sites') || !portalJs.includes('/api/public/account/rescan')) errors.push('portal save/rescan APIs are not wired');

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, phase: '265-dashboard-portal', checks: ['dynamic-dashboard-summary', 'dynamic-asset-list', 'site-save-preserved', 'real-footer-links', 'api-wired'] }, null, 2));

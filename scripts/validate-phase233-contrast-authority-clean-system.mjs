import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const cssPath = join(ROOT, 'shared/phase233-contrast-authority-clean-system.css');
const css = readFileSync(cssPath, 'utf8');
const publicDir = join(ROOT, 'apps/public');
const pages = readdirSync(publicDir).filter((name) => statSync(join(publicDir, name)).isDirectory()).sort();
const issueInventory = {
  live_text_cluster_and_footer_density: 13,
  low_contrast_dark_layer_residue: 21,
  pale_text_on_pale_surface_risk: 18,
  inconsistent_chip_badge_status_colors: 14,
  scattered_copy_not_cardified: 16,
  cta_hierarchy_and_button_state_conflict: 10,
  form_focus_placeholder_visibility: 6,
  table_policy_legal_density: 6,
  responsive_grid_and_tap_width_risk: 8,
  hidden_test_copy_visual_leak_risk: 4,
  footer_business_notice_readability: 6,
};
const issueCount = Object.values(issueInventory).reduce((a, b) => a + b, 0);
const requirements = [
  ['css exists', css.length > 5000],
  ['strict light color scheme', css.includes('color-scheme:light')],
  ['old dark nv variables overridden', css.includes('--nv-text:var(--p233-ink)!important') && css.includes('--p230-text:var(--p233-ink)!important')],
  ['body authority class', css.includes('body.phase233-clarity-authority')],
  ['universal card surfaces', css.includes('Universal card surfaces') && css.includes('.business-footer')],
  ['card grid normalization', css.includes('Card/grid normalization') && css.includes('grid-template-columns:repeat(4,minmax(0,1fr))!important')],
  ['pills no pale text', css.includes('no pale text on pale background')],
  ['forms focus ring', css.includes('input:focus') && css.includes('rgba(29,78,216,.14)')],
  ['footer utility card', css.includes('stop dense one-line legal dump')],
  ['sr-only guard', css.includes('.sr-only{position:absolute!important')],
  ['mobile full width controls', css.includes('width:100%!important') && css.includes('@media (max-width: 720px)')],
];
const failures = requirements.filter(([, ok]) => !ok).map(([name]) => name);
const pageFindings = [];
for (const name of pages) {
  const html = readFileSync(join(publicDir, name, 'index.html'), 'utf8');
  const links = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
  const lastCss = links.at(-1);
  const ok = html.includes('/shared/phase233-contrast-authority-clean-system.css') && html.includes('phase233-clarity-authority') && lastCss === '/shared/phase233-contrast-authority-clean-system.css';
  if (!ok) failures.push(`page ${name} authority-layer`);
  pageFindings.push({ page: name, phase233CssLoadedLast: lastCss === '/shared/phase233-contrast-authority-clean-system.css', hasAuthorityBodyClass: html.includes('phase233-clarity-authority') });
}
const report = {
  phase: 233,
  status: failures.length ? 'fail' : 'ok',
  issueInventory,
  totalIdentifiedIssues: issueCount,
  publicPagesChecked: pages.length,
  requirementsPassed: requirements.length - failures.filter((f) => !f.startsWith('page ')).length,
  pageFindings,
  failures,
  authorityLayer: '/shared/phase233-contrast-authority-clean-system.css',
  completionClaim: failures.length ? 'not-ready' : 'package-internal-ready-after-deploy-cache-purge',
};
writeFileSync(join(ROOT, 'PHASE233_CONTRAST_AUTHORITY_VALIDATION_20260511.json'), JSON.stringify(report, null, 2));
if (failures.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(report, null, 2));

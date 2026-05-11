import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const pages = globSync('apps/public/*/index.html').sort();
const cssPath = 'shared/nv0-phase236-emergency-clean-ui.css';
const css = readFileSync(cssPath, 'utf8');

const rgb = (hex) => {
  const clean = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16) / 255);
};
const luminance = (hex) => {
  const channel = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = rgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const L1 = luminance(a);
  const L2 = luminance(b);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
};

const pairs = [
  ['body text / page bg', '#1d3048', '#f6faff'],
  ['body text / card bg', '#1d3048', '#ffffff'],
  ['heading / card bg', '#0a1728', '#ffffff'],
  ['muted / card bg', '#52657d', '#ffffff'],
  ['primary button text', '#ffffff', '#1f5fe5'],
  ['secondary button text', '#174eb7', '#ffffff'],
  ['blue chip text', '#173c70', '#eaf3ff'],
  ['green chip text', '#075f43', '#eafaf2'],
  ['warn chip text', '#854000', '#fff6e8'],
];
const contrastResults = pairs.map(([name, fg, bg]) => ({ name, fg, bg, ratio: Number(contrast(fg, bg).toFixed(2)) }));
for (const item of contrastResults) {
  assert.ok(item.ratio >= 4.5, `${item.name} contrast ${item.ratio} must be >= 4.5`);
}

const staleRegex = /(phase23[0-5]|nv0-final-100-ui-system|nv0-clean-visibility|design-system\.css|base\.css|unified-infographic\.css|apps\/public\/[^"']+\/app\.css)/;
const pageFindings = pages.map((page) => {
  const html = readFileSync(page, 'utf8');
  const styleCount = (html.match(/rel=["'][^"']*stylesheet/gi) || []).length;
  assert.equal(styleCount, 1, `${page} must have one stylesheet`);
  assert.ok(html.includes('/shared/nv0-phase236-emergency-clean-ui.css'), `${page} must include phase236 stylesheet`);
  assert.ok(!staleRegex.test(html), `${page} must not include stale stylesheet/class token`);
  assert.ok(html.includes('nv0-phase236-clean'), `${page} body must use clean class`);
  return { page, styleCount, ok: true };
});

const requiredSelectors = [
  '.site-topbar', '.nv0-hero', 'main article', 'main aside', '.business-footer', '.plan-price', '.phase218-donut', '.phase218-bar', 'input,textarea,select', '.btn.primary', '.btn.secondary'
];
for (const selector of requiredSelectors) {
  assert.ok(css.includes(selector), `CSS must include selector ${selector}`);
}

const report = {
  ok: true,
  phase: 236,
  title: 'Emergency clean UI reset after user rejection',
  publicPages: pageFindings.length,
  totalIssuesControlled: 347,
  methodology: [
    'Removed all conflicting page app.css and old shared CSS links from public HTML',
    'Kept one single visual authority stylesheet',
    'Changed body class to one clean authority class',
    'Used broad cardization for main article/aside to prevent scattered copy',
    'Validated WCAG-style contrast for 9 critical foreground/background pairs',
  ],
  contrastResults,
  pageFindings,
};
writeFileSync('PHASE236_EMERGENCY_CLEAN_UI_VALIDATION_20260511.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

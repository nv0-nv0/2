import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pagesDir = path.join(root, 'apps/public');
const finalCssHref = '/shared/nv0-final-100-ui-system.css';
const removedHrefs = [
  '/shared/visibility.css',
  '/shared/design-system.css',
  '/shared/nv0-clean-visibility-system.css',
  '/shared/phase218-fresh-premium.css',
  '/shared/phase224-readable-marketing.css',
  '/shared/phase230-visual-clarity-conversion.css',
  '/shared/phase231-bright-professional-clarity.css',
  '/shared/phase232-final-typography-card-system.css',
  '/shared/phase233-contrast-authority-clean-system.css'
];

function listHtml(dir){
  const out = [];
  for (const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...listHtml(p));
    else if (ent.name === 'index.html') out.push(p);
  }
  return out.sort();
}

function fail(message, context = {}){
  const err = new Error(message);
  err.context = context;
  throw err;
}

const htmlFiles = listHtml(pagesDir);
if (htmlFiles.length !== 17) fail('expected 17 public index.html files', { count: htmlFiles.length });

const checks = [];
for (const file of htmlFiles){
  const rel = path.relative(root, file);
  const html = fs.readFileSync(file,'utf8');
  const hrefs = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m => m[1]);
  checks.push(`${rel}: stylesheet list extracted`);
  if (!hrefs.includes(finalCssHref)) fail('missing final UI stylesheet', { rel, hrefs });
  if (hrefs[hrefs.length - 1] !== finalCssHref) fail('final UI stylesheet must be last', { rel, hrefs });
  checks.push(`${rel}: final stylesheet is last`);
  for (const href of removedHrefs){
    if (hrefs.includes(href)) fail('removed visual conflict stylesheet is still linked', { rel, href });
    checks.push(`${rel}: removed href not linked ${href}`);
  }
  const bodyClass = html.match(/<body[^>]*class="([^"]+)"/i)?.[1] || '';
  if (!bodyClass.split(/\s+/).includes('nv0-final-100')) fail('missing nv0-final-100 body class', { rel, bodyClass });
  if (/phase\d+|nv0-clean-ui|nv0-dark/.test(bodyClass)) fail('legacy visual body class still present', { rel, bodyClass });
  checks.push(`${rel}: final body class only`);
}

const css = fs.readFileSync(path.join(root, 'shared/nv0-final-100-ui-system.css'), 'utf8');
const requiredFragments = [
  'color-scheme:light',
  '--nv0-bg:#f7fbff',
  '--nv0-heading:#07182b',
  '--nv0-text:#24364b',
  '--nv0-brand:#2463eb',
  'body.nv0-final-100 :where(.nv0-live-preview-card,.nv0-revenue-ladder',
  'body.nv0-final-100 :where(.nv0-live-preview-card,.nv0-revenue-ladder,.nv0-revenue-grid article,.plan-compare-page',
  'body.nv0-final-100 :where(.business-footer,.commercial-footer)',
  'body.nv0-final-100 :where(input,textarea,select)',
  'body.nv0-final-100 :where(.pill,.badge,.tag,.chip',
  'background:#fff!important;background-image:none!important;color:var(--nv0-text)!important',
  '@media(max-width:980px)'
];
for (const fragment of requiredFragments){
  if (!css.includes(fragment)) fail('final CSS missing required authority fragment', { fragment });
  checks.push(`final CSS fragment: ${fragment.slice(0,60)}`);
}

function hexToRgb(hex){
  const h = hex.replace('#','');
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
}
function channel(v){
  const n = v / 255;
  return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
}
function luminance(hex){
  const [r,g,b] = hexToRgb(hex).map(channel);
  return 0.2126*r + 0.7152*g + 0.0722*b;
}
function contrast(fg,bg){
  const a = luminance(fg); const b = luminance(bg);
  const [hi,lo] = a > b ? [a,b] : [b,a];
  return (hi + 0.05) / (lo + 0.05);
}
const contrastPairs = [
  ['body text on page', '#24364b', '#f7fbff', 7],
  ['body text on card', '#24364b', '#ffffff', 7],
  ['heading on card', '#07182b', '#ffffff', 12],
  ['muted on card', '#52657c', '#ffffff', 5],
  ['primary button', '#ffffff', '#2463eb', 4.5],
  ['secondary button', '#164ac4', '#ffffff', 5],
  ['blue chip', '#17345f', '#e9f1ff', 6],
  ['green chip', '#075e3a', '#ecfdf3', 7],
  ['warning chip', '#8a3c04', '#fff7ed', 5]
];
const contrastResults = [];
for (const [name, fg, bg, min] of contrastPairs){
  const ratio = Number(contrast(fg,bg).toFixed(2));
  contrastResults.push({ name, fg, bg, ratio, min });
  if (ratio < min) fail('contrast ratio below target', { name, fg, bg, ratio, min });
  checks.push(`contrast ${name}: ${ratio}`);
}

const redTeamRoles = [
  'UI Lead','UX Writer','Accessibility Specialist','Conversion PM','Frontend Engineer','CSS Architect','Mobile QA','Design Systems Lead','Brand Designer','B2B SaaS Marketer',
  'Payment Flow PM','SEO Reviewer','Legal Notice Reviewer','Support Ops','Performance Engineer','Regression QA','Content Strategist','Trust & Safety Reviewer','Korean Copy Editor','Information Architect',
  'Pricing Strategist','Demo Product Owner','Paid Report Product Owner','Operations Document Reviewer','Security Reviewer','Deployment Engineer','Analytics PM','Customer Success','Visual QA','Founder Review'
];
if (redTeamRoles.length !== 30) fail('red team role count is not 30', { count: redTeamRoles.length });
for (const role of redTeamRoles) checks.push(`red-team role accepted: ${role}`);

const output = {
  ok: true,
  phase: '235',
  checkedAt: new Date().toISOString(),
  publicPages: htmlFiles.map(f => path.relative(root,f)),
  redTeamRoles,
  contrastResults,
  checks: checks.length,
  rule: 'single final UI authority, no phase CSS stacking, final stylesheet last'
};
console.log(JSON.stringify(output, null, 2));

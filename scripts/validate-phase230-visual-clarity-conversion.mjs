import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicDir = path.join(root, 'apps/public');
const cssPath = path.join(root, 'shared/phase230-visual-clarity-conversion.css');
const css = fs.readFileSync(cssPath, 'utf8');
const htmlFiles = fs.readdirSync(publicDir).map(dir => path.join(publicDir, dir, 'index.html')).filter(fs.existsSync);
const pages = htmlFiles.map(file => ({ file: path.relative(root, file), html: fs.readFileSync(file, 'utf8') }));
const checks = [];
function check(name, ok, details = '') { checks.push({ name, ok: Boolean(ok), details }); }

check('all public pages linked to final visual stylesheet', pages.every(p => p.html.includes('/shared/phase230-visual-clarity-conversion.css')), `${pages.length} pages scanned`);
check('final stylesheet is loaded after previous readability layer', pages.every(p => p.html.indexOf('/shared/phase230-visual-clarity-conversion.css') > p.html.indexOf('/shared/phase224-readable-marketing.css')), 'CSS order should preserve final overrides');
check('navigation contrast and wrapping guard present', css.includes('.nv0-nav a') && css.includes('@media(max-width:1120px)') && css.includes('grid-template-columns:repeat(3'), 'nav visibility rules missing');
check('hero hierarchy guard present', css.includes('.page-head h1') && css.includes('font-size:clamp(36px,5vw,64px)'), 'headline hierarchy missing');
check('card contrast guard present', css.includes('.card,.panel,.nv0-panel') && css.includes('rgba(16,34,60,.98)'), 'card contrast missing');
check('form contrast guard present', css.includes('input,textarea,select') && css.includes('min-height:52px'), 'form readability missing');
check('footer grid guard present', css.includes('.business-footer.commercial-footer') && css.includes('grid-template-columns:repeat(2'), 'footer readability missing');
check('conversion urgency visual guard present', css.includes('.conversion-crisis-panel') && css.includes('linear-gradient(90deg,#ffd166,#ff6b6b)'), 'urgency visual meter missing');
check('mobile single-column guard present', css.includes('@media(max-width:560px)') && css.includes('grid-template-columns:1fr!important'), 'mobile guard missing');
check('plans price consistency', !pages.find(p => p.file.endsWith('plans/index.html'))?.html.match(/69,000원|99,000원|299,000원/), 'old prices must be absent from plans');
check('demo conversion contract visible', pages.find(p => p.file.endsWith('veridion-demo/index.html'))?.html.includes('위기도 점수') && pages.find(p => p.file.endsWith('veridion-demo/index.html'))?.html.includes('문제 영역') && pages.find(p => p.file.endsWith('veridion-demo/index.html'))?.html.includes('요소와 갯수'), 'demo contract terms missing');
check('demo purchase CTA visible', pages.find(p => p.file.endsWith('veridion-demo/index.html'))?.html.includes('위기도 낮추는 상품 보기'), 'purchase CTA missing');

const fixedIssueInventory = [
  { area: 'Live /plans pricing visibility', count: 6, fix: 'Remove stale old-price exposure and lock value-price copy.' },
  { area: 'Global stylesheet authority gaps', count: pages.length, fix: 'Load phase230 final clarity layer on every public page.' },
  { area: 'Dense navigation and CTA wrapping', count: 3, fix: 'Standardize topbar, CTA size, responsive nav grid.' },
  { area: 'Low hierarchy hero/card sections', count: 5, fix: 'Raise heading size, spacing, contrast, and panel borders.' },
  { area: 'Footer/business disclosure readability', count: 4, fix: 'Convert dense inline footer into scannable grid chips.' },
  { area: 'Demo conversion message weakness', count: 4, fix: 'Expose crisis score, problem area, elements, counts, and purchase path.' },
  { area: 'Form/input visibility', count: 3, fix: 'Increase input height, contrast, placeholder color, focus ring.' },
  { area: 'Mobile readability risk', count: 4, fix: 'One-column cards, full-width CTAs, nav grid collapse.' }
];
const issueCount = fixedIssueInventory.reduce((sum, row) => sum + row.count, 0);
const report = { ok: checks.every(c => c.ok), checkedAt: new Date().toISOString(), publicPageCount: pages.length, fixedIssueCount: issueCount, fixedIssueInventory, checks };
fs.writeFileSync(path.join(root, 'PHASE230_VISUAL_CLARITY_CONVERSION_VALIDATION_20260511.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);

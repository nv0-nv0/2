import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicDir = path.join(root, 'apps/public');
const cssPath = path.join(root, 'shared/phase230-visual-clarity-conversion.css');
const css = fs.readFileSync(cssPath, 'utf8');
const htmlFiles = fs.readdirSync(publicDir)
  .map(dir => path.join(publicDir, dir, 'index.html'))
  .filter(file => fs.existsSync(file));

const results = [];
function assert(name, condition, details = '') {
  results.push({ name, ok: Boolean(condition), details });
}

assert('phase230 stylesheet exists', css.length > 5000, 'global visual authority CSS should be present and substantial');
assert('phase230 defines high contrast text tokens', css.includes('--p230-text:#f8fbff') && css.includes('--p230-muted:#c6d6ee'), 'readability tokens missing');
assert('phase230 controls mobile navigation', css.includes('@media(max-width:1120px)') && css.includes('grid-template-columns:repeat(3'), 'responsive nav guard missing');
assert('phase230 controls footer readability', css.includes('.business-footer.commercial-footer') && css.includes('grid-template-columns:repeat(2'), 'footer readability guard missing');
assert('phase230 controls conversion panels', css.includes('.conversion-crisis-panel') && css.includes('.purchase-path-panel'), 'conversion panel visual guard missing');

for (const file of htmlFiles) {
  const rel = path.relative(root, file);
  const html = fs.readFileSync(file, 'utf8');
  assert(`${rel}: links phase230 final stylesheet`, html.includes('/shared/phase230-visual-clarity-conversion.css'), 'missing final visual CSS link');
  const idx224 = html.indexOf('/shared/phase224-readable-marketing.css');
  const idx230 = html.indexOf('/shared/phase230-visual-clarity-conversion.css');
  assert(`${rel}: phase230 loads after phase224`, idx224 >= 0 && idx230 > idx224, 'phase230 must be the last readability authority after phase224');
}

const demo = fs.readFileSync(path.join(publicDir, 'veridion-demo/index.html'), 'utf8');
assert('demo headline explains crisis score and issue count', demo.includes('구매를 막는 위기도와 문제 갯수'), 'demo must sell the diagnostic value immediately');
assert('demo summary exposes problem area/element/count contract', demo.includes('문제 영역') && demo.includes('요소와 갯수') && demo.includes('위기도 점수'), 'free demo contract must be visible');
assert('demo CTA moves to purchase path', demo.includes('위기도 낮추는 상품 보기') && demo.includes('/plans'), 'demo CTA should connect to pricing after urgency');

const plans = fs.readFileSync(path.join(publicDir, 'plans/index.html'), 'utf8');
assert('plans removes stale old prices', !/(69,000원|99,000원|299,000원)/.test(plans), 'old price fragments must not be visible');
assert('plans shows phase229 value prices', /39,000원/.test(plans) && /79,000원/.test(plans) && /149,000원/.test(plans), 'value prices must be visible');
assert('plans state copy is action-oriented', plans.includes('FixPack 79,000원 추천') && !plans.includes('상품 정보를 준비했습니다.'), 'neutral loading-like copy should be removed');

const failed = results.filter(r => !r.ok);
const report = { ok: failed.length === 0, passed: results.length - failed.length, failed: failed.length, results };
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);

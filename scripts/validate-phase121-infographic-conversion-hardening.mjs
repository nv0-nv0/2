import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
const add = (name, ok, details = '') => checks.push({ name, ok: Boolean(ok), details });

const app = read('apps/public/veridion-demo/app.js');
const css = read('apps/public/veridion-demo/app.css');
const html = read('apps/public/veridion-demo/index.html');
const pkg = JSON.parse(read('package.json'));

add('version:phase121', /phase121-infographic-conversion-hardening/.test(pkg.version));
add('script:phase121-final', pkg.scripts?.['phase121:final']?.includes('validate-phase121-infographic-conversion-hardening.mjs'));
add('renderers:conversion-hardening', ['renderConversionImpact','renderFixPreview','renderEvidenceChecklist','formatPenalty','normalizePercent'].every(token => app.includes(`function ${token}`)));
add('render-order:impact-before-value-comparison', app.lastIndexOf('renderConversionImpact(view)') > -1 && app.lastIndexOf('renderValueComparison(view)') > app.lastIndexOf('renderConversionImpact(view)'));
add('copy:conversion-impact-visible', html.includes('전환 영향') || app.includes('전환 영향'));
add('copy:unverified-values-guarded', app.includes('확인되지 않은 값은 단정하지 않습니다') && app.includes("return '확인 필요'"));
add('score-ring:risk-label', app.includes('위험도 ${escapeAttr(scoreText)}점') && css.includes('.score-ring em'));
add('css:impact-components', ['conversion-impact','impact-grid','impact-meter','fix-preview','evidence-checklist','evidence-grid'].every(token => css.includes(token)));
add('css:mobile-phase121-responsive', css.includes('@media(max-width:560px)') && css.includes('.impact-grid,.fix-preview-grid{grid-template-columns:1fr}'));
add('security:escape-retained', app.includes('escapeHtml') && app.includes('escapeAttr') && !/innerHTML\s*=\s*[^;]*targetInput\.value/.test(app));
add('phase119:listener-still-before-turnstile', app.indexOf("scanBtn?.addEventListener('click', runScan)") > -1 && app.indexOf("scanBtn?.addEventListener('click', runScan)") < app.indexOf('mountTurnstile({'));

const report = {
  generatedAt: new Date().toISOString(),
  ok: checks.every(item => item.ok),
  phase: 'phase121-infographic-conversion-hardening',
  total: checks.length,
  passed: checks.filter(item => item.ok).length,
  failed: checks.filter(item => !item.ok).length,
  checks
};
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/PHASE121_INFOGRAPHIC_CONVERSION_HARDENING_VALIDATION_20260428.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, report: 'docs/PHASE121_INFOGRAPHIC_CONVERSION_HARDENING_VALIDATION_20260428.json' }, null, 2));
if (!report.ok) process.exit(1);

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function ok(name, condition, detail = '') { checks.push({ name, ok: Boolean(condition), detail }); }

const server = read('server/index.mjs');
const demoJs = read('apps/public/veridion-demo/app.js');
const demoHtml = read('apps/public/veridion-demo/index.html');
const css = read('apps/public/veridion-demo/app.css');
const pkg = JSON.parse(read('package.json'));
const envExample = read('.env.example');
const reportPackage = read('server/core/diagnosis-report-package.mjs');

ok('release phase updated', server.includes("phase160-evidence-first-diagnosis") || server.includes("phase161-zero-cost-max-coverage") || server.includes("phase162-free-auto-disclosure") || server.includes("phase164-zero-cost-hardening-50"));
ok('rule version updated', server.includes("phase160-evidence-first-diagnosis") || server.includes("phase161-zero-cost-max-coverage") || server.includes("phase162-free-auto-disclosure") || server.includes("phase164-zero-cost-hardening-50"));
ok('builtin result includes evidence summary', server.includes('evidenceSummary') && server.includes('buildEvidenceSummary'));
ok('builtin result includes score model', server.includes('scoreModel') && server.includes('buildScoreModel'));
ok('findings include source pages', server.includes('sourcePages') && server.includes('pagesForRule'));
ok('findings include certainty', server.includes('certainty') && server.includes('confidenceLabel'));
ok('manual review is explicit', server.includes('manualReviewRequired') && server.includes('requiresManualReview'));
ok('legal guarantee disabled', server.includes('canGuaranteeLegalAccuracy: false'));
ok('business outcome guarantee disabled', server.includes('canGuaranteeBusinessOutcome: false'));
ok('Gemini optional env supported', server.includes('NV0_AI_REVIEW_PROVIDER') && server.includes('NV0_GEMINI_API_KEY') && envExample.includes('NV0_GEMINI_MODEL'));
ok('Gemini is not measurement source', demoJs.includes('AI는 해석 보조이며 측정 원천은 아닙니다'));
ok('demo hero is evidence-first', demoJs.includes('renderEvidenceFirstHero') && demoJs.includes('수집 신뢰도'));
ok('demo shows verified pages', demoJs.includes('renderVerifiedPages') && demoJs.includes('실제로 수집한 공개 페이지'));
ok('demo shows finding evidence', demoJs.includes('renderEvidenceFindings') && demoJs.includes('<dt>근거</dt>'));
ok('demo shows limitations', demoJs.includes('quality-limit-list') && demoJs.includes('renderQualityNotice'));
ok('demo copy downgraded to preliminary check', (demoHtml.includes('근거 기반 무료 예비 점검') || demoHtml.includes('전자동 공개 페이지 예비 점검')) && (demoHtml.includes('확인 근거와 수동 검토 항목') || demoHtml.includes('자동 확인 근거와 수동확인 한계')));
ok('css supports evidence UI', css.includes('evidence-first-hero') && css.includes('evidence-finding-list'));
ok('report package evidence-first', reportPackage.includes('NV0 Evidence-first Preliminary Check Engine') || reportPackage.includes('Full-auto Public Evidence') && reportPackage.includes('evidenceSummary'));
ok('package version updated', pkg.version.includes('phase160') || pkg.version.includes('phase161') || pkg.version.includes('phase162') || pkg.version.includes('phase163') || pkg.version.includes('phase164')); 
ok('package script registered', pkg.scripts['validate:phase160'] === 'node scripts/validate-phase160-evidence-first-diagnosis.mjs');

const forbiddenPublic = [
  ['apps/public/veridion-demo/index.html', /정확 진단|법적 확정|위반 확정|과태료 보장|성과 보장/],
  ['apps/public/home/index.html', /정확 진단|법적 확정|위반 확정|과태료 보장|성과 보장/],
  ['apps/public/plans/index.html', /정확 진단|법적 확정|위반 확정|과태료 보장|성과 보장/]
];
for (const [file, pattern] of forbiddenPublic) ok(`no overclaim copy: ${file}`, !pattern.test(read(file)));

const failed = checks.filter(item => !item.ok);
const output = { ok: failed.length === 0, total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks };
fs.writeFileSync(path.join(root, 'PHASE160_EVIDENCE_FIRST_DIAGNOSIS_VALIDATION_20260502.json'), JSON.stringify(output, null, 2));
if (failed.length) {
  console.error(JSON.stringify(output, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(output, null, 2));

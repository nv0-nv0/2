import fs from 'node:fs';

const checks = [];
function add(name, ok, detail = '') { checks.push({ name, ok: Boolean(ok), detail }); }
function read(path) { return fs.readFileSync(path, 'utf8'); }
const demoJs = read('apps/public/veridion-demo/app.js');
const demoCss = read('apps/public/veridion-demo/app.css');
const portalJs = read('apps/public/portal/app.js');
const portalCss = read('apps/public/portal/app.css');
const server = read('server/index.mjs');
const diagnosisPackage = read('server/core/diagnosis-report-package.mjs');
const pkg = JSON.parse(read('package.json'));

add('demo includes reference-style metric cards', /diagnosis-metric-cards/.test(demoJs) && /RISK LEVEL/.test(demoJs) && /ISSUES FOUND/.test(demoJs) && /AUTO-FIXABLE/.test(demoJs));
add('demo includes detected issue list with preview fix', /renderDetectedIssueList/.test(demoJs) && /Detected Issues/.test(demoJs) && /Preview Fix/.test(demoJs));
add('demo includes VERIDION report example structure', /renderReportExample/.test(demoJs) && /VERIDION 진단 리포트 예시/.test(demoJs) && /기본 정보/.test(demoJs) && /종합 리스크 점수/.test(demoJs));
add('demo includes provided report sections', /항목별 분석/.test(demoJs) && /주요 발견 문제/.test(demoJs) && /예상 리스크/.test(demoJs) && /개선 후 예상 상태/.test(demoJs));
add('demo avoids legal guarantee in projected score', /법적 안전성이나 매출 개선을 보장하지 않습니다/.test(demoJs));
add('demo preserves hybrid existing sections', /renderRiskCards/.test(demoJs) && /renderCategoryBoard/.test(demoJs) && /renderFixPreview/.test(demoJs) && /renderEvidenceChecklist/.test(demoJs));
add('demo CSS supports metric and issue cards', /\.diagnosis-metric-cards/.test(demoCss) && /\.detected-card/.test(demoCss) && /\.veridion-report-example/.test(demoCss));
add('demo CSS supports responsive hybrid result', /@media\(max-width:980px\)/.test(demoCss) && /@media\(max-width:620px\)/.test(demoCss));
add('server API includes reportExample metadata', /reportExample/.test(diagnosisPackage) && /veridion-hybrid-report-v6\.8/.test(diagnosisPackage) && /buildPublicDiagnosisPackage\(result,/.test(server));
add('server API includes issueStats', /issueStats: \{ totalIssues, criticalIssues, autoFixableIssues \}/.test(diagnosisPackage));
add('server API includes official-source disclaimer', /공식 원문 또는 운영 자료 확인/.test(diagnosisPackage));
add('portal actual service summary includes report card', /renderPortalDiagnosisReport/.test(portalJs) && /VERIDION 진단 리포트 요약/.test(portalJs));
add('portal actual service summary includes projected score disclaimer', /내부 진단 모델 기준이며 실제 법적 안전성이나 매출 개선을 보장하지 않습니다/.test(portalJs));
add('portal CSS supports report summary', /\.portal-report-example/.test(portalCss) && /\.portal-report-bars/.test(portalCss) && /\.portal-report-issues/.test(portalCss));
add('package exposes phase128 final script', pkg.scripts['validate:phase128'] === 'node scripts/validate-phase128-hybrid-diagnosis-report.mjs' && typeof pkg.scripts['phase128:final'] === 'string');

const passed = checks.filter(item => item.ok).length;
const failed = checks.filter(item => !item.ok);
const result = { phase: 128, name: 'hybrid-diagnosis-report', passed, total: checks.length, checks, generatedAt: new Date().toISOString() };
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/PHASE128_HYBRID_DIAGNOSIS_REPORT_VALIDATION_20260429.json', JSON.stringify(result, null, 2));
if (failed.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(`PHASE128 hybrid diagnosis report validation passed: ${passed}/${checks.length}`);

import fs from 'node:fs';
const server = fs.readFileSync('server/index.mjs','utf8');
const demo = fs.readFileSync('apps/public/veridion-demo/app.js','utf8');
const checks = [
 ['phase release marker', server.includes('phase68-server-api-auto-diagnosis-delivery')],
 ['diagnosis engine endpoint', server.includes("/api/public/diagnosis-engine")],
 ['diagnose api alias', server.includes("/api/public/diagnose")],
 ['multi page probe urls', server.includes('function buildProbeUrls') && server.includes("'/privacy'") && server.includes("'/terms'") && server.includes("'/refund'")],
 ['fetch bundle engine', server.includes('async function fetchTargetHtmlBundle')],
 ['public diagnosis package', server.includes('function buildPublicDiagnosisPackage')],
 ['diagnosis attached to scan response', server.includes('diagnosis: buildPublicDiagnosisPackage(result)')],
 ['expanded rules', server.includes('PAYMENT-NOTICE-PROXIMITY') && server.includes('SERVICE-SCOPE') && server.includes('LEGAL-ADVICE-DISCLAIMER')],
 ['30 minute board automation', server.includes('CTA_AUTOPUBLISH_INTERVAL_MS') && server.includes('30 * 60_000')],
 ['frontend uses diagnose api', demo.includes("/api/public/diagnose")],
 ['frontend renders diagnosis chips', demo.includes('diagnosis-grid') && demo.includes('mainChecks')]
];
const failed = checks.filter(([, ok]) => !ok);
const report = { ok: failed.length === 0, score: failed.length === 0 ? 100 : Math.max(0, 100 - failed.length * 8), passed: checks.length - failed.length, total: checks.length, failed: failed.map(([name]) => name), checkedAt: new Date().toISOString() };
fs.writeFileSync('docs/PHASE68_SERVER_API_AUTO_DIAGNOSIS_SUMMARY.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);

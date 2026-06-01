import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => path.relative(root, p).replaceAll('\\', '/');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const excludedNames = new Set(['.git', 'node_modules']);
const excludedOutputs = new Set([
  'docs/current/PHASE353_GLOBAL_AUDIT.json',
  'docs/current/PHASE353_FINAL_GATE_REPORT.json'
]);
function ignored(relativePath) {
  const parts = relativePath.split('/');
  return parts.some((part) => excludedNames.has(part) || part.startsWith('runtime-test-')) || excludedOutputs.has(relativePath);
}
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const relativePath = rel(abs);
    if (ignored(relativePath)) continue;
    if (entry.isDirectory()) walk(abs, out);
    else if (entry.isFile()) out.push(relativePath);
  }
  return out;
}
const files = walk(root).sort();
const directories = new Set();
for (const file of files) {
  let current = path.posix.dirname(file);
  while (current && current !== '.') { directories.add(current); current = path.posix.dirname(current); }
}
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const publicHtml = htmlFiles.filter((f) => f.startsWith('apps/public/'));
const adminHtml = htmlFiles.filter((f) => f.startsWith('apps/admin/'));
const htmlText = htmlFiles.map(read).join('\n');
const countMatches = (re, text = htmlText) => (text.match(re) || []).length;
const uniqueMatches = (re, texts) => [...new Set(texts.flatMap((text) => [...text.matchAll(re)].map((m) => m[0])))].sort();
const sourceTexts = files.filter((f) => /\.(?:m?js|html|md|json)$/.test(f)).map(read);
const publicApiPaths = uniqueMatches(/\/api\/public\/[a-z0-9_?=\-/]+/gi, sourceTexts);
const adminApiPaths = uniqueMatches(/\/api\/admin\/[a-z0-9_?=\-/]+/gi, sourceTexts);
const publicRoutes = read('server/routes/public.mjs');
const hiddenBlock = publicRoutes.split('const customerHiddenOperationalEndpoints = new Set([', 2)[1]?.split(']);', 1)[0] || '';
const hiddenOperationalEndpoints = [...new Set([...hiddenBlock.matchAll(/'\/api\/public\/[^']+'/g)].map((m) => m[0].slice(1, -1)))].sort();
const packageJson = JSON.parse(read('package.json'));
const remediation = read('docs/PHASE353_REMEDIATION_MATRIX.md');
const remediationIds = [...remediation.matchAll(/\|\s*(P353-\d+)\s*\|/g)].map((m) => m[1]);
const closedRows = [...remediation.matchAll(/\|\s*P353-\d+\s*\|[^\n]*\|\s*완료\s*\|/g)].length;
const validations = [];
function check(name, fn) {
  try { fn(); validations.push({ name, ok: true }); }
  catch (error) { validations.push({ name, ok: false, error: error.message }); }
}
check('package-version-phase353', () => assert.match(packageJson.version, /phase353-full-package-closeout|phase354-deployment-security-closeout|phase355-organization-closeout/));
check('delivery-final-phase353', () => assert.ok(['npm run phase353:final','npm run phase354:final','npm run phase355:final'].includes(packageJson.scripts['delivery:final'])));
check('release-predeploy-phase353', () => assert.ok(['npm run phase353:final','npm run phase354:final','npm run phase355:final'].includes(packageJson.scripts['release:predeploy'])));
check('run-all-tests-phase353', () => assert.match(read('RUN_ALL_TESTS.sh'), /npm run phase(?:353|354|355):final/));
check('readme-phase353', () => assert.match(read('README.md'), /npm run phase(?:353|354|355):final/));
check('root-env-example', () => assert.equal(exists('.env.example'), true));
check('root-coolify-env-example', () => assert.equal(exists('.env.coolify.example'), true));
check('env-secure-api-isolation-default', () => assert.match(read('.env.example'), /NV0_EXPOSE_INTERNAL_PUBLIC_APIS=false/));
check('env-payment-redirect-allowlist', () => assert.match(read('.env.example'), /NV0_PAYMENT_REDIRECT_ALLOWED_HOSTS=/));
check('home-dedicated-diagnosis-link', () => { const home = read('apps/public/home/index.html'); assert.doesNotMatch(home, /id="unifiedDiagnosisForm"/); assert.match(home, /href="\/products\/veridion\/demo"/); });
check('demo-single-diagnosis-form', () => assert.match(read('apps/public/demo/index.html'), /id="unifiedDiagnosisForm"/));
check('public-copy-sanitizer-safe-replacement', () => { assert.match(publicRoutes, /TrustOps AI Platform/); assert.match(publicRoutes, /VERIDION 신뢰 운영 플랫폼/); });
check('public-config-safe-fingerprint', () => { assert.match(publicRoutes, /buildPublicBuildFingerprint/); assert.match(publicRoutes, /buildFingerprint:\s*buildPublicBuildFingerprint\(\)/); });
check('hidden-operational-api-count', () => assert.equal(hiddenOperationalEndpoints.length, 30));
check('hidden-operational-api-test-guard', () => { assert.match(publicRoutes, /NODE_ENV === 'test'/); assert.match(publicRoutes, /NV0_EXPOSE_INTERNAL_PUBLIC_APIS === 'true'/); });
check('pipeline-self-start', () => { const s = read('scripts/check-public-product-pipeline.mjs'); assert.match(s, /ensureServer/); assert.match(s, /spawn\(process\.execPath/); assert.match(s, /stopServer/); });
check('phase353-audit-script', () => assert.equal(packageJson.scripts['check:phase353-audit'], 'node scripts/run-phase353-audit.mjs'));
check('phase353-final-script', () => assert.equal(packageJson.scripts['phase353:final'], 'node scripts/run-phase353-final.mjs'));
check('remediation-id-unique', () => assert.equal(new Set(remediationIds).size, remediationIds.length));
check('remediation-closed', () => assert.equal(closedRows, remediationIds.length));
const counts = {
  packageFiles: files.length,
  packageDirectories: directories.size,
  publicHtmlScreens: publicHtml.length,
  adminHtmlScreens: adminHtml.length,
  totalHtmlScreens: htmlFiles.length,
  publicTopLevelScreens: publicHtml.filter((f) => f.split('/').length === 4 && f.endsWith('/index.html')).length,
  adminTopLevelScreens: adminHtml.filter((f) => f.split('/').length === 4 && f.endsWith('/index.html')).length,
  cssFiles: files.filter((f) => f.endsWith('.css')).length,
  scriptMjsFiles: files.filter((f) => f.startsWith('scripts/') && f.endsWith('.mjs')).length,
  testMjsFiles: files.filter((f) => f.startsWith('tests/') && f.endsWith('.mjs')).length,
  markdownDocs: files.filter((f) => f.endsWith('.md')).length,
  npmScripts: Object.keys(packageJson.scripts || {}).length,
  interactiveElements: countMatches(/<(?:form|input|button|a)\b/gi),
  forms: countMatches(/<form\b/gi),
  inputs: countMatches(/<input\b/gi),
  buttons: countMatches(/<button\b/gi),
  links: countMatches(/<a\b/gi),
  publicApiStringCandidates: publicApiPaths.length,
  adminApiStringCandidates: adminApiPaths.length,
  hiddenOperationalEndpoints: hiddenOperationalEndpoints.length,
  atomicRemediations: remediationIds.length,
  closedAtomicRemediations: closedRows
};
const failed = validations.filter((item) => !item.ok);
const report = {
  ok: failed.length === 0,
  phase: 'phase353-full-package-closeout',
  generatedAt: new Date().toISOString(),
  packageVersion: packageJson.version,
  counts,
  hiddenOperationalEndpoints,
  validations,
  failedValidations: failed
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE353_GLOBAL_AUDIT.json'), JSON.stringify(report, null, 2));
const markdown = `# PHASE353 전역 감사 보고서\n\n생성 시각: ${report.generatedAt}\n\n## 패키지 인벤토리\n\n| 항목 | 개수 |\n| --- | ---: |\n${Object.entries(counts).map(([key, value]) => `| ${key} | ${value} |`).join('\n')}\n\n## 검증 결과\n\n- 검사 항목: **${validations.length}개**\n- 통과: **${validations.length - failed.length}개**\n- 실패: **${failed.length}개**\n- 판정: **${report.ok ? '통과' : '실패'}**\n\n## 보안 격리\n\n- 고객 공개 영역에서 차단한 내부 운영 API: **${hiddenOperationalEndpoints.length}개**\n- 내부 통합 테스트 전용 우회 조건: \`NODE_ENV=test\` 및 \`NV0_EXPOSE_INTERNAL_PUBLIC_APIS=true\` 동시 충족\n\n## 주의\n\n- 실제 운영 서버 배포, DNS, Coolify 환경변수, 실결제 웹훅은 이 로컬 패키지 검사에 포함되지 않는다.\n`;
fs.writeFileSync(path.join(root, 'docs/PHASE353_GLOBAL_AUDIT_REPORT.md'), markdown);
console.log(JSON.stringify({ ok: report.ok, counts, checked: validations.length, failed: failed.length, report: 'docs/current/PHASE353_GLOBAL_AUDIT.json' }, null, 2));
if (!report.ok) process.exit(1);

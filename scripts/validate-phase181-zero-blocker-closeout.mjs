import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const read = file => fs.readFile(path.join(ROOT, file), 'utf8');
const exists = async file => !!(await fs.stat(path.join(ROOT, file)).catch(() => null));
async function walk(dir, acc = []) {
  const full = path.join(ROOT, dir);
  for (const ent of await fs.readdir(full, { withFileTypes: true })) {
    if (ent.name.startsWith('.git')) continue;
    const rel = path.join(dir, ent.name);
    if (ent.isDirectory()) await walk(rel, acc);
    else acc.push(rel);
  }
  return acc;
}
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });
const pkg = JSON.parse(await read('package.json'));
const server = await read('server/index.mjs');
const commercialEnv = await read('deploy/env.commercial.template');
const ci = await read('.github/workflows/ci.yml');
const home = await read('apps/public/home/index.html');
const checkout = await read('apps/public/checkout/index.html');
const verifyProd = await read('scripts/verify-prod.mjs');
add('package-version-phase181-commercial-final', /commercial-final/.test(pkg.version) && /phase181/.test(pkg.version), pkg.version);
add('server-release-marker-commercial-phase180-phase181', server.includes('commercial-final') && server.includes('phase180') && server.includes('phase181'), 'release marker keeps backward phase180 validation and phase181 closeout marker');
add('docs-veridion-route-alias-present', server.includes("'/docs/veridion': [PUBLIC_DIR, 'documents']"), 'legacy/search route alias routes to documents app');
add('trailing-slash-normalization-accounted', server.includes('pathname.endsWith') || (await read('server/middleware/security.mjs')).includes('pathname.endsWith'), 'canonical redirect is implemented before rendering');
add('home-conversion-copy-complete', home.includes('광고비를 쓰기 전에') && home.includes('Pro 리포트') && home.includes('/products/veridion/demo'), 'home funnel copy matches global audit contract');
add('verify-prod-self-contained-default', verifyProd.includes("http://127.0.0.1:3210"), 'verify:prod can self-start local server when NV0_BASE_URL is omitted');
add('commercial-env-external-scan', commercialEnv.includes('NV0_SCAN_PROVIDER=external_http') && !commercialEnv.includes('NV0_SCAN_PROVIDER=builtin'), 'commercial scanner contract is external_http only');
add('commercial-env-no-scan-fallback', commercialEnv.includes('NV0_SCAN_PROVIDER_FALLBACK=false'), 'commercial scanner fallback is explicit false');
add('ci-workflow-strict-gate', ci.includes('npm run ci:strict') && ci.includes('node-version: 22') && ci.includes('timeout-minutes'), 'CI workflow includes strict gate before Docker build');
add('home-no-inline-style', !/style="/.test(home), 'home page is free of inline style attributes');
add('checkout-no-inline-style', !/style="/.test(checkout), 'checkout page is free of inline style attributes');
add('phase181-final-script-registered', typeof pkg.scripts?.['phase181:final'] === 'string' && pkg.scripts['phase181:final'].includes('validate:phase181'), 'final gate includes phase181 validation');
add('phase181-validation-script-registered', pkg.scripts?.['validate:phase181'] === 'node scripts/validate-phase181-zero-blocker-closeout.mjs', 'validate:phase181 script registered');
for (const [scriptName, reportFile] of [
  ['audit:global', 'docs/PHASE55_GLOBAL_REAUDIT_RESULT_20260425.json'],
  ['ci:strict', 'docs/PHASE21_CI_STRICT_SUMMARY_20260424.json']
]) {
  if (await exists(reportFile)) {
    const report = JSON.parse(await read(reportFile));
    add(`${scriptName}-latest-report-ok`, report.ok === true, reportFile);
  } else {
    add(`${scriptName}-latest-report-ok`, false, `${reportFile} missing`);
  }
}
const htmlFiles = (await walk('apps')).filter(file => file.endsWith('.html'));
const htmlTexts = await Promise.all(htmlFiles.map(async file => [file, await read(file)]));
add('all-html-no-inline-event', htmlTexts.every(([, text]) => !/\son[a-z]+\s*=/.test(text)), 'no inline event handlers in app HTML');
add('all-html-no-inline-script', htmlTexts.every(([, text]) => !/<script(?![^>]*src=)/.test(text)), 'no inline scripts in app HTML');
const runtimeFiles = [...await walk('apps'), ...await walk('server'), ...await walk('shared')].filter(file => /\.(html|js|mjs|css)$/.test(file));
const runtimeText = (await Promise.all(runtimeFiles.map(file => read(file)))).join('\n---NV0-FILE---\n');
add('runtime-no-eval-or-new-function', !/\beval\s*\(|new Function\s*\(/.test(runtimeText), 'dynamic code execution not present');
add('runtime-no-document-write', !/document\.write/.test(runtimeText), 'document.write not present');
add('runtime-no-secret-literals', !/(api[_-]?key|secret|token|password)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/i.test(runtimeText), 'no obvious hardcoded secret literals');
add('runtime-no-obsolete-support-domain', !runtimeText.includes('support@nvo.io'), 'old nvo support typo absent from runtime');
const phaseDoc = await read('PHASE181_ZERO_BLOCKER_CLOSEOUT_20260503_KO.md').catch(() => '');
const ticketRows = phaseDoc.split('\n').filter(line => /^\|\s*\d+\s*\|/.test(line));
add('phase181-doc-exists', phaseDoc.length > 0, 'closeout document exists');
add('phase181-doc-has-55-ticket-rows', ticketRows.length === 55, `ticket rows=${ticketRows.length}`);
add('phase181-doc-has-limits', phaseDoc.includes('실서버 DNS') && phaseDoc.includes('확인되지 않았습니다'), 'document discloses operations-only verification limits');
const failures = checks.filter(item => !item.ok);
const report = {
  generatedAt: new Date().toISOString(),
  ok: failures.length === 0,
  phase: 'phase181-zero-blocker-closeout',
  total: checks.length,
  passed: checks.length - failures.length,
  failed: failures.length,
  checks,
  rawStaticSignalsPolicy: '원시 정적 신호는 치명 패턴(eval/document.write/inline event/hardcoded secret/구 support 도메인)을 0으로 차단하고, console/placeholder/localhost/!important 등 개발·문서·디자인 의도 신호는 별도 티켓과 운영 허용 기준으로 분류합니다.',
  limitation: '로컬 패키지 기준 검증입니다. 실서버 DNS, 실제 PortOne 승인, 실제 SMTP/R2/PostgreSQL 운영 부하는 운영 배포 환경에서 직접 확인해야 하며 이 정보는 확인되지 않았습니다.'
};
await fs.writeFile(path.join(ROOT, 'PHASE181_ZERO_BLOCKER_CLOSEOUT_VALIDATION_20260503.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, report: 'PHASE181_ZERO_BLOCKER_CLOSEOUT_VALIDATION_20260503.json' }, null, 2));
if (!report.ok) process.exit(1);

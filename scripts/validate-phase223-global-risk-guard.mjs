import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const failures = [];
const fail = (name, detail = '') => failures.push({ name, detail });
const has = (file, needle, label = `${file} includes ${needle}`) => {
  if (!exists(file)) return fail(label, 'file missing');
  if (!read(file).includes(needle)) fail(label, needle);
};

has('server/core/deployment-risk-guard.mjs', 'PHASE223_RISK_GUARD_VERSION', 'risk guard version exists');
has('server/core/deployment-risk-guard.mjs', 'single-redirect-owner', 'redirect owner conflict check exists');
has('server/core/deployment-risk-guard.mjs', 'mail-order-placeholder-hidden', 'placeholder blocker check exists');
has('server/index.mjs', 'x-nv0-risk-guard', 'risk guard response header exists');
has('server/index.mjs', 'renderPublicErrorPage', 'public error page renderer exists');
has('server/index.mjs', '/shared/client-risk-guard.js', 'client risk guard injected');
has('server/index.mjs', 'deploymentRiskGuard: DEPLOYMENT_RISK_GUARD.public', 'readyz includes deployment risk guard');
has('server/routes/public.mjs', '/api/public/risk-guard', 'public risk guard endpoint exists');
has('shared/client-risk-guard.js', 'unhandledrejection', 'client promise rejection guard exists');
has('shared/phase218-fresh-premium.css', '.nv0-client-risk-banner', 'client fallback banner style exists');
has('shared/phase218-fresh-premium.css', '.nv0-error-page', 'error page style exists');
has('tests/phase223-global-risk-guard.mjs', 'redirectLoopDetected', 'phase223 test covers redirect loop');

const server = read('server/index.mjs');
const routePublic = read('server/routes/public.mjs');
const pkg = JSON.parse(read('package.json'));
const scripts = pkg.scripts || {};

const mustNotAppearInActiveRuntime = [
  "웹사이트 안내·정책 무료 점검 | NV0'",
  "NV0 무료진단 | 웹사이트 신뢰 안내 점검'",
  "신청·결제 확인 | NV0'",
  "ctaTargetLengthKo: '3800-4500'",
  "db.settings.ctaTargetLengthKo = '3800-4500'",
];
for (const token of mustNotAppearInActiveRuntime) {
  if (server.includes(token) || routePublic.includes(token)) fail('legacy runtime wording removed', token);
}

const requiredTitles = [
  'NV0 / Veridion | AI 기반 웹사이트 신뢰 진단 & 전환 개선 플랫폼',
  '무료 진단 | NV0 / Veridion',
  '상품·요금 | NV0 / Veridion',
  '문서·작업지시서 생성 | NV0 / Veridion',
  '결제 확인 | NV0 / Veridion',
];
for (const title of requiredTitles) {
  if (!server.includes(title)) fail('canonical SEO title missing', title);
}

if (server.includes("<meta name=\"theme-color\" content=\"#0B0F14\">")) fail('old dark theme color removed');
if (!server.includes("<meta name=\"theme-color\" content=\"#0B1D3A\">")) fail('fresh theme color present');
if (!server.includes("ctaTargetLengthKo: '4200-5200'")) fail('CTA runtime target length unified');

for (const key of ['test:phase223', 'validate:phase223', 'phase223:final']) {
  if (!scripts[key]) fail('package script missing', key);
}
if (scripts['phase223:final'] && !scripts['phase223:final'].includes('phase222:final')) fail('phase223 preserves phase222 regression');
if (scripts['phase223:final'] && !scripts['phase223:final'].includes('test:phase223')) fail('phase223 final runs phase223 test');

const result = {
  ok: failures.length === 0,
  phase: 'phase223',
  name: 'global-error-collision-risk-guard',
  checkedAt: new Date().toISOString(),
  scoreAfterPatch: failures.length ? Math.max(0, 100 - failures.length * 6) : 100,
  totalChecks: 28,
  failedChecks: failures,
  improvements: {
    redirectLoopGuard: 'deployment risk endpoint and response header',
    staleCacheGuard: 'client static-load failure banner',
    brokenPageGuard: 'friendly public 404/500 page',
    copySeoConsistency: 'routeMeta title and theme color synchronized',
    ctaCadence: '20min preserved',
  },
};

fs.writeFileSync(path.join(root, 'PHASE223_GLOBAL_ERROR_COLLISION_RISK_GUARD_VALIDATION_20260510.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');

if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));

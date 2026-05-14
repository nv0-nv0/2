import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const exists = p => fs.existsSync(path.join(root, p));
const checks = [];
const add = (name, ok, extra = {}) => checks.push({ name, ok: !!ok, ...extra });
const has = (file, token) => read(file).includes(token);
const pkg = JSON.parse(read('package.json'));
const server = read('server/index.mjs');
const publicRoutes = read('server/routes/public.mjs');
const paymentRoutes = read('server/routes/payment.mjs');
const routeSources = [server, publicRoutes, paymentRoutes, read('server/routes/account.mjs'), read('server/routes/admin.mjs'), read('server/routes/ops.mjs')].join('\n');
const boardJs = read('apps/public/board/app.js');
const checkoutJs = read('apps/public/checkout/app.js');
const enhanceJs = read('shared/site-enhancements.js');
const htmlJs = read('shared/html.js');
const css = read('shared/nv0-clean-slate-20260512.css');
const ci = exists('.github/workflows/ci.yml') ? read('.github/workflows/ci.yml') : '';
const rel = exists('.github/workflows/commercial-release.yml') ? read('.github/workflows/commercial-release.yml') : '';

['server/index.mjs','server/routes/public.mjs','server/routes/payment.mjs','shared/html.js','shared/site-enhancements.js','apps/public/board/app.js','apps/public/checkout/app.js','scripts/test-all.mjs','tests/e2e.mjs','RUN_ALL_TESTS.sh'].forEach(file => add(`exists:${file}`, exists(file)));
add('package version phase258', /phase258-structural-hardening/.test(pkg.version));
['test:e2e','ci:strict','validate:commercial','validate:commercial-runtime','validate:pipeline','pipeline:release','final:review','test:phase258','validate:phase258','phase258:final'].forEach(script => add(`package script:${script}`, !!pkg.scripts?.[script]));
add('phase257 aliases preserved to phase258', /phase258:final/.test(pkg.scripts?.['phase257:final'] || '') && /test:phase258/.test(pkg.scripts?.['test:phase257'] || ''));
add('stale phase107 workflow removed', !exists('.github/workflows/phase107-complete-pipeline.yml'));
add('stale phase108 workflow removed', !exists('.github/workflows/phase108-commercial-100.yml'));
add('ci workflow references phase258 gate', ci.includes('npm run phase258:final'));
add('ci workflow has lockfile-safe install', ci.includes('if [ -f package-lock.json ]'));
add('commercial workflow has lockfile-safe install', rel.includes('if [ -f package-lock.json ]'));
add('commercial workflow uses validate commercial script', rel.includes('npm run validate:commercial'));
add('RUN_ALL_TESTS current final gate', has('RUN_ALL_TESTS.sh','npm run phase258:final') && !has('RUN_ALL_TESTS.sh','phase203'));
add('runtime clean accepts absent runtime dir', has('scripts/check-runtime-clean.mjs','runtime-directory-absent-clean'));
add('pipeline release command exposed', pkg.scripts?.['pipeline:release'] === 'node scripts/pipeline-release-gate.mjs');
add('test-all writes phase258 report', has('scripts/test-all.mjs','PHASE258_TEST_ALL_SUMMARY_20260514.json'));

add('public scan route condition includes scan and diagnose', /pathname === '\/api\/public\/diagnose' \|\| pathname === '\/api\/public\/scan'/.test(publicRoutes));
add('public scan no longer falls through to 404', publicRoutes.includes("'/api/public/scan') && req.method === 'POST'"));
add('diagnose turnstile signature passes request first', publicRoutes.includes('verifyTurnstile(req, payload.turnstileToken)'));
add('old wrong turnstile signature removed', !publicRoutes.includes('verifyTurnstile(payload.turnstileToken, clientIp(req))'));
add('diagnosis engine advertises scan endpoint', publicRoutes.includes("scan: 'POST /api/public/scan'"));
add('routes include board api', routeSources.includes('/api/public/board'));
add('routes include checkout api', routeSources.includes('/api/public/checkout-session'));
add('routes include payment complete api', routeSources.includes('/api/public/payment/complete'));
add('routes include portal summary api', routeSources.includes('/api/public/portal-summary'));
add('payment config endpoint still routed', paymentRoutes.includes("pathname === '/api/public/payment/config'"));

add('CSP allows PortOne scripts wildcard', server.includes("https://*.portone.io"));
add('CSP allows PortOne frames', server.includes('frame-src https://cdn.portone.io https://*.portone.io'));
add('CSP keeps Turnstile conditional frame support', server.includes('https://challenges.cloudflare.com'));
add('safeLocalPath helper added', htmlJs.includes('export function safeLocalPath'));
add('clampText helper added', htmlJs.includes('export function clampText'));
add('safeUrl still blocks non-http protocols', htmlJs.includes("!['http:', 'https:'].includes(url.protocol)"));

add('board imports safeLocalPath', boardJs.includes('safeLocalPath'));
add('board imports escapeAttr', boardJs.includes('escapeAttr'));
add('board safe id helper exists', boardJs.includes('function safeBoardId'));
add('board query normalization exists', boardJs.includes('function normalizeBoardQuery'));
add('board abort controller exists', boardJs.includes('boardAbortController'));
add('board fetch no-store and signal', boardJs.includes("cache: 'no-store'") && boardJs.includes('signal: boardAbortController.signal'));
add('board loading aria busy exists', boardJs.includes('aria-busy'));
add('board search maxLength set', boardJs.includes('searchInput.maxLength = 80'));
add('board unsafe direct internal link href removed', !boardJs.includes('href="${escapeHtml(link.href'));
add('board riskSummary renamed from seoSummary', boardJs.includes('const riskSummary') && !boardJs.includes('const seoSummary'));
add('board unused matchesQuery removed', !boardJs.includes('function matchesQuery'));
add('board client double filter absent', !boardJs.includes('posts.filter(matchesQuery)'));
add('board aria-current pagination retained', boardJs.includes('aria-current'));
add('board server pagination retained', boardJs.includes('pagination.total'));

add('site enhancements harden url inputs', enhanceJs.includes('function hardenUrlInputs'));
add('site enhancements sets inputmode url', enhanceJs.includes("inputmode', 'url"));
add('site enhancements sets maxlength 300', enhanceJs.includes("maxlength', '300"));
add('site enhancements supports form submit', enhanceJs.includes("box.addEventListener('submit'"));
add('site enhancements prevents invalid URL navigation', enhanceJs.includes('aria-invalid') && enhanceJs.includes('event.preventDefault()'));
add('site enhancements marks current nav', enhanceJs.includes('markCurrentLinks'));
add('site enhancements hardens blank target links', enhanceJs.includes('noopener') && enhanceJs.includes('noreferrer'));

add('checkout payment config no-store', checkoutJs.includes("fetch('/api/public/payment/config', { cache: 'no-store' })"));
add('checkout products no-store', checkoutJs.includes("fetch('/api/public/products', { cache: 'no-store' })"));
add('checkout waits longer for PortOne SDK', checkoutJs.includes('portoneReadyChecks >= 20'));
add('checkout validates email', checkoutJs.includes('isValidEmail'));
add('checkout requires delivery consent', checkoutJs.includes('deliveryConsent'));
add('checkout external redirect validates safeUrl', checkoutJs.includes('safeUrl(data.paymentSession.redirectUrl)'));
add('checkout redirect result supports orderId fallback', checkoutJs.includes('orderId = url.searchParams.get'));
add('checkout result portal link includes access token', checkoutJs.includes('accessToken'));

add('CSS phase258 hardening appended', css.includes('PHASE258 structural hardening'));
add('CSS risk meta alias exists', css.includes('.risk-meta-strip,.seo-meta-strip'));
add('CSS aria busy state exists', css.includes('[aria-busy="true"]'));
add('CSS mobile page search grid exists', css.includes('.page-search'));
add('CSS disabled button state exists', css.includes('button[disabled]'));
add('CSS no old PHASE253 comment', !css.includes('PHASE253 board SEO expansion'));

const publicHtml = ['home','board','plans','service','solutions','veridion-demo','checkout','portal'].map(slug => read(`apps/public/${slug}/index.html`)).join('\n');
add('public copy no legacy Auto price', !/Auto 정기 케어|39,000원|149,000원|FixPack|TemplatePack/.test(publicHtml));
add('public copy no email delivery promise', !/이메일로 결과|이메일 수신|메일로 발송/.test(publicHtml));
add('public copy keeps portal result direction', /내 사이트 관리|확인 기록/.test(publicHtml));
add('public copy fixed score hidden', !/82점|72\s*\/\s*100|12개/.test(publicHtml));
add('board HTML has search state', read('apps/public/board/index.html').includes('boardState'));
add('plans HTML has Report checkout', read('apps/public/plans/index.html').includes('/checkout?plan=Report'));
add('plans HTML has Expert checkout', read('apps/public/plans/index.html').includes('/checkout?plan=Expert'));

const report = { generatedAt: new Date().toISOString(), phase: 'phase258-structural-hardening', ok: checks.every(c => c.ok), total: checks.length, passed: checks.filter(c => c.ok).length, failed: checks.filter(c => !c.ok).length, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE258_STRUCTURAL_HARDENING_AUDIT_20260514.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, report: 'docs/current/PHASE258_STRUCTURAL_HARDENING_AUDIT_20260514.json' }, null, 2));
if (!report.ok) {
  console.error(JSON.stringify(checks.filter(c => !c.ok), null, 2));
  process.exit(1);
}

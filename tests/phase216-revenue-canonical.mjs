import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
let failed = 0;
function ok(name, condition, detail = '') {
  if (condition) console.log(`PASS ${name}`);
  else { failed += 1; console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

const home = read('apps/public/home/index.html') + '\n' + read('apps/public/home/app.css');
const plans = read('apps/public/plans/index.html') + '\n' + read('apps/public/plans/app.css') + '\n' + read('apps/public/plans/app.js');
const security = read('server/middleware/security.mjs');
const server = read('server/index.mjs');
const pkg = JSON.parse(read('package.json'));

ok('home shows free-to-paid revenue ladder', ['nv0-revenue-ladder', '무료 진단', '상세 리포트', 'FixPack', 'Auto', '99,000원', '299,000원 / 월'].every(token => home.includes(token)));
ok('plans has no-js product cards for crawlers and slow JS', ['data-plan-code="Free"', 'data-plan-code="Report"', 'data-plan-code="FixPack"', 'data-plan-code="Auto"'].every(token => plans.includes(token)));
ok('plans keeps direct paid checkout links', ['/checkout?plan=Report', '/checkout?plan=FixPack', '/checkout?plan=Auto'].every(token => plans.includes(token)));
ok('plans emphasizes FixPack as fastest action', plans.includes('가장 빠른 매출 개선 행동') && plans.includes('FixPack 바로 결제'));
ok('canonical host redirect implemented at app layer', security.includes('canonical_host_redirect') && security.includes('shouldCanonicalHostRedirect') && server.includes('NV0_CANONICAL_HOST_REDIRECT'));
ok('canonical redirect skips local development hosts', security.includes("'localhost'") && security.includes("'127.0.0.1'"));
ok('mail-order placeholder is blocked before footer output', server.includes('isSafePublicOptionalField') && server.includes('requireMailOrderShape') && server.includes('replace|placeholder|sample|example|dummy'));
ok('phase216 scripts are registered', pkg.scripts['validate:phase216'] && pkg.scripts['phase216:final'] && pkg.scripts['validate:phase215']);

if (failed) process.exit(1);

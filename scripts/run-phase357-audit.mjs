import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const walk = (dir = '.') => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
  const rel = path.posix.join(dir === '.' ? '' : dir, entry.name);
  if (entry.name === '.git' || entry.name === 'node_modules') return [];
  return entry.isDirectory() ? walk(rel) : [rel];
});
const files = walk('.').sort();
const htmlFiles = files.filter(file => file.endsWith('.html'));
const adminPages = htmlFiles.filter(file => file.startsWith('apps/admin/'));
const publicPages = htmlFiles.filter(file => file.startsWith('apps/public/'));
const pkg = JSON.parse(read('package.json'));
const checks = [];
function add(name, fn) { try { fn(); checks.push({ name, ok: true }); } catch (error) { checks.push({ name, ok: false, error: error.message }); } }
const countMatches = (text, re) => [...text.matchAll(re)].length;
const unique = items => [...new Set(items)].sort();
const composeKeys = file => unique([...read(file).matchAll(/^\s{6,}([A-Z][A-Z0-9_]+):/gm)].map(match => match[1]));
const envKeys = file => unique(read(file).split(/\r?\n/).filter(line => /^[A-Z][A-Z0-9_]*=/.test(line)).map(line => line.split('=', 1)[0]));
const operatorTemplates = ['deploy/coolify.env.example','deploy/coolify.env.bulk.txt','deploy/env.production.template','deploy/env.production.nv0.kr.example','deploy/env.commercial.template'];
const criticalOperatorKeys = ['NV0_EXPOSE_INTERNAL_PUBLIC_APIS','NV0_SESSION_SECRET','NV0_PRIVACY_HASH_KEY','NV0_SECURE_RECORDS_KEY','NV0_SECURE_RECORDS_SALT','NV0_SECURE_RECORDS_DIR','NV0_PAYMENT_REDIRECT_ALLOWED_HOSTS','NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT','NV0_HEALTHZ_STRICT','NV0_READYZ_REDIS_STRICT','NV0_READYZ_CACHE_TTL_MS','NV0_SCAN_SOFT_TIMEOUT_MS','NV0_TARGET_FETCH_MAX_BYTES','NV0_TARGET_FETCH_MAX_REDIRECTS','NV0_BUSINESS_TRADE_NAME','NV0_BUSINESS_REPRESENTATIVE','NV0_BUSINESS_REGISTRATION_NUMBER','NV0_BUSINESS_ADDRESS'];
const rootCompose = composeKeys('docker-compose.yml');
const coolifyCompose = composeKeys('deploy/docker-compose.coolify.yml');
const htmlCorpus = htmlFiles.map(read).join('\n');
const publicRoutes = read('server/routes/public.mjs');
const hiddenBlock = publicRoutes.split('const customerHiddenOperationalEndpoints = new Set([', 2)[1]?.split(']);', 1)[0] || '';
const hiddenOperationalEndpoints = unique([...hiddenBlock.matchAll(/'\/api\/public\/[^']+'/g)].map(match => match[0].slice(1, -1)));
const runtimeForbidden = ['runtime/data/db.json','runtime/data/sessions.json','runtime/data/secure-records'];
const runtimeTestArtifacts = files.filter(file => file.startsWith('runtime-test-'));
const localAssets = [];
for (const file of htmlFiles) {
  const html = read(file);
  for (const match of html.matchAll(/<(?:script|link)[^>]+(?:src|href)="(\/[^"]+)"/g)) {
    const url = match[1].split(/[?#]/, 1)[0];
    if (url.startsWith('//')) continue;
    localAssets.push({ page: file, url, rel: url.slice(1) });
  }
}

add('package-version-phase357', () => assert.match(pkg.version, /phase357-global-qa-accessibility-closeout/));
add('description-phase357', () => assert.match(pkg.description || '', /phase357 global QA and accessibility closeout/i));
add('terminal-aliases-phase357', () => { for (const key of ['delivery:final','release:predeploy','verify:release']) assert.ok(['npm run phase357:final','npm run phase358:final'].includes(pkg.scripts[key]), key); });
add('run-all-tests-phase357', () => assert.match(read('RUN_ALL_TESTS.sh'), /npm run phase357:final|npm run phase358:final/));
add('script-keys-sorted', () => assert.deepEqual(Object.keys(pkg.scripts), [...Object.keys(pkg.scripts)].sort((a,b) => a.localeCompare(b))));
add('html-page-count', () => assert.equal(htmlFiles.length, 31));
add('admin-page-count', () => assert.equal(adminPages.length, 7));
add('public-page-count', () => assert.equal(publicPages.length, 24));
add('all-html-has-language-title-viewport-main-skip', () => {
  for (const file of htmlFiles) {
    const html = read(file);
    assert.match(html, /<html lang="ko">/, `${file}: lang`);
    assert.match(html, /<title>[^<]+<\/title>/, `${file}: title`);
    assert.match(html, /<meta name="viewport"/, `${file}: viewport`);
    assert.match(html, /<a class="skip-link" href="#main">본문 바로가기<\/a>/, `${file}: skip`);
    assert.match(html, /<main(?=[^>]*\bid="main")(?=[^>]*\btabindex="-1")[^>]*>/, `${file}: main`);
  }
});
add('html-ids-unique-per-page', () => {
  for (const file of htmlFiles) {
    const ids = [...read(file).matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(ids.length, new Set(ids).size, file);
  }
});
add('local-assets-exist', () => { for (const asset of localAssets) assert.equal(exists(asset.rel), true, `${asset.page}: ${asset.url}`); });
add('admin-pages-have-skip-links', () => { for (const file of adminPages) { assert.match(read(file), /<a class="skip-link" href="#main">본문 바로가기<\/a>/, file); assert.match(read(file), /<main id="main" tabindex="-1" class="app-shell admin-clean-v311">/, file); } });
add('demo-keyboard-result-accessibility', () => {
  for (const file of ['apps/public/demo/index.html','apps/public/veridion-demo/index.html']) { const html = read(file); assert.match(html, /id="scanBtn" type="submit"/); assert.match(html, /id="demoResult" tabindex="-1" aria-live="polite"/); }
  const js = read('apps/public/demo/app.js'); assert.match(js, /unifiedDiagnosisForm\?\.addEventListener\('submit'/); assert.doesNotMatch(js, /scanBtn\?\.addEventListener\('click'/); assert.match(js, /result\.focus\(\{ preventScroll: true \}\)/);
});
add('checkout-keyboard-accessibility', () => { assert.match(read('apps/public/checkout/index.html'), /id="checkoutBtn" type="submit"/); const js = read('apps/public/checkout/app.js'); assert.match(js, /checkoutForm\?\.addEventListener\('submit'/); assert.doesNotMatch(js, /checkoutBtn\?\.addEventListener\('click'/); });
add('portal-side-nav-labelled', () => assert.match(read('apps/public/portal/index.html'), /<nav class="vr-side-nav" aria-label="고객 포털 메뉴">/));
add('compose-files-forward-identical-key-sets', () => assert.deepEqual(rootCompose, coolifyCompose));
add('compose-readyz-cache-forwarded', () => assert.ok(rootCompose.includes('NV0_READYZ_CACHE_TTL_MS')));
add('compose-target-fetch-safety-forwarded', () => { for (const key of ['NV0_TARGET_FETCH_MAX_BYTES','NV0_TARGET_FETCH_MAX_REDIRECTS','NV0_SCAN_SOFT_TIMEOUT_MS']) assert.ok(rootCompose.includes(key), key); });
add('operator-templates-cover-critical-runtime-keys', () => { for (const file of operatorTemplates) { const keys = envKeys(file); for (const key of criticalOperatorKeys) assert.ok(keys.includes(key), `${file}: ${key}`); } });
add('public-target-input-rejects-obvious-private-addresses', () => {
  const server = read('server/index.mjs');
  assert.match(server, /if \(isBlockedTargetUrl\(url\)\) throw invalidPayload\('공개 인터넷 사이트 주소만 진단할 수 있습니다/);
  assert.match(server, /if \(isBlockedTargetUrl\(url\)\) return '';/);
  assert.match(server, /isBlockedTargetUrlResolved/);
});
add('hidden-operational-api-count', () => assert.equal(hiddenOperationalEndpoints.length, 30));
add('runtime-forbidden-artifacts-absent', () => { for (const rel of runtimeForbidden) assert.equal(exists(rel), false, rel); assert.equal(runtimeTestArtifacts.length, 0, runtimeTestArtifacts.join(',')); });
add('seed-preserved', () => assert.equal(exists('runtime/data/db.seed.json'), true));
add('phase357-docs-present', () => ['docs/PHASE357_GLOBAL_QA_WORK_ORDER.md','docs/PHASE357_REMEDIATION_MATRIX.md','docs/PHASE357_GLOBAL_QA_CLOSEOUT.md'].forEach(file => assert.equal(exists(file), true, file)));

const metrics = {
  files: files.length,
  directories: unique(files.flatMap(file => { const parts=file.split('/'); return parts.slice(0,-1).map((_,i)=>parts.slice(0,i+1).join('/')); })).length,
  htmlPages: htmlFiles.length,
  publicPages: publicPages.length,
  adminPages: adminPages.length,
  cssFiles: files.filter(file => file.endsWith('.css')).length,
  mjsFiles: files.filter(file => file.endsWith('.mjs')).length,
  markdownFiles: files.filter(file => file.endsWith('.md')).length,
  npmScripts: Object.keys(pkg.scripts).length,
  uiElements: countMatches(htmlCorpus, /<(?:a|button|input|select|textarea)\b/g),
  links: countMatches(htmlCorpus, /<a\b/g),
  buttons: countMatches(htmlCorpus, /<button\b/g),
  inputs: countMatches(htmlCorpus, /<input\b/g),
  selects: countMatches(htmlCorpus, /<select\b/g),
  textareas: countMatches(htmlCorpus, /<textarea\b/g),
  forms: countMatches(htmlCorpus, /<form\b/g),
  composeForwardedKeys: rootCompose.length,
  hiddenOperationalEndpoints: hiddenOperationalEndpoints.length,
  localAssetsReferenced: localAssets.length
};
const failures = checks.filter(item => !item.ok);
const report = { ok: failures.length === 0, phase: 'phase357-global-qa-accessibility-closeout', generatedAt: new Date().toISOString(), checked: checks.length, failed: failures.length, failures, checks, metrics, hiddenOperationalEndpoints };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE357_GLOBAL_AUDIT.json'), JSON.stringify(report, null, 2));
const md = `# PHASE357 전역 감사 보고서\n\n생성 시각: ${report.generatedAt}\n\n## 판정\n\n- 검사 항목: **${checks.length}개**\n- 실패: **${failures.length}개**\n- 결과: **${report.ok ? 'PASS' : 'FAIL'}**\n\n## 인벤토리\n\n| 항목 | 개수 |\n| --- | ---: |\n${Object.entries(metrics).map(([key,value]) => `| ${key} | ${value} |`).join('\n')}\n`;
fs.writeFileSync(path.join(root, 'docs/current/PHASE357_GLOBAL_AUDIT.md'), md);
console.log(JSON.stringify({ ok: report.ok, checked: report.checked, failed: report.failed, metrics: report.metrics, report: 'docs/current/PHASE357_GLOBAL_AUDIT.json' }, null, 2));
if (!report.ok) process.exit(1);

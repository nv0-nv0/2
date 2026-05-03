import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const read = file => fs.readFile(path.join(ROOT, file), 'utf8');
const exists = async file => !!(await fs.stat(path.join(ROOT, file)).catch(() => null));
async function walk(dir, acc = []) {
  const full = path.join(ROOT, dir);
  for (const ent of await fs.readdir(full, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    const rel = path.join(dir, ent.name);
    if (ent.isDirectory()) await walk(rel, acc);
    else acc.push(rel);
  }
  return acc;
}
const checks = [];
function add(name, ok, detail = '') { checks.push({ name, ok: Boolean(ok), detail }); }
const publicFiles = await walk('apps/public');
const serverFiles = await walk('server');
const sharedFiles = await walk('shared');
const scannedFiles = [...publicFiles, ...serverFiles, ...sharedFiles].filter(file => /\.(html|js|mjs|css)$/.test(file));
const scannedText = (await Promise.all(scannedFiles.map(async file => `${file}\n${await read(file)}`))).join('\n---FILE---\n');
const publicText = (await Promise.all(publicFiles.filter(file => /\.(html|js|css)$/.test(file)).map(async file => `${file}\n${await read(file)}`))).join('\n---FILE---\n');

for (const token of ['support@nvo.io', '홍길동', '123-45-67890', '02-1234-5678', '김지훈', '이서연', '정하진']) {
  add(`no-public-or-runtime-token:${token}`, !scannedText.includes(token), `${token} must not remain in public/server/shared runtime files`);
}
add('support-email-canonical-ct-nv0', scannedText.includes('ct@nv0.kr'), 'canonical support email must be present');
const dockerfile = await read('Dockerfile');
add('docker-runs-as-nv0-user', /\nUSER\s+nv0\s*\n/.test(dockerfile), 'Docker runtime stage must execute as the non-root nv0 user');
const serverIndex = await read('server/index.mjs');
add('runtime-footer-replaces-existing-static-footer', /body\.replace\(\/<footer\\b/.test(serverIndex) || /const replaced = body\.replace\(\/<footer\\b/.test(serverIndex), 'injectBusinessFooter must replace stale static business-footer blocks');
add('release-phase-180', serverIndex.includes("phase180-quality-performance-functionality-max"), 'release phase must identify phase180 delivery');
const envConfig = await read('server/config/env.mjs');
add('asset-cache-allows-one-year', /NV0_PUBLIC_ASSET_CACHE_SECONDS[^\n]+max:\s*31536000/.test(envConfig), 'asset cache env max must match commercial env examples');
const pgBridge = await read('server/infrastructure/persistence/postgres-bridge.mjs');
add('postgres-snapshot-batch-write', pgBridge.includes('async function writeCollections') && pgBridge.includes("parts = ['begin;']") && pgBridge.includes("parts.push('commit;')"), 'state_snapshots writes must be batched in one transaction');
const publicRoute = await read('server/routes/public.mjs');
add('board-api-exposes-stats', /const stats = \{[\s\S]*filteredTotal/.test(publicRoute) && /stats,/.test(publicRoute), 'public board API must expose live stats');
add('board-api-exposes-activity', /const activity = publicPosts\.slice\(0, 3\)/.test(publicRoute) && /activity,/.test(publicRoute), 'public board API must expose recent activity from actual public posts');
const boardHtml = await read('apps/public/board/index.html');
add('board-has-live-stat-targets', (boardHtml.match(/data-board-stat=/g) || []).length >= 6, 'board page must render live KPI placeholders');
add('board-has-live-activity-target', boardHtml.includes('id="boardActivity"') && boardHtml.includes('실제 공개 게시글 기준'), 'board page must not include fake person activity');
add('board-links-no-hash-placeholder', !/href=["']#["']/.test(boardHtml), 'board links should not use # placeholders');
const boardApp = await read('apps/public/board/app.js');
add('board-client-renders-stats', boardApp.includes('function renderStats') && boardApp.includes('data.stats'), 'board app must render API stats');
add('board-client-renders-activity', boardApp.includes('function renderActivity') && boardApp.includes('data.activity'), 'board app must render API activity');
add('board-client-escapes-activity-html', boardApp.includes('escapeHtml(item.label') && boardApp.includes('escapeHtml(item.title'), 'activity renderer must escape server-provided text');
const checkoutHtml = await read('apps/public/checkout/index.html');
add('checkout-business-info-real', checkoutHtml.includes('대표자 나금상') && checkoutHtml.includes('584-77-00586') && checkoutHtml.includes('이메일 전용 고객지원'), 'checkout confirmation table must show actual business/support info');
add('checkout-no-unfinished-payment-copy', !checkoutHtml.includes('추후 지원') && !checkoutHtml.includes('운영 문의'), 'checkout methods should avoid unfinished copy');
const publicFooterCount = (publicText.match(/<footer\b[^>]*class=["'][^"']*\bbusiness-footer\b/g) || []).length;
const canonicalFooterCount = (publicText.match(/고객지원:\s*ct@nv0\.kr/g) || []).length;
add('static-public-footers-canonicalized', publicFooterCount > 0 && canonicalFooterCount >= publicFooterCount, `canonical footers ${canonicalFooterCount}/${publicFooterCount}`);
const deliveryDocExists = await exists('PHASE180_146_QUALITY_MAX_DELIVERY_20260503_KO.md');
add('phase180-delivery-doc-exists', deliveryDocExists, 'delivery report must exist');
if (deliveryDocExists) {
  const doc = await read('PHASE180_146_QUALITY_MAX_DELIVERY_20260503_KO.md');
  const rows = doc.split('\n').filter(line => /^\|\s*\d+\s*\|/.test(line));
  add('phase180-delivery-doc-has-146-items', rows.length === 146, `row count=${rows.length}`);
  add('phase180-doc-discloses-local-limitations', doc.includes('실서버 DNS') && doc.includes('확인되지 않았습니다'), 'doc must disclose what local package cannot verify');
}
add('phase180-readme-patch-exists', await exists('README_PATCH_P180_KO.txt'), 'patch readme must exist');
const packageJson = JSON.parse(await read('package.json'));
add('package-has-phase180-script', packageJson.scripts?.['validate:phase180'] === 'node scripts/validate-phase180-quality-max.mjs', 'validate:phase180 script must be registered');
add('package-has-phase180-final-gate', typeof packageJson.scripts?.['phase180:final'] === 'string' && packageJson.scripts['phase180:final'].includes('validate:phase180'), 'phase180 final gate must include validate:phase180');
const failures = checks.filter(item => !item.ok);
const report = {
  generatedAt: new Date().toISOString(),
  ok: failures.length === 0,
  total: checks.length,
  passed: checks.length - failures.length,
  failed: failures.length,
  checks,
  limitation: '로컬 패키지 정적/동적 게이트 기준 검증입니다. 실서버 DNS, 실제 PortOne 승인, 실제 SMTP/R2/PostgreSQL 운영 부하는 별도 운영 검증이 필요합니다.'
};
await fs.writeFile(path.join(ROOT, 'PHASE180_146_QUALITY_MAX_VALIDATION_20260503.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, report: 'PHASE180_146_QUALITY_MAX_VALIDATION_20260503.json' }, null, 2));
if (!report.ok) process.exit(1);

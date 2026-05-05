import { readFileSync } from 'node:fs';

function read(path) { return readFileSync(path, 'utf8'); }
const checks = [];
function pass(name, ok, detail) { checks.push({ name, ok: Boolean(ok), detail }); }

const home = read('apps/public/home/index.html');
const demo = read('apps/public/veridion-demo/index.html');
const demoJs = read('apps/public/veridion-demo/app.js');
const board = read('apps/public/board/index.html');
const boardJs = read('apps/public/board/app.js');
const portal = read('apps/public/portal/index.html');
const plansCss = read('apps/public/plans/app.css');
const design = read('shared/design-system.css');
const server = read('server/index.mjs');

pass('home.no_fixed_72_score', !/72\s*\/\s*100|위험도\s*72|신뢰도 점수\s*72/.test(home), 'home must not expose stale fixed score preview');
pass('home.metrics_are_real_result_placeholders', home.includes('검사 후 표시되는 항목') && home.includes('실제 결과 전용') && home.includes('nv0-metrics-ready'), 'home metric panel must be real-result placeholder, not fake numeric sample');
pass('demo.no_fixed_72_score', !/무료 진단 결과 예시|>\s*72\s*</.test(demo), 'demo must not show hard-coded sample result before scan');
pass('demo.client_safe_fallback', demoJs.includes('buildLocalFallbackScan') && demoJs.includes('client_safe_fallback') && demoJs.includes('renderResult(fallback)'), 'demo must render safe result if API times out or returns 502');
pass('board.clickable_sidebar_controls', board.includes('button class="nv0-filter-item"') && board.includes('data-topic=') && boardJs.includes('topicButtons.forEach'), 'board sidebar labels must be real clickable controls');
pass('board.static_counts_not_dashes', !/<strong data-board-stat="(?:notice|case)">-<\/strong>/.test(board), 'board initial filter counts must not render as useless dashes');
pass('board.api_failure_keeps_content', boardJs.includes('FALLBACK_POSTS') && boardJs.includes('applyBoardFallback') && !boardJs.includes("list.innerHTML = '<div class=\"muted\">잠시 후 다시 시도하세요.</div>'"), 'board must keep useful content if board API is unavailable');
pass('portal.site_registration_prioritized', portal.indexOf('새 사이트 등록') < portal.indexOf('portalNextActions') && portal.includes('새 사이트 등록과 다음 조치'), 'site registration must be above next-action dashboard and headline must match');
pass('portal.support_link_consistent', portal.includes('href="/business-info"') && !portal.includes('href="/guides">고객지원'), 'portal support links must match global customer-support route');
pass('plans.badge_overlap_guard', plansCss.includes('recommended-badge') && plansCss.includes('position:static !important') && plansCss.includes('offer-head'), 'plan recommendation badge must not overlap period chip');
pass('global.phase205_layout_guards', design.includes('PHASE205: live-site visual closeout guardrails') && design.includes('overflow-x:hidden') && design.includes('.demo-grid') && design.includes('.nv0-side-layout'), 'global visual guardrails must prevent overflow and cramped side layouts');
pass('footer.placeholder_filter', server.includes('legalFieldBlockPattern') && server.includes('BUSINESS_PROFILE.mailOrderRegistrationNumber'), 'server footer must filter placeholder commerce-registration values');

const failed = checks.filter(item => !item.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name} - ${item.detail}`);
if (failed.length) {
  console.error(`\nPhase205 validation failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nPhase205 validation passed: ${checks.length}/${checks.length}`);

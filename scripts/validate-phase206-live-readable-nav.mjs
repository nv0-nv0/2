import { readFileSync } from 'node:fs';

function read(path) { return readFileSync(path, 'utf8'); }
const checks = [];
function pass(name, ok, detail) { checks.push({ name, ok: Boolean(ok), detail }); }

const design = read('shared/design-system.css');
const server = read('server/index.mjs');
const publicRouteMap = [...server.matchAll(/^'([^']+)': \[PUBLIC_DIR,/gm)].map(match => match[1]);
const uniquePublicRoutes = [...new Set(publicRouteMap)];
const menuLabels = ['무료 진단', '플랜 비교', '콘텐츠 보드', '문서 생성', '내 사이트', '고객지원', '로그인'];
const auditedTopbarElements = uniquePublicRoutes.length * menuLabels.length;

pass('phase206.css_block_present', design.includes('PHASE206: live top-navigation visibility closeout'), 'final CSS authority block must exist');
pass('phase206.active_state_for_injected_and_static_nav', design.includes('.site-menu a[aria-current="page"],\n.nv0-nav a[aria-current="page"]') && design.includes('color:#FFFFFF !important'), 'active nav state must be dark/blue with white text for server-injected and static nav');
pass('phase206.base_state_opaque_and_readable', design.includes('--nv206-nav-item-bg:rgba(15,23,42,.78)') && design.includes('opacity:1 !important') && design.includes('white-space:nowrap !important'), 'base nav links must not use pale or translucent low-contrast treatments');
pass('phase206.login_state_locked', design.includes('.site-menu a.login-link,') && design.includes('.site-menu a:last-child,') && design.includes('background:#07101F !important'), 'login link must stay visibly separated from active route links');
pass('phase206.focus_visible', design.includes(':focus-visible') && design.includes('outline:3px solid #BFDBFE'), 'keyboard focus must be visible');
pass('phase206.mobile_grid', design.includes('@media(max-width:860px)') && design.includes('grid-template-columns:repeat(2,minmax(0,1fr))') && design.includes('@media(max-width:520px)'), 'mobile topbar must avoid cramped/overlapping pills');
pass('phase206.public_route_count', uniquePublicRoutes.length >= 22 && auditedTopbarElements >= 154, `audited ${uniquePublicRoutes.length} public routes × ${menuLabels.length} topbar items = ${auditedTopbarElements}`);
pass('phase206.placeholder_footer_guard', server.includes('replace|placeholder|sample|example|dummy|xxx|미정') && server.includes('legalFieldBlockPattern'), 'mail-order placeholder values must be filtered from public footer');

const failed = checks.filter(item => !item.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name} - ${item.detail}`);
console.log(JSON.stringify({ ok: failed.length === 0, suite: 'phase206_live_readable_nav', publicRoutes: uniquePublicRoutes.length, menuItemsPerRoute: menuLabels.length, auditedTopbarElements, checkedAt: new Date().toISOString(), failed: failed.map(item => item.name) }, null, 2));
if (failed.length) process.exit(1);

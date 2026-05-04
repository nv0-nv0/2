import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
const add = (name, ok, detail = undefined) => checks.push({ name, ok: Boolean(ok), ...(detail ? { detail } : {}) });

const html = read('apps/public/portal/index.html');
const css = read('apps/public/portal/app.css');
const js = read('apps/public/portal/app.js');

const sidebarPrimary = html.indexOf('nv191-sidebar-primary');
const nav = html.indexOf('class="nv74-nav"');
add('sidebar:new-site-registration-above-menu', sidebarPrimary > -1 && nav > -1 && sidebarPrimary < nav);
add('portal:title-next-action', html.includes('<h1>내 사이트 다음 조치</h1>'));
add('portal:action-grid-mounted', html.includes('id="portalNextActions"') && html.includes('class="nv191-action-grid"'));
add('portal:content-board-unified', html.includes('nv191-content-board') && !html.includes('nv74-upgrade"><div>UP</div><h3>결제 후 산출물 확인'));
add('portal:removed-custom-guidance-render', !js.includes('맞춤 지침'));
add('portal:removed-paid-output-check-card', !html.includes('결제 후 산출물 확인') && !js.includes('결제 후 산출물에서 확인'));
add('css:two-column-action-grid', /\.nv191-action-grid\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(css));
add('css:content-board-two-column', /\.nv191-content-board \.nv74-feed-render\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(css));
add('css:purple-upgrade-hidden', css.includes('.nv74-upgrade{display:none}'));
add('js:dynamic-next-actions', js.includes('function renderNextActionCards') && js.includes('renderNextActionCards(latest, account, summary)'));
add('js:syntax-safe-template-anchors', js.includes('escapeAttr(item.href)') && js.includes('escapeHtml(item.title)'));
add('legacy:phase74-compatibility-tokens', ['사이트 종합 점수','진행 중인 작업','빠른 실행','가장 효과 큰 개선 실행','게시판 자동 발행'].every(token => html.includes(token)));

const failed = checks.filter(item => !item.ok);
const report = {
  generatedAt: new Date().toISOString(),
  ok: failed.length === 0,
  phase: 191,
  title: 'Portal next-action visibility and unified content board validation',
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks
};
fs.writeFileSync(path.join(root, 'PHASE191_PORTAL_NEXT_ACTIONS_UX_VALIDATION_20260504.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, report: 'PHASE191_PORTAL_NEXT_ACTIONS_UX_VALIDATION_20260504.json' }, null, 2));
if (!report.ok) process.exit(1);

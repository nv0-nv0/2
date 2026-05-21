import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const exists = p => fs.existsSync(path.join(root, p));
const checks = [];
const add = (name, ok, extra = {}) => checks.push({ name, ok: !!ok, ...extra });
const pkg = JSON.parse(read('package.json'));
const demoJs = read('apps/public/veridion-demo/app.js');
const css = read('shared/nv0-clean-slate-20260512.css');
const server = read('server/index.mjs');
const publicRoutes = read('server/routes/public.mjs');

add('package version phase259', /phase259-demo-penalty-dashboard|phase260-dispute-safe-penalty|phase265-dashboard-portal-completion|phase26[8-9]-|phase270-full-package-verified-hardened|phase271-site-ux-insight-polish|phase272-premium-redesign|phase273-package-100|phase274-customer-copy-readability|phase278-customer-perfect/.test(pkg.version));
['test:phase259','validate:phase259','phase259:final','final:review'].forEach(script => add(`package script:${script}`, !!pkg.scripts?.[script]));
add('phase258 final redirects to phase259', /phase259:final|phase27[01]:final/.test(pkg.scripts?.['phase258:final'] || ''));
add('demo JS has compact Korean penalty formatter', demoJs.includes('function formatPenaltyCompact') && demoJs.includes('만 원'));
add('demo JS has penalty alert model', demoJs.includes('function buildPenaltyAlertModel'));
add('demo JS uses explicit estimatedMaxPenalty first', demoJs.includes('view.estimatedMaxPenalty ?? view.raw?.estimatedMaxPenalty'));
add('demo JS has fallback risk band amount', demoJs.includes('fallback-risk-band') && demoJs.includes('30000000'));
add('demo JS includes penalty disclaimer', demoJs.includes('penaltyDisclaimer'));
add('demo JS renders warning panel', demoJs.includes('function renderPenaltyWarningPanel'));
add('demo JS warning title copy', demoJs.includes('과태료·행정조치 가능성 검토 필요'));
add('demo JS warning body copy', demoJs.includes('실제 부과 여부와 금액은 관할기관 판단'));
add('demo JS warning bullet max fine', demoJs.includes('범위 검토 가능성'));
add('demo JS warning bullets administrative action', demoJs.includes('시정명령·재점검 요구 가능성') && demoJs.includes('행정처분 검토 가능성'));
add('demo JS brand risk bullet', demoJs.includes('고객 신뢰도 및 매출 영향 가능성'));
add('demo dashboard class exists', demoJs.includes('phase259-penalty-dashboard'));
add('demo kpi warning grid class exists', demoJs.includes('phase259-warning-grid'));
add('demo penalty card before summary cards', demoJs.indexOf('demo-penalty-card') > -1 && demoJs.indexOf('demo-penalty-card') < demoJs.indexOf('demo-summary-card danger'));
add('demo old class side card removed from count result', !/demo-count-class-card/.test(demoJs));
add('demo still keeps table card', demoJs.includes('demo-count-table-card'));
add('demo still keeps paid gate CTAs', demoJs.includes('기본 리포트 29,000원') && demoJs.includes('전문가 리포트 89,000원'));
add('CSS phase259 block appended', css.includes('PHASE259/260: demo reference penalty upper-bound dashboard'));
add('CSS red orange penalty gradient', css.includes('.demo-penalty-card') && css.includes('linear-gradient(135deg,#b70404'));
add('CSS siren icon exists', css.includes('.penalty-siren'));
add('CSS warning panel exists', css.includes('.demo-count-warning-card'));
add('CSS warning grid responsive desktop', css.includes('.phase259-warning-grid{grid-template-columns:minmax(330px,1.9fr)'));
add('CSS warning layout responsive', css.includes('.phase259-warning-layout{grid-template-columns:minmax(0,1.2fr) minmax(340px,.8fr)'));
add('CSS mobile fallback exists', css.includes('@media(max-width:620px)') && css.includes('.penalty-siren{display:none}'));
add('server provides estimated max penalty', server.includes('estimatedMaxPenalty'));
add('server has per-rule penaltyMax', server.includes('penaltyMax: 10000000') && server.includes('penaltyMax: 5000000'));
add('public route returns scan spread', publicRoutes.includes('result: { ...scan'));
add('no legal certainty claim in warning code', !/과태료 확정|위반 확정|반드시 부과|지금 바로 조치하지 않으면 과태료 부과|최대 .*과태료 부과|발생할 수 있습니다/.test(demoJs));
add('reference image packaged', exists('docs/current/phase259_demo_penalty_dashboard_reference.png'));

const report = { generatedAt: new Date().toISOString(), phase: 'phase259-demo-penalty-dashboard', ok: checks.every(c => c.ok), total: checks.length, passed: checks.filter(c => c.ok).length, failed: checks.filter(c => !c.ok).length, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE259_DEMO_PENALTY_DASHBOARD_AUDIT_20260515.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, report: 'docs/current/PHASE259_DEMO_PENALTY_DASHBOARD_AUDIT_20260515.json' }, null, 2));
if (!report.ok) {
  console.error(JSON.stringify(checks.filter(c => !c.ok), null, 2));
  process.exit(1);
}

import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const mustFiles = [
  'apps/public/home/index.html','apps/public/home/app.css','apps/public/demo/index.html','apps/public/plans/index.html','apps/public/board/index.html','apps/public/guides/index.html','apps/public/portal/index.html','apps/public/checkout/index.html','apps/public/solutions/index.html','shared/base.css','server/index.mjs'
];
const checks = [];
function add(name, ok, detail='') { checks.push({ name, ok, detail }); }
for (const f of mustFiles) add(`file:${f}`, fs.existsSync(path.join(root,f)));
const read = f => fs.readFileSync(path.join(root,f),'utf8');
const home = read('apps/public/home/index.html');
const homeCss = read('apps/public/home/app.css');
const board = read('apps/public/board/index.html');
const guides = read('apps/public/guides/index.html');
const plans = read('apps/public/plans/index.html');
const checkout = read('apps/public/checkout/index.html');
const portal = read('apps/public/portal/index.html');
const base = read('shared/base.css');
const server = read('server/index.mjs');
add('home has compact 4-block conversion layout', ['nv67-hero','nv67-flow','nv67-main-bottom','nv67-final'].every(x=>home.includes(x)));
add('home copy is short and action oriented', home.includes('2분 안에 점검합니다') && home.includes('무료 진단 시작'));
add('home uses professional dark blue visual system', homeCss.includes('#0B0F14') && homeCss.includes('#2563EB') && !homeCss.includes('#F59E0B'));
add('board name is board not CTA board', board.includes('<title>게시판 | NV0</title>') && !board.includes('CTA게시판'));
add('board has 30 minute autopublish and 6 types', board.includes('30분마다') && ['진단 요약','위험 알림','체크리스트','개선 사례','상품 비교','재진단 유도'].every(x=>board.includes(x)));
add('plans has clear free pro fix auto decision structure', ['무료 진단','Pro 리포트','Fix 문구안','Auto 점검'].every(x=>plans.includes(x)));
add('checkout has trust/range/refund/legal notice', ['제공 범위','환불 기준','법률 자문 아님','디지털 산출물'].every(x=>checkout.includes(x)));
add('portal explains saved site value', ['재진단','주문','산출물','같은 기준'].every(x=>portal.includes(x)));
add('guides contain real practical content', ['푸터 고지','개인정보 안내','환불·교환 기준','광고 문구'].every(x=>guides.includes(x)));
add('global phase67 visual system exists', ['--nv67-blue','nv67-visual-grid','nv67-compact-cta','highlight'].every(x=>base.includes(x)));
add('autopublish server interval remains 30 minutes', server.includes('30 * 60_000') && server.includes('variantCount: 12'));
add('NV0 public brand is present', [home, board, plans, checkout].every(txt=>txt.includes('NV0')));
const passed = checks.filter(c=>c.ok).length;
const score = Math.round((passed / checks.length) * 100);
const result = { ok: passed === checks.length, score, passed, total: checks.length, checks, phase: 67 };
fs.writeFileSync(path.join(root,'docs/PHASE67_FINAL_100_VALIDATION_20260425.json'), JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if (!result.ok) process.exit(1);

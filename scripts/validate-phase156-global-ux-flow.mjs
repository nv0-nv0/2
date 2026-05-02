import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
fs.mkdirSync(docsDir, { recursive: true });
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const checks = [];
const add = (name, ok, details = '') => checks.push({ name, ok: Boolean(ok), details });
const publicHtmlFiles = [
  'apps/public/home/index.html',
  'apps/public/veridion-demo/index.html',
  'apps/public/demo/index.html',
  'apps/public/plans/index.html',
  'apps/public/solutions/index.html',
  'apps/public/documents/index.html',
  'apps/public/board/index.html',
  'apps/public/guides/index.html',
  'apps/public/business-info/index.html',
  'apps/public/terms/index.html',
  'apps/public/privacy/index.html',
  'apps/public/refund/index.html',
  'apps/public/auth/index.html',
  'apps/public/portal/index.html',
  'apps/public/checkout/index.html'
];
for (const file of publicHtmlFiles) add(`exists:${file}`, exists(file), 'public route html must exist');
const html = publicHtmlFiles.filter(exists).map(read).join('\n');
const publicJs = [
  'apps/public/veridion-demo/app.js',
  'apps/public/checkout/app.js',
  'apps/public/guides/app.js',
  'shared/session-nav.js'
].filter(exists).map(read).join('\n');

for (const token of [
  '운영값 미입력',
  '확정 후 입력',
  '운영 예정',
  '버튼와',
  '버튼를',
  '상용 결제 전 입력 필요',
  '통신판매업 신고 완료 후 표시 예정',
  '호스팅 제공자 실제 운영 인프라 확정 후 입력 필요',
  'support@nv0.kr',
  'Why it matters',
  'Overview',
  'Next Step'
]) add(`no-public-token:${token}`, !html.includes(token) && !publicJs.includes(token), 'unfinished or unnatural visible copy must not remain');

const business = read('apps/public/business-info/index.html');
add('business:real-support-email', business.includes('ct@nv0.kr') && business.includes('이메일 전용 고객지원'));
add('business:real-hosting-provider', business.includes('호스팅 제공자') && business.includes('Contabo GmbH'));
add('business:no-mail-order-placeholder', !business.includes('통신판매업 신고번호</strong> 운영값') && !business.includes('표시 예정'));
add('business:operation-gate-copy', business.includes('운영 공개 기준') && business.includes('운영 환경값과 대조'));

const checkout = read('apps/public/checkout/index.html');
add('checkout:title-clean', checkout.includes('<title>서비스 신청 | NV0</title>'));
add('checkout:flow-clean', checkout.includes('결제 전 상품, 제공 결과물, 디지털 산출물 제공 고지, 환불 기준을 한 화면에서 확인합니다.'));
add('checkout:no-galaxia-pending-copy', !checkout.includes('운영 예정') && !checkout.includes('갤럭시아 결제 흐름'));
add('checkout:refund-consent', checkout.includes('산출물 제공이 시작되면 청약철회가 제한될 수 있음을 확인합니다'));

const guides = read('apps/public/guides/index.html');
add('guides:grammar-button-and', guides.includes('구매 안내 버튼과 상세페이지 필수 문구') && !guides.includes('버튼와'));

const demo = read('apps/public/veridion-demo/index.html') + read('apps/public/veridion-demo/app.js');
add('demo:result-flow', demo.includes('요약 결과 보기') && demo.includes('전체 결과') && demo.includes('내 사이트 관리'));
add('demo:no-awkward-mobile-copy', demo.includes('모바일에서 안내 버튼과 문구 가독성 확인'));

const server = read('server/index.mjs');
const sessionNav = read('shared/session-nav.js');
for (const route of ['/', '/products/veridion/demo', '/plans', '/solutions', '/documents', '/board', '/guides', '/business-info', '/auth', '/portal', '/checkout']) {
  add(`route:mapped:${route}`, server.includes(`'${route}'`) || server.includes(`"${route}"`) || server.includes(route));
}
for (const label of ['무료 진단', '내 사이트', '운영 게시판', '요금제', '문서 생성', '고객지원']) {
  add(`nav:label:${label}`, server.includes(label));
}
add('session-nav:logout-state', sessionNav.includes('로그아웃') && sessionNav.includes('/api/public/auth/logout') && sessionNav.includes('/api/public/auth/session'));
add('server:business-provider-fallback', server.includes("hostingProvider: process.env.NV0_HOSTING_PROVIDER || 'Contabo GmbH'"));
add('server:document-preview-fallback-natural', server.includes("'입력한 상호'") && server.includes("'대표자 또는 책임자'"));
add('server:plan-market-position-exposed', server.includes('marketPosition') && server.includes('valuePackWorth'));

const pkg = JSON.parse(read('package.json'));
for (const script of ['check:syntax', 'test:all', 'test:e2e', 'test:routes', 'check:links']) {
  add(`package:script:${script}`, Boolean(pkg.scripts?.[script]));
}

const report = {
  generatedAt: new Date().toISOString(),
  ok: checks.every(item => item.ok),
  phase: 'P156-global-ux-flow-reaudit',
  scope: 'public copy, UX route flow, session nav, business info, checkout copy, validation guard',
  total: checks.length,
  passed: checks.filter(item => item.ok).length,
  failed: checks.filter(item => !item.ok).length,
  checks,
  failures: checks.filter(item => !item.ok)
};
fs.writeFileSync(path.join(docsDir, 'PHASE156_GLOBAL_UX_FLOW_REAUDIT_VALIDATION_20260502.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, report: 'docs/PHASE156_GLOBAL_UX_FLOW_REAUDIT_VALIDATION_20260502.json' }, null, 2));
if (!report.ok) process.exit(1);

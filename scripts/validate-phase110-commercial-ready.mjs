import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function exists(file) { return fs.existsSync(path.join(root, file)); }
function add(name, ok, detail) { checks.push({ name, ok: !!ok, detail }); }

const server = read('server/index.mjs') + '\n' + read('server/core/account-rescan.mjs');
const portal = read('apps/public/portal/app.js') + '\n' + read('apps/public/portal/index.html');
const demo = read('apps/public/veridion-demo/app.js') + '\n' + read('apps/public/veridion-demo/index.html');
const publicRuntime = ['apps/public','server','shared'].flatMap(dir => {
  const out = [];
  const walk = d => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const abs = path.join(d, e.name);
      if (e.isDirectory()) walk(abs);
      else out.push(path.relative(root, abs).replaceAll('\\\\','/'));
    }
  };
  walk(path.join(root, dir));
  return out;
});

for (const token of ['통신판매업 신고 완료 후 표시 예정','상용 결제 전 입력 필요','호스팅 제공자 실제 운영 인프라 확정 후 입력 필요','support@nv0.kr','lorem ipsum','coming soon','준비중']) {
  const hit = publicRuntime.some(file => /\.(html|js|css|mjs|txt)$/i.test(file) && read(file).toLowerCase().includes(token.toLowerCase()));
  add(`runtime-banned-token:${token}`, !hit, '상용 런타임에 미완성/임시 문구가 없어야 한다.');
}

add('no-public-test-file', !publicRuntime.some(file => /(^|\/)test\.(txt|html|js|css)$/i.test(file)), '공개 앱 경로에 테스트 잔여 파일을 포함하지 않는다.');
add('member-api-list-sites', server.includes("pathname === '/api/public/account/sites' && req.method === 'GET'"), '회원 저장 사이트 조회 API가 있어야 한다.');
add('member-api-save-site', server.includes("pathname === '/api/public/account/sites' && req.method === 'POST'"), '회원 사이트 저장 API가 있어야 한다.');
add('member-api-delete-site', server.includes("pathname.startsWith('/api/public/account/sites/') && req.method === 'DELETE'"), '회원 저장 사이트 삭제 API가 있어야 한다.');
add('member-api-rescan', server.includes("pathname === '/api/public/account/rescan' && req.method === 'POST'"), '저장 사이트 재검사 API가 있어야 한다.');
add('member-session-required', (server.match(/로그인이 필요합니다\./g) || []).length >= 5, '회원 전용 API는 세션이 없으면 거부해야 한다.');
add('member-data-owner-filter', server.includes('link.customerId === customer.id') && server.includes('item.customerId === session.customer.id'), '회원별 데이터는 customerId 기준으로 분리되어야 한다.');
add('recent-scan-limit-five', server.includes('customerRecentScans(db, session.customer, 5)') && portal.includes('지난 검사 내역 5개'), '최근 검사 내역은 즉시 구현 범위인 5개로 제한한다.');
add('one-click-rescan-ui', portal.includes('다시 검사하기') && portal.includes('/api/public/account/rescan'), '포털 UI에서 원클릭 다시 검사를 제공한다.');
add('save-site-ui', portal.includes('사이트 등록') && portal.includes('/api/public/account/sites'), '포털 UI에서 내 사이트 저장 기능을 제공한다.');
add('nonmember-cta', demo.includes('회원가입하면') && demo.includes('로그인·회원가입') && demo.includes('내 사이트로 저장'), '비회원에게 저장/재검사 가치 CTA를 제공한다.');
add('auto-save-after-diagnosis', server.includes('if (customerSession?.customer) linkCustomerToSite') && server.includes('savedToAccount: !!customerSession?.customer'), '로그인 회원 진단 결과는 계정에 자동 연결되어야 한다.');
add('commercial-support-email', publicRuntime.some(file => /\.(html|js)$/i.test(file) && read(file).includes('ct@nv0.kr')), '확정 고객지원 이메일을 런타임에 표시한다.');
add('commercial-business-number', publicRuntime.some(file => /\.(html|js)$/i.test(file) && read(file).includes('584-77-00586')), '확정 사업자등록번호를 런타임에 표시한다.');
add('qa-rollback-doc', exists('docs/PHASE110_COMMERCIAL_READY_FINAL_REVIEW_20260427_KO.md'), '상용화 최종 검수/롤백 문서가 포함되어야 한다.');

const report = {
  generatedAt: new Date().toISOString(),
  ok: checks.every(c => c.ok),
  total: checks.length,
  passed: checks.filter(c => c.ok).length,
  failed: checks.filter(c => !c.ok).length,
  checks,
  limitation: '외부 실결제, 운영 DNS, 실제 PG 승인, 실서버 부하, 통신판매업 신고번호는 이 로컬 패키지 검증만으로 확정할 수 없으므로 운영 배포 전 별도 확인 대상이다.'
};
fs.writeFileSync(path.join(root, 'docs', 'PHASE110_COMMERCIAL_READY_VALIDATION_20260427.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);

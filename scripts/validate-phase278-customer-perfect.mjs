import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const publicHtmlFiles = fs.readdirSync(path.join(root, 'apps/public'), { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => `apps/public/${d.name}/index.html`)
  .filter(exists);
const visibleSource = publicHtmlFiles.map(read).join('\n') + '\n' + ['apps/public/portal/app.js','apps/public/board/app.js','apps/public/veridion-demo/app.js','server/routes/public.mjs','server/routes/payment.mjs'].map(read).join('\n');
const requiredMenu = ['위험 진단','서비스','요금 안내','인사이트','내 사이트','문의하기'];
for (const file of publicHtmlFiles) {
  const html = read(file);
  add(`${file}: brand VERIDION`, html.includes('VERIDION'));
  add(`${file}: original menu structure`, requiredMenu.every(item => html.includes(item)));
  add(`${file}: public header`, html.includes('class="nv0n-topbar"') && html.includes('nv0n-primary-nav'));
  add(`${file}: common footer`, html.includes('phase278-footer') && html.includes('ct@nv0.kr'));
}
const forbidden = [
  '작동되는 무료 진단 입력창을 맨 위에 배치했습니다','실제 진단 API','고정값은 제거','정적 예시 글','새 칼럼 엔진',
  '검색 visibility','AI 및 LLM 가시성','AI 가시성 현황','LLM 가시성','함께 성장합시다','새 액션 시작','무료 데모',
  'hello@nv0.kr','2024 VERIDION','nv0는 공개 웹페이지','로그인 페이지를 2열','검색 visibility','AI 및 LLM 가시성','법률·규제 리스크','리스크 후보','서비스·가이드','분석 프로세스','Fix 문구 세트','무료 진단 진단'
];
for (const token of forbidden) add(`forbidden removed: ${token}`, !visibleSource.includes(token));
add('brand product title is VERIDION', read('package.json').includes('VERIDION phase278'));
add('support email single public address', !visibleSource.includes('hello@nv0.kr') && visibleSource.includes('ct@nv0.kr'));
add('portal AI purpose removed', !read('apps/public/portal/app.js').includes('AI 가시성') && read('apps/public/portal/app.js').includes('고지, 환불, 개인정보 안내 상태'));
add('board loading customer copy', read('apps/public/board/app.js').includes('최신 인사이트를 불러오는 중입니다.'));
add('diagnostic customer headline', read('apps/public/veridion-demo/index.html').includes('사이트 주소만 입력하면 핵심 안내 공백을 바로 확인할 수 있습니다'));
add('stitch visual layer retained', read('shared/veridion-adopted-ui.css').includes('PHASE277 function and menu lock') || read('shared/veridion-adopted-ui.css').includes('PHASE276'));
add('phase278 visual correction layer', read('shared/veridion-adopted-ui.css').includes('PHASE278'));
const passed = checks.filter(c => c.ok).length;
const failed = checks.length - passed;
const report = { generatedAt: new Date().toISOString(), phase: 'phase278-customer-perfect', ok: failed === 0, total: checks.length, passed, failed, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE278_CUSTOMER_PERFECT_AUDIT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed, failed, report: 'docs/current/PHASE278_CUSTOMER_PERFECT_AUDIT.json' }, null, 2));
if (!report.ok) { console.error(JSON.stringify(checks.filter(c => !c.ok), null, 2)); process.exit(1); }

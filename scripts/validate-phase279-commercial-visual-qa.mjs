import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const checks = [];
const add = (name, ok, points, detail = '') => checks.push({ name, ok: !!ok, points, awarded: ok ? points : 0, detail });

const portal = read('apps/public/portal/index.html');
const css = read('shared/veridion-adopted-ui.css');
const server = read('server/index.mjs');
const publicHtmlFiles = fs.readdirSync(path.join(root, 'apps/public'), { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => `apps/public/${d.name}/index.html`)
  .filter(exists);

const indexOfRegister = portal.indexOf('portal-site-registration-priority');
const indexOfDashboard = portal.indexOf('portal-dashboard-grid');
const saveFormCount = (portal.match(/id="saveSiteForm"/g) || []).length;
const footerCount = (portal.match(/<footer\s+class="[^"]*phase278-footer/g) || []).length;
const navCount = publicHtmlFiles.filter(file => read(file).includes('nv0n-primary-nav')).length;

add('상용 구조: 공개 페이지 라우트/상단 메뉴 유지', navCount >= 17 && publicHtmlFiles.every(file => read(file).includes('VERIDION') && read(file).includes('nv0n-primary-nav')), 10, `topbarFiles=${navCount}`);
add('상용 구조: 포털 푸터 중복 제거 및 공통 푸터 유지', footerCount === 1 && portal.includes('mailto:ct@nv0.kr'), 10, `footerCount=${footerCount}`);

add('시인성: PHASE279 보호 레이어 적용', css.includes('PHASE279 commercial visual QA hardening'), 5);
add('시인성: 한글 줄바꿈/깨짐 방지', css.includes('word-break:keep-all!important') && css.includes('overflow-wrap:break-word!important'), 8);
add('시인성: 제목 폭 과소 제한 해제', css.includes('max-width:760px!important') && css.includes('line-height:1.18!important'), 6);
add('시인성: pre/notice/card 장문 안전 처리', css.includes('pre{white-space:pre-wrap!important') && css.includes('.portal-score-head{overflow:hidden!important}'), 6);

add('겹침 방지: 상단 메뉴 grid 재정렬', css.includes('grid-template-columns:auto minmax(0,1fr) auto!important'), 7);
add('겹침 방지: 모바일 absolute 버튼 해제', css.includes('position:static!important;right:auto!important;top:auto!important'), 6);
add('겹침 방지: sticky topbar 여백 충돌 제거', css.includes('body.nv0n-page,body.nv0-clean-slate{padding-top:0!important}'), 4);
add('겹침 방지: 모바일 액션/버튼 폭 안전 처리', css.includes('.nv0n-login-link,.nv0n-start-link{flex:1 1 0!important') && css.includes('width:100%!important'), 3);

add('포털 UX: 사이트 등록 영역이 대시보드보다 위', indexOfRegister > 0 && indexOfDashboard > indexOfRegister, 8, `register=${indexOfRegister}, dashboard=${indexOfDashboard}`);
add('포털 UX: 저장 폼 단일 ID 유지', saveFormCount === 1 && portal.includes('id="saveUrl"') && portal.includes('id="saveName"') && portal.includes('id="saveMemo"'), 4, `saveFormCount=${saveFormCount}`);
add('포털 UX: 등록 영역 전용 반응형 그리드', css.includes('.portal-site-registration-priority .bridge-grid') && css.includes('grid-template-columns:minmax(220px,1.15fr)'), 3);

add('브랜드/SEO: 서버 주입 타이틀 VERIDION 통일', server.includes("'/portal': { title: '내 사이트 관리 | VERIDION'") && !server.includes("'/portal': { title: '내 사이트 관리 | NV0'"), 4);
add('브랜드/SEO: OG/RSS/구조화 데이터 브랜드 통일', server.includes('<meta property="og:site_name" content="VERIDION">') && server.includes('<channel><title>VERIDION 게시판</title>') && server.includes("name: 'VERIDION'"), 4);
add('브랜드/SEO: 기존 NV0 법인 표기/환경 키는 보존', read('apps/public/business-info/index.html').includes('상호: 엔브이제로(NV0)') && server.includes('NV0_PUBLIC_BASE_URL'), 2);

add('회귀 방지: 기존 phase278 100점 감사 산출물 유지', exists('docs/current/PHASE278_CUSTOMER_PERFECT_AUDIT.json') && JSON.parse(read('docs/current/PHASE278_CUSTOMER_PERFECT_AUDIT.json')).ok === true, 4);
add('회귀 방지: 기존 phase277 메뉴 잠금 감사 산출물 유지', exists('docs/current/PHASE277_FUNCTION_MENU_LOCK_AUDIT.json') && JSON.parse(read('docs/current/PHASE277_FUNCTION_MENU_LOCK_AUDIT.json')).ok === true, 3);
add('회귀 방지: 패키지 스크립트/검증 엔트리 유지', read('package.json').includes('validate:phase279') && read('package.json').includes('phase278:final'), 3);

const score = checks.reduce((sum, c) => sum + c.awarded, 0);
const total = checks.reduce((sum, c) => sum + c.points, 0);
const failed = checks.filter(c => !c.ok);
const report = {
  generatedAt: new Date().toISOString(),
  phase: 'phase279-commercial-visual-qa',
  ok: failed.length === 0 && score === 100 && total === 100,
  score,
  total,
  passed: checks.length - failed.length,
  failed: failed.length,
  rubric: {
    commercialStructure: 20,
    readability: 25,
    overlapPrevention: 20,
    portalRegistrationPriority: 15,
    brandSeoConsistency: 10,
    regressionGuard: 10
  },
  checks
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE279_COMMERCIAL_VISUAL_QA_AUDIT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, score, total, passed: report.passed, failed: report.failed, report: 'docs/current/PHASE279_COMMERCIAL_VISUAL_QA_AUDIT.json' }, null, 2));
if (!report.ok) {
  console.error(JSON.stringify(failed, null, 2));
  process.exit(1);
}

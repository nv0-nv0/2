import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const failures = [];
const checks = [];
function read(file){ return fs.readFileSync(path.join(ROOT, file), 'utf8'); }
function check(name, ok, detail='') { checks.push({ name, ok, detail }); if (!ok) failures.push(`${name}${detail ? ': '+detail : ''}`); }

const css = read('shared/veridion-rebrand.css');
check('phase336-css-layer', css.includes('Phase336 visibility, premium UI and conversion hardening layer'));
check('dark-contrast-contract', css.includes('--vr-dark-text:#f7fbff') && css.includes('--vr-dark-muted:#c7d5e6'));
check('demo-result-css', css.includes('.demo-count-result') && css.includes('.demo-priority-card') && css.includes('.demo-paid-gate'));
check('board-card-css', css.includes('.vr-board-card:before') && css.includes('.vr-post-body'));
check('arc-no-broken-half-shape', css.includes('conic-gradient(var(--vr-success-bright) 0 82%'));

const board = read('apps/public/board/index.html');
check('board-indexable-static-articles', (board.match(/itemscope itemtype="https:\/\/schema.org\/Article"/g) || []).length >= 3);
check('board-seo-meta', board.includes('meta name="robots" content="index,follow') && board.includes('rel="canonical"'));
check('board-cta-structure', board.includes('사이트 무료 진단 실행') && (board.includes('요금제 보기') || board.includes('리포트 요금 보기')) && board.includes('검색 로봇'));
check('board-no-old-cadence-text', !/20분에\s*1회|20분\s*주기|자동\s*발행|운영\s*큐|백로그|TrustOps|rollback|canary|sentinel/i.test(board));

const boardJs = read('apps/public/board/app.js');
check('board-js-cleaner', boardJs.includes('cleanText') && boardJs.includes('정기 업데이트') && boardJs.includes('고객 포털'));
check('board-js-rich-fallbacks', (boardJs.match(/title:/g) || []).length >= 3 && boardJs.includes('검색 로봇이 잘 읽는 온라인 사업자 콘텐츠 구조'));

for (const file of ['apps/public/veridion-demo/index.html','apps/public/demo/index.html']) {
  const html = read(file);
  check(`${file}:demo-value-grid`, html.includes('demo-value-grid') && html.includes('문제 개수와 영역'));
  check(`${file}:demo-preview-grid`, html.includes('demo-preview-grid') && html.includes('기본 리포트'));
  check(`${file}:no-empty-demo`, !html.includes('정보가 전혀 없습니다'));
}
const demoJs = read('apps/public/veridion-demo/app.js') + '\n' + read('apps/public/demo/app.js');
check('demo-free-result-more-informative', demoJs.includes('고객이 결제 전에 불안해할 지점을 먼저 보여드립니다') && demoJs.includes('demo-result-explain-grid'));
check('demo-paid-gate-clear', demoJs.includes('상세 분석은 유료 리포트에서 열립니다') && demoJs.includes('페이지별 근거'));

const publicFiles = fs.readdirSync(path.join(ROOT, 'apps/public'), { withFileTypes: true })
  .filter(d => d.isDirectory())
  .flatMap(d => ['index.html'].map(f => `apps/public/${d.name}/${f}`))
  .filter(f => fs.existsSync(path.join(ROOT, f)));
for (const file of publicFiles) {
  const html = read(file);
  const footerCount = (html.match(/<footer\b/gi) || []).length;
  check(`${file}:single-footer`, footerCount === 1, `footerCount=${footerCount}`);
  check(`${file}:clean-rebrand`, html.includes('data-veridion-rebrand="clean"'));
}

const oldPublicText = /위험 진단|요금 안내|보안 점수88|성능 점수76|SEO 점수90|접근성 점수75|API 키 관리|20분에\s*1회|20분\s*주기|자동\s*발행|운영\s*큐|자동화\s*백로그|프로덕션\s*센티널|런칭\s*컨트롤/i;
for (const file of publicFiles) {
  const html = read(file);
  check(`${file}:no-visible-old-public-text`, !oldPublicText.test(html));
}

const result = { ok: failures.length === 0, phase: 'phase336-visibility-conversion', checked: checks.length, failed: failures.length, failures };
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
function ok(condition, message) {
  if (!condition) {
    console.error(`FAIL phase243: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`OK phase243: ${message}`);
  }
}
function allPublicTextFiles() {
  const out = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (entry.isFile() && ['.html', '.js', '.css'].includes(path.extname(entry.name))) out.push(rel);
    }
  };
  walk('apps/public');
  walk('shared');
  return out;
}

const pkg = JSON.parse(read('package.json'));
const board = read('apps/public/board/index.html');
const boardApp = read('apps/public/board/app.js');
const css = read('shared/nv0-clean-slate-20260512.css');
const routes = read('server/routes/public.mjs');
const server = read('server/index.mjs');
const cta = read('server/core/cta-publication.mjs');

ok(pkg.version.includes('phase243'), 'package version is phase243');
ok(pkg.scripts['phase243:final']?.includes('validate:phase243'), 'phase243 final script is registered');
ok(board.includes('<title>전환 개선 칼럼 게시판') && board.includes('20분에 1회 공개되는 전문가형 칼럼 게시판'), 'board title and description are reader-friendly');
ok(board.includes('결제 버튼 앞에서 고객이 멈추는 이유와 안내 문구 정리법'), 'board has SEO-readable static article 1');
ok(board.includes('문의폼에서 고객이 이탈하지 않게 만드는 개인정보 안내 구성'), 'board has SEO-readable static article 2');
ok(board.includes('모바일 화면에서 버튼과 정책 링크를 함께 보이게 배치하는 법'), 'board has SEO-readable static article 3');
ok(board.includes('data-board-stat="total"') && !board.includes('data-board-stat="autoPublished"'), 'visible stats remove auto-published count');
ok(!/자동\s*발행\s*200|자동발행\s*200|자동\s*발행\s*0|자동발행\s*0/.test(board), 'board has no stuck auto-publish count copy');
ok(board.includes('20분에 1회') && board.includes('발행 주기'), '20-minute cadence remains visible as a schedule');
ok(boardApp.includes('cleanBoardBodyForPublicDisplay'), 'client sanitizes public board body');
ok(!boardApp.includes('autoPublishedCount') && !boardApp.includes('data-board-stat="autoPublished"'), 'client does not render auto-published counter');
ok(!boardApp.includes('사이트 담당자 메모') && !boardApp.includes('contentFingerprint'), 'client source avoids explicit internal labels');
ok(css.includes('PHASE243') && css.includes('--phase243-blue:#2f6eea'), 'phase243 unified bright palette is present');
ok(css.includes('.phase239-board-layout{display:grid !important;grid-template-columns:minmax(0,1fr) 320px !important'), 'board layout uses wide reading column plus sidebar');
ok(css.includes('.phase239-board-list{display:grid !important;grid-template-columns:1fr !important'), 'board posts are one-column readable articles');
ok(css.includes('nv0-brand-mark') && css.includes('display:none !important'), 'upper-left decorative brand mark is hidden');

const boardReturnStart = routes.indexOf("if (pathname === '/api/public/board'");
const boardReturnEnd = routes.indexOf("if ((pathname === '/api/public/content'", boardReturnStart);
const boardRoute = routes.slice(boardReturnStart, boardReturnEnd);
ok(boardRoute.includes('publishIntervalMinutes: Math.round(CTA_AUTOPUBLISH_INTERVAL_MS / 60000)'), 'board API exposes 20-minute cadence minutes');
ok(boardRoute.includes('cadenceLabel') && boardRoute.includes('20분에 1회') || boardRoute.includes('분에 1회'), 'board API exposes reader-facing cadence label');
ok(!boardRoute.includes('autoPublishedCount') && !boardRoute.includes('combinationStats') && !boardRoute.includes('variants'), 'board API hides internal counters and generation metadata');
const postReturnStart = server.indexOf('function toPublicBoardPost');
const postReturnEnd = server.indexOf('\n}\n\nfunction buildGuidanceForSite', postReturnStart) + 2;
const publicPost = server.slice(postReturnStart, postReturnEnd);
ok(publicPost.includes('sanitizePublicBoardBody') && !publicPost.includes('...item') && !publicPost.includes('...source'), 'public board posts are allow-listed and sanitized');
ok(!/autoPublished\s*:/.test(publicPost), 'public post response does not expose autoPublished flag');
ok(!cta.includes('사이트 담당자 메모') && !cta.includes('제목 후보\n${titleText}'), 'generator no longer writes internal memo/title-candidate sections into public body');

const publicFiles = allPublicTextFiles();
const publicBundle = publicFiles.map(rel => read(rel)).join('\n');
for (const blocked of ['Customer View', 'Editorial Board', '자동발행', '자동 발행 200', '자동발행 200', 'autoPublishedCount', 'contentFingerprint', 'combinationMode', 'publicDisplayVersion', '검색 로봇']) {
  ok(!publicBundle.includes(blocked), `public bundle hides ${blocked}`);
}
ok(!/\bSEO\b|\bCTA\b/.test(publicBundle), 'public bundle avoids unexplained English operational acronyms');

if (process.exitCode) process.exit(process.exitCode);

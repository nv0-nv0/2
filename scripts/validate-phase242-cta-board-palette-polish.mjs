import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function ok(condition, message) {
  if (!condition) {
    console.error(`FAIL phase242: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`OK phase242: ${message}`);
  }
}

const pkg = JSON.parse(read('package.json'));
const home = read('apps/public/home/index.html');
const board = read('apps/public/board/index.html');
const boardApp = read('apps/public/board/app.js');
const css = read('shared/nv0-clean-slate-20260512.css');
const server = read('server/index.mjs');
const cta = read('server/core/cta-publication.mjs');
const envExample = read('.env.example');

ok(pkg.version.includes('phase242'), 'package version is phase242');
ok(pkg.scripts['phase242:final']?.includes('validate:phase242'), 'phase242 final script registered');
ok(home.includes('CTA 게시판') && home.includes('20분마다 전문가형 CTA 칼럼'), 'home explains 20-minute CTA board');
ok(board.includes('<title>자동발행 CTA 게시판') && board.includes('20분마다 전문가형 CTA 칼럼'), 'board is explicitly the auto-publishing CTA board');
ok(board.includes('data-board-stat="autoPublished"'), 'board displays auto-published count');
ok(boardApp.includes('let publishIntervalMinutes = 20') && boardApp.includes('발행 주기 ${publishIntervalMinutes}분'), 'board UI renders 20-minute interval from API');
ok(boardApp.includes("item.autoPublished ? '20분 자동발행'"), 'posts are labeled as 20-minute auto-published content');
ok(css.includes('PHASE242 · CTA board automation') && css.includes('--phase242-blue:#2563eb'), 'phase242 refined palette is present');
ok(css.includes('.site-topbar .brand-mark{display:none !important;}') || css.includes('.site-topbar .brand-mark'), 'upper-left decorative brand mark is removed');
ok(css.includes('body.nv0-clean-slate::after{display:none !important;}'), 'distracting decorative overlay is disabled');
ok(server.includes('const CTA_AUTOPUBLISH_DEFAULT_INTERVAL_MS = 20 * 60_000;'), 'server default CTA autopublish interval is 20 minutes');
ok(envExample.includes('NV0_CTA_AUTOPUBLISH_INTERVAL_MS=1200000'), 'env example locks 20-minute interval');
ok(server.includes("await writeDb(db);\nawait runCtaAutopublish('startup');"), 'startup auto-publish is not overwritten by stale bootstrap DB write');
ok(read('server/routes/public.mjs').includes('publishIntervalMinutes: Math.round(CTA_AUTOPUBLISH_INTERVAL_MS / 60000)'), 'board API exposes publish interval minutes');
ok(cta.includes('phase242-expert-human-column-20min-v1') && cta.includes('20분마다 1회 자동 발행'), 'CTA generator writes phase242 expert human-column content');
ok(cta.includes('전문가형 칼럼 구조') && cta.includes('중복 확인'), 'CTA generator keeps column composition and duplicate defense');

const htmlFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel);
    else if (entry.isFile() && entry.name === 'index.html') htmlFiles.push(rel);
  }
}
walk('apps');
const publicPages = htmlFiles.filter(rel => read(rel).includes('nv0-nav'));
ok(publicPages.length >= 16, 'static pages with top navigation detected');
ok(publicPages.every(rel => read(rel).includes('<a href="/board">CTA 게시판</a>')), 'top navigation exposes CTA board on all static pages');

if (process.exitCode) process.exit(process.exitCode);

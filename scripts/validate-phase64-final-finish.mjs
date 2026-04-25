import fs from 'node:fs';
const read = p => fs.readFileSync(p, 'utf8');
const home = read('apps/public/home/index.html');
const homeCss = read('apps/public/home/app.css');
const board = read('apps/public/board/index.html');
const server = read('server/index.mjs');
const portal = read('apps/public/portal/app.js');
const checks = [
  ['home infographic shell', home.includes('hero-infographic') && homeCss.includes('.hero-infographic')],
  ['short hero headline', home.includes('결제 전에') && home.includes('불안한 지점')],
  ['single main CTA', home.includes('무료 진단 시작')],
  ['risk preview visible', home.includes('Risk Preview') && home.includes('72')],
  ['5 check cards', (home.match(/<article><b>/g)||[]).length >= 5],
  ['board terminology', !home.includes('CTA게시판') && !board.includes('CTA게시판') && !portal.includes('CTA게시판')],
  ['board naming', board.includes('<div class="pill">게시판</div>')],
  ['30 minute copy', home.includes('30분마다') && board.includes('30분마다')],
  ['30 minute server interval', server.includes('30 * 60_000') && server.includes('publishIntervalMinutes')],
  ['12 publish variants', server.includes('variantCount: 12') && (server.match(/ctaType:/g)||[]).length >= 12],
  ['phase64 release marker', server.includes('phase64-final-finish-delivery')],
  ['board item metadata', server.includes('publishIntervalMs: CTA_AUTOPUBLISH_INTERVAL_MS')]
];
const failed = checks.filter(([,ok])=>!ok);
const result = { ok: failed.length === 0, score: failed.length === 0 ? 100 : Math.max(0, 100 - failed.length * 8), total: checks.length, passed: checks.length - failed.length, failed: failed.map(([name])=>name), checkedAt: new Date().toISOString() };
fs.writeFileSync('docs/PHASE64_FINAL_FINISH_VALIDATION_20260425.json', JSON.stringify(result,null,2));
if (!result.ok) { console.error(JSON.stringify(result,null,2)); process.exit(1); }
console.log(JSON.stringify(result,null,2));

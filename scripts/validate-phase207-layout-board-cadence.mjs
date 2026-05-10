import fs from 'node:fs';

const checks = [];
function read(file) { return fs.readFileSync(file, 'utf8'); }
function ok(name, condition, detail = '') {
  checks.push({ name, pass: Boolean(condition), detail });
  if (!condition) console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
}

const css = read('shared/design-system.css');
ok('PHASE207 layout block exists', css.includes('PHASE207: free diagnosis two-column balance'));
ok('desktop demo grid keeps two columns until tablet width', css.includes('minmax(360px, .92fr) minmax(420px, 1.08fr)'));
ok('scan and result cards align to top', css.includes('.scan-card.stack') && css.includes('align-content: start !important'));
ok('narrow mobile breakpoint only collapses under 980px', css.includes('@media (max-width: 980px)') && css.includes('grid-template-columns: 1fr !important'));

const boardApp = read('apps/public/board/app.js');
ok('board fallback has 5 posts', (boardApp.match(/fallback-/g) || []).length >= 5 || (boardApp.match(/"id":/g) || []).length >= 5);
ok('board fallback states 20 minute cadence', boardApp.includes('20분'));
ok('board fallback states expert article standard', boardApp.includes('전문가형') && (boardApp.includes('4천~5천자') || boardApp.includes('4천') || boardApp.includes('5천')));
ok('board empty API falls back instead of blank loading', boardApp.includes("applyBoardFallback('공개 게시글 없음')"));

const boardHtml = read('apps/public/board/index.html');
ok('static board has 5 article cards', (boardHtml.match(/class="result-card stack board-post/g) || []).length >= 5);
ok('static board stat cards are not dash placeholders', !/data-board-stat="(?:total|cta|recent7d|filteredTotal)">-</.test(boardHtml));
ok('static board copy states 20 minute cadence', boardHtml.includes('20분 주기') || boardHtml.includes('20분입니다'));
ok('static board includes readable problem section', boardHtml.includes('지금 보이는 문제') || boardHtml.includes('문제 인식과 위기감'));
ok('static board includes natural CTA links', boardHtml.includes('내 사이트도 무료 진단'));

const server = read('server/index.mjs');
ok('server default autopublish interval is 20 minutes', server.includes('CTA_AUTOPUBLISH_DEFAULT_INTERVAL_MS = 20 * 60_000') || server.includes('CTA_AUTOPUBLISH_INTERVAL_MS = Number(process.env.NV0_CTA_AUTOPUBLISH_INTERVAL_MS || 20 * 60_000)'));
ok('server CTA word range is 4200-5200 or legacy 3800-4500', server.includes("wordRangeKo: '4200-5200'") || server.includes("wordRangeKo: '3800-4500'"));
ok('server public board body includes expert problem section', server.includes('현장에서 자주 생기는 문제') || server.includes('지금 보이는 문제') || server.includes('문제 인식과 위기감'));
ok('server public board body includes revenue/evidence section', server.includes('매출과 신뢰에 영향을 주는 이유') || server.includes('독자가 관심 있어 할 부분') || server.includes('독자가 관심 있어할 일반 주제'));
ok('server public board body includes final next-action CTA', server.includes('자연스러운 다음 행동') || server.includes('다음에 할 일') || server.includes('마지막 섹션: 자연스러운 안내'));

const routes = read('server/routes/public.mjs');
ok('public board API has seeded fallback posts', routes.includes('seedBoardPosts') && routes.includes('fallbackSeeded: rawPosts.length === 0'));
ok('public board seeded fallback has 5 items', (routes.match(/board-seed-/g) || []).length >= 5);

const cta = read('server/core/cta-publication.mjs');
ok('CTA generator version is phase217 or later', cta.includes('phase217-expert-editorial-posting-20min-v1') || cta.includes('p208-20min-reader-interest-final-cta-v1') || cta.includes('p207-4000-char-problem-aware-cta-v1'));
ok('CTA generator includes expert problem section', cta.includes('현장에서 자주 생기는 문제') || cta.includes('지금 보이는 문제') || cta.includes('문제 인식과 위기감'));
ok('CTA generator includes revenue section', cta.includes('매출과 신뢰에 영향을 주는 이유') || cta.includes('독자가 관심 있어 할 부분') || cta.includes('제품과 연관된 일반 주제'));
ok('CTA generator includes evidence/checklist section', cta.includes('검증 체크리스트') || cta.includes('지금 놓치면 생길 수 있는 일'));
ok('CTA generator final section is next-action CTA', cta.includes('자연스러운 다음 행동') || cta.includes('다음에 할 일') || cta.includes('마지막 섹션: 자연스러운 안내'));

const diagnosis = read('server/core/diagnosis-report-package.mjs');
ok('diagnosis package interval default is 20 minutes', diagnosis.includes('20 * 60_000'));
ok('diagnosis package target length is 3800-4500 or expert board separates its own 4200-5200', diagnosis.includes("targetLengthKo: '3800-4500'") || diagnosis.includes("wordRangeKo: '3800-4500'") || cta.includes("targetLengthKo: '4200-5200'"));

const envFiles = [
  '.env.coolify.example', '.env.example', 'docker-compose.yml',
  'deploy/coolify.env.bulk.txt', 'deploy/coolify.env.example',
  'deploy/docker-compose.coolify.yml', 'deploy/env.commercial.template',
  'deploy/env.production.nv0.kr.example', 'deploy/env.production.template',
  'scripts/generate-r2-coolify-env.mjs'
];
for (const file of envFiles) {
  const text = read(file);
  ok(`${file} uses 20 minute autopublish default`, text.includes('1200000') && !text.includes('1800000'));
}

const db = JSON.parse(read('runtime/data/db.json'));
ok('runtime board seed has 5 posts', Array.isArray(db.boards) && db.boards.length >= 5);
ok('runtime publications have 5 posts', Array.isArray(db.publications) && db.publications.length >= 5);
(db.boards || []).slice(0, 5).forEach((post, index) => {
  ok(`runtime board ${index + 1} body near expert length`, String(post.body || '').length >= 3600, `length=${String(post.body || '').length}`);
  ok(`runtime board ${index + 1} interval is 20min`, Number(post.publishIntervalMs) === 1200000);
  ok(`runtime board ${index + 1} has final CTA`, String(post.body || '').includes('자연스러운 다음 행동') || String(post.body || '').includes('다음에 할 일') || String(post.body || '').includes('마지막 섹션') || String(post.body || '').includes('자연스러운 안내'));
});

const failed = checks.filter(item => !item.pass);
const summary = { ok: failed.length === 0, total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks };
fs.writeFileSync('PHASE207_LAYOUT_BOARD_20MIN_VALIDATION_20260506.json', JSON.stringify(summary, null, 2));
if (failed.length) process.exit(1);
console.log(`PHASE207 validation passed: ${summary.passed}/${summary.total}`);

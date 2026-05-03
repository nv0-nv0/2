import fs from 'node:fs';
import path from 'node:path';
import { buildCtaBoardArticle, chooseCtaVariant, auditHumanFriendlyCtaArticle } from '../server/core/cta-publication.mjs';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
const ok = (name, condition, detail = '') => checks.push({ name, ok: Boolean(condition), detail });

const app = read('apps/public/veridion-demo/app.js');
const css = read('apps/public/veridion-demo/app.css');
const board = read('apps/public/board/app.js');
const cta = read('server/core/cta-publication.mjs');
const index = read('server/index.mjs');
const spec = JSON.parse(read('server/contracts/result-ui-copy-spec.phase177.json'));
const seed = JSON.parse(read('runtime/data/db.seed.json'));
const pkg = JSON.parse(read('package.json'));

ok('result summary renderer exists', app.includes('renderDiscoverySummary') && app.includes('확인된 요소') && app.includes('누락 의심') && app.includes('검토 필요'));
ok('finding cards show concrete elements', app.includes('topicElementsFor') && app.includes('detected-element-list') && app.includes('환불 가능 조건') && app.includes('수집 항목'));
ok('automation copy no longer uses notice-only cards', !app.includes('<b>고지</b>') && app.includes('<b>확인됨</b>') && app.includes('<b>검토 필요</b>'));
ok('css supports discovery summary', css.includes('discovery-kpi-grid') && css.includes('detected-element-list') && css.includes('result-label'));
ok('board renderer supports phase177 headings', board.includes('왜 이 글을 썼나요') && board.includes('실제로 확인할 요소') && board.includes('검색에 잘 읽히게 정리하는 방법'));
ok('cta generator has phase177 sections', cta.includes('실제로 확인할 요소') && cta.includes('검색에 잘 읽히게 정리하는 방법') && cta.includes('articleThemeFromKeyword'));
ok('index public board fallback upgraded', index.includes('실제로 확인할 요소') && index.includes('phase177-helpful-search-friendly-board'));
ok('json ui spec exists', spec.version === 'phase177-result-ui-copy-and-search-friendly-board-v1' && spec.resultUi.findingLabels.includes('누락 의심'));
ok('package script registered', pkg.scripts['validate:phase177'] === 'node scripts/validate-phase177-result-ui-cta-search.mjs');

const sampleScan = {
  requestId: 'phase177-sample',
  target: 'https://sample-shop.kr',
  industry: '온라인 쇼핑몰',
  totalFindings: 5,
  topFindings: ['환불 안내 위치가 낮음', '문의 경로 부족', '개인정보 안내가 눈에 잘 보이지 않음'],
  detailFindings: [{ title: '환불 안내 위치가 낮음' }, { title: '문의 경로 부족' }, { title: '개인정보 안내가 눈에 잘 보이지 않음' }]
};
const articles = [];
for (let i = 0; i < 40; i += 1) {
  const variant = chooseCtaVariant({ boards: articles }, { seed: `phase177-${i}`, sequenceOffset: i });
  const article = buildCtaBoardArticle(sampleScan, variant, { seed: `phase177-${i}`, sequenceOffset: i });
  articles.push(article);
  const audit = auditHumanFriendlyCtaArticle(article);
  ok(`generated article ${i} readable`, audit.ok, JSON.stringify(audit));
  ok(`generated article ${i} has elements`, article.body.includes('실제로 확인할 요소') && article.body.includes('문구를 쉽게 바꾸는 방법') && article.body.includes('관련 링크'));
  ok(`generated article ${i} has phase177 marker`, article.searchFriendlyVersion === 'p177-result-copy-and-search-friendly-board-v1' && article.publicDisplayVersion === 'phase177-helpful-search-friendly-board');
}
ok('generated title diversity', new Set(articles.map(item => item.title)).size >= 38);
ok('generated body diversity', new Set(articles.map(item => item.contentFingerprint)).size === articles.length);

const publicRows = [...(seed.publications || []), ...(seed.boards || [])].filter(row => row?.visibility !== 'private');
ok('seed contains public posts', publicRows.length >= 8);
ok('seed posts use phase177 display', publicRows.slice(0, 8).every(row => row.publicDisplayVersion === 'phase177-helpful-search-friendly-board' || String(row.body || '').includes('실제로 확인할 요소')));
ok('seed posts are not old thin copy', publicRows.slice(0, 8).every(row => String(row.body || '').includes('한눈에 보는 핵심 요약') && String(row.body || '').includes('자주 묻는 질문') && String(row.body || '').length > 1200));

const banned = ['contentFingerprint', 'fingerprint', '퍼널', '아키타입', '메타 설명 후보'];
const offender = publicRows.slice(0, 8).find(row => banned.some(word => String(row.body || '').includes(word)));
ok('public posts avoid internal jargon', !offender, offender?.title || '');

const report = {
  generatedAt: new Date().toISOString(),
  ok: checks.every(item => item.ok),
  phase: 'P177-result-ui-cta-search',
  total: checks.length,
  passed: checks.filter(item => item.ok).length,
  failed: checks.filter(item => !item.ok).length,
  checks,
  failures: checks.filter(item => !item.ok)
};
fs.writeFileSync(path.join(root, 'PHASE177_RESULT_UI_CTA_SEARCH_VALIDATION_20260503.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, report: 'PHASE177_RESULT_UI_CTA_SEARCH_VALIDATION_20260503.json' }, null, 2));
if (!report.ok) process.exit(1);

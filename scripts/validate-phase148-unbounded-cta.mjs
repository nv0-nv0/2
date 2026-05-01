import { buildCtaBoardArticle, chooseCtaVariant, ctaCombinationStats, ctaTopicPacks } from '../server/core/cta-publication.mjs';
import { readFileSync } from 'node:fs';

const failures = [];
function check(name, condition, detail = '') {
  if (!condition) failures.push({ name, detail });
}

const server = readFileSync(new URL('../server/index.mjs', import.meta.url), 'utf8');
const board = readFileSync(new URL('../apps/public/board/app.js', import.meta.url), 'utf8');
const cta = readFileSync(new URL('../server/core/cta-publication.mjs', import.meta.url), 'utf8');

check('engine_version_present', cta.includes('cta-board-v8.0-unbounded-combinatorial-seo'));
check('combination_stats_exported', cta.includes('export function ctaCombinationStats'));
check('server_imports_combination_stats', server.includes('ctaCombinationStats'));
check('board_displays_unbounded_mode', board.includes('무한 조합형 생성'));
check('publication_loop_expanded', server.includes('offset < 144'));

const stats = ctaCombinationStats();
check('topic_pack_count_24', ctaTopicPacks().length >= 24, `topicPackCount=${ctaTopicPacks().length}`);
check('finite_floor_large', stats.finiteTemplateFloor >= 1000000, `finiteTemplateFloor=${stats.finiteTemplateFloor}`);
check('theoretical_unbounded', String(stats.theoreticalCombinations).includes('unbounded'));

const scan = {
  requestId: 'phase148-scan',
  target: 'https://nv0.kr',
  industry: '온라인 사업',
  riskScore: 62,
  totalFindings: 5,
  topFindings: ['환불 정책', '개인정보 안내', 'CTA 위치'],
  detailFindings: [{ title: '환불 정책' }, { title: '개인정보 안내' }, { title: 'CTA 위치' }]
};
const db = { publications: [], boards: [] };
const titles = new Set();
const bodies = new Set();
const types = new Set();
const combos = new Set();
const intents = new Set();
const archetypes = new Set();
const audiences = new Set();
for (let i = 0; i < 240; i += 1) {
  const variant = chooseCtaVariant(db, { seed: `phase148-${i}`, sequenceOffset: i, scan });
  const article = buildCtaBoardArticle(scan, variant, { seed: `phase148-${i}`, sequenceOffset: i });
  titles.add(article.title);
  bodies.add(article.contentFingerprint);
  types.add(article.ctaType);
  combos.add(article.combinationKey);
  intents.add(article.seo?.searchIntent);
  archetypes.add(article.contentArchetype || article.seo?.contentArchetype);
  audiences.add(article.audienceSegment || article.seo?.audienceSegment);
  db.boards.unshift({ ...article, createdAt: new Date(Date.now() + i).toISOString(), autoPublished: true });
}
check('sample_titles_unique_240', titles.size === 240, `titles=${titles.size}`);
check('sample_bodies_unique_240', bodies.size === 240, `bodies=${bodies.size}`);
check('sample_cta_types_unique_240', types.size === 240, `types=${types.size}`);
check('sample_combinations_unique_240', combos.size === 240, `combos=${combos.size}`);
check('intent_variety', intents.size >= 6, `intents=${intents.size}`);
check('archetype_variety', archetypes.size >= 8, `archetypes=${archetypes.size}`);
check('audience_variety', audiences.size >= 10, `audiences=${audiences.size}`);

if (failures.length) {
  console.error(JSON.stringify({ ok: false, phase: 148, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  phase: 148,
  engineVersion: stats.engineVersion,
  topicPackCount: ctaTopicPacks().length,
  finiteTemplateFloor: stats.finiteTemplateFloor,
  theoreticalCombinations: stats.theoreticalCombinations,
  sampleSize: 240,
  uniqueTitles: titles.size,
  uniqueBodies: bodies.size,
  uniqueCtaTypes: types.size,
  uniqueCombinationKeys: combos.size,
  searchIntentVariety: intents.size,
  archetypeVariety: archetypes.size,
  audienceVariety: audiences.size
}, null, 2));

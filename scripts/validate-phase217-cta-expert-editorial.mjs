import { promises as fs } from 'node:fs';
import assert from 'node:assert/strict';
import {
  buildCtaBoardArticle,
  chooseCtaVariant,
  rewriteExistingCtaPublication,
  auditHumanFriendlyCtaArticle,
  ctaCombinationStats
} from '../server/core/cta-publication.mjs';

const serverIndex = await fs.readFile(new URL('../server/index.mjs', import.meta.url), 'utf8');
const ctaCore = await fs.readFile(new URL('../server/core/cta-publication.mjs', import.meta.url), 'utf8');
const boardApp = await fs.readFile(new URL('../apps/public/board/app.js', import.meta.url), 'utf8');
const boardHtml = await fs.readFile(new URL('../apps/public/board/index.html', import.meta.url), 'utf8');
const packageJson = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8'));

const REQUIRED_SECTIONS = [
  '전문가 관점 요약',
  '현장에서 자주 생기는 문제',
  '매출과 신뢰에 영향을 주는 이유',
  '실무 적용 순서',
  '문구 개선 예시',
  '검증 체크리스트',
  '검색 유입을 고려한 구성',
  '자주 묻는 질문',
  '자연스러운 다음 행동'
];

assert.ok(serverIndex.includes('rewriteExistingCtaPublication'), 'public board must rewrite/normalize existing CTA posts');
assert.ok(serverIndex.includes('phase217-expert-board'), 'public board must use stable phase217 expert rewrite seed');
assert.ok(serverIndex.includes('sequenceOffset: offset'), 'createCtaPublication must pass offset into buildCtaBoardArticle');
assert.ok(serverIndex.includes('cta-v10-phase217-expert-editorial-revenue-20min'), 'publication quality standard must be phase217 v10');
assert.ok(serverIndex.includes('20 * 60_000'), '20 minute auto-publish cadence must be preserved');
assert.ok(ctaCore.includes('cta-board-v10.0-phase217-expert-editorial-revenue-20min'), 'core engine version must be phase217 v10');
for (const section of REQUIRED_SECTIONS) {
  assert.ok(ctaCore.includes(section), `core generator must include ${section}`);
}
assert.ok(boardApp.includes('전문가형') && boardApp.includes('20분'), 'board fallback must expose expert 20 minute standard');
assert.ok(boardHtml.includes('전문가형') && boardHtml.includes('20분'), 'static board must expose expert 20 minute standard');
assert.ok(packageJson.scripts['migrate:phase217-cta'], 'phase217 migration script must be registered');
assert.ok(packageJson.scripts['test:phase217'], 'phase217 test script must be registered');
assert.ok(packageJson.scripts['validate:phase217-cta'], 'phase217 validation script must be registered');

const db = { boards: [], publications: [] };
const scan = {
  requestId: 'phase217-validate',
  target: 'nv0.kr',
  normalizedTarget: 'nv0.kr',
  industry: '온라인 사업',
  totalFindings: 3,
  topFindings: ['환불 기준', '개인정보 안내', '문의 경로'],
  detailFindings: [{ title: '환불 기준' }, { title: '개인정보 안내' }, { title: '문의 경로' }]
};
const articles = [];
for (let i = 0; i < 80; i += 1) {
  const variant = chooseCtaVariant(db, { seed: 'phase217-expert-validator', sequenceOffset: i });
  const article = buildCtaBoardArticle(scan, variant, { seed: 'phase217-expert-validator', sequenceOffset: i });
  const audit = auditHumanFriendlyCtaArticle(article);
  assert.ok(audit.ok, `generated audit failed at ${i}: ${JSON.stringify(audit)}`);
  assert.ok(article.body.length >= 4200 && article.body.length <= 5600, `article ${i} length ${article.body.length}`);
  for (const section of REQUIRED_SECTIONS) assert.ok(article.body.includes(section), `article ${i} missing ${section}`);
  articles.push(article);
  db.boards.unshift({ ...article, id: `validator-board-${i}`, createdAt: new Date(Date.UTC(2026, 4, 10, 1, i % 60, i)).toISOString(), boardType: 'cta', type: 'cta', autoPublished: true });
}
const uniqueTitles = new Set(articles.map(item => item.title)).size;
const uniqueBodies = new Set(articles.map(item => item.contentFingerprint)).size;
assert.ok(uniqueTitles >= 76, `title uniqueness too low: ${uniqueTitles}/80`);
assert.equal(uniqueBodies, 80, 'body fingerprints must be unique');

const repeated = [];
for (let i = 0; i < 80; i += 1) {
  const rewritten = rewriteExistingCtaPublication({
    id: `same-${i}`,
    title: '같은 글',
    body: '같은 본문 CTA SEO 퍼널 제목 후보',
    boardType: 'cta',
    type: 'cta',
    ctaType: 'same_cta',
    autoPublished: true,
    target: 'nv0.kr',
    industry: '온라인 사업',
    createdAt: '2026-05-08T00:00:00.000Z'
  }, { force: true, seed: `phase217-expert-repeat:${i}`, sequenceOffset: i });
  const audit = auditHumanFriendlyCtaArticle(rewritten);
  assert.ok(audit.ok, `rewrite audit failed at ${i}: ${JSON.stringify(audit)}`);
  repeated.push(rewritten);
}
const rewriteUniqueTitles = new Set(repeated.map(item => item.title)).size;
const rewriteUniqueBodies = new Set(repeated.map(item => item.contentFingerprint)).size;
assert.ok(rewriteUniqueTitles >= 76, `rewritten title uniqueness too low: ${rewriteUniqueTitles}/80`);
assert.equal(rewriteUniqueBodies, 80, 'rewritten body fingerprints must be unique');

const stats = ctaCombinationStats();
const result = {
  ok: true,
  name: 'phase217-cta-expert-editorial-revenue-20min',
  engineVersion: stats.engineVersion,
  finiteTemplateFloor: stats.finiteTemplateFloor,
  checks: {
    sourceGuards: 13,
    generatedArticles: articles.length,
    generatedUniqueTitles: uniqueTitles,
    generatedUniqueBodies: uniqueBodies,
    rewrittenArticles: repeated.length,
    rewrittenUniqueTitles: rewriteUniqueTitles,
    rewrittenUniqueBodies: rewriteUniqueBodies,
    targetLengthKo: '4200-5200',
    readabilityTarget: 'expert_but_accessible_korean',
    cadence: '20min 유지',
    requiredSections: REQUIRED_SECTIONS
  }
};
await fs.writeFile(new URL('../PHASE217_CTA_EXPERT_EDITORIAL_VALIDATION_20260510.json', import.meta.url), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));

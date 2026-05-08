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
const packageJson = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8'));

assert.ok(serverIndex.includes('rewriteExistingCtaPublication'), 'public board must use rewriteExistingCtaPublication');
assert.ok(serverIndex.includes('phase210-public-board'), 'public board must use stable phase210 display rewrite seed');
assert.ok(serverIndex.includes('sequenceOffset: offset'), 'createCtaPublication must pass offset into buildCtaBoardArticle');
assert.ok(serverIndex.includes('cta-v9-phase210-diverse-professional-4000'), 'publication quality standard must be phase210 v9');
assert.ok(ctaCore.includes('cta-board-v9.0-phase210-diverse-professional-4000'), 'core engine version must be phase210 v9');
assert.ok(ctaCore.includes('중학생도 이해할 수 있게 말하면'), 'middle-school explanation section required');
assert.ok(ctaCore.includes('전문적으로 보면'), 'professional interpretation section required');
assert.ok(packageJson.scripts['migrate:phase210-cta'], 'migration script must be registered');
assert.ok(packageJson.scripts['test:phase210'], 'test script must be registered');

const db = { boards: [], publications: [] };
const scan = {
  requestId: 'phase210-validate',
  target: 'nv0.kr',
  normalizedTarget: 'nv0.kr',
  industry: '온라인 사업',
  totalFindings: 3,
  topFindings: ['환불 기준', '개인정보 안내', '문의 경로'],
  detailFindings: [{ title: '환불 기준' }, { title: '개인정보 안내' }, { title: '문의 경로' }]
};
const articles = [];
for (let i = 0; i < 80; i += 1) {
  const variant = chooseCtaVariant(db, { seed: 'phase210-validator', sequenceOffset: i });
  const article = buildCtaBoardArticle(scan, variant, { seed: 'phase210-validator', sequenceOffset: i });
  const audit = auditHumanFriendlyCtaArticle(article);
  assert.ok(audit.ok, `generated audit failed at ${i}: ${JSON.stringify(audit)}`);
  assert.ok(article.body.length >= 3800 && article.body.length <= 4500, `article ${i} length ${article.body.length}`);
  articles.push(article);
  db.boards.unshift({ ...article, id: `validator-board-${i}`, createdAt: new Date(Date.UTC(2026, 4, 8, 1, i % 60, i)).toISOString(), boardType: 'cta', type: 'cta', autoPublished: true });
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
  }, { force: true, seed: `phase210-repeat:${i}`, sequenceOffset: i });
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
  name: 'phase210-cta-diversity-professional-4000',
  engineVersion: stats.engineVersion,
  finiteTemplateFloor: stats.finiteTemplateFloor,
  checks: {
    sourceGuards: 9,
    generatedArticles: articles.length,
    generatedUniqueTitles: uniqueTitles,
    generatedUniqueBodies: uniqueBodies,
    rewrittenArticles: repeated.length,
    rewrittenUniqueTitles: rewriteUniqueTitles,
    rewrittenUniqueBodies: rewriteUniqueBodies,
    targetLengthKo: '3800-4500',
    readabilityTarget: 'middle_school_korean'
  }
};
await fs.writeFile(new URL('../PHASE210_CTA_DIVERSITY_VALIDATION_20260508.json', import.meta.url), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));

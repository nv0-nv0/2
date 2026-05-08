import assert from 'node:assert/strict';
import {
  buildCtaBoardArticle,
  chooseCtaVariant,
  rewriteExistingCtaPublication,
  auditHumanFriendlyCtaArticle,
  ctaCombinationStats
} from '../server/core/cta-publication.mjs';

const repeatedScan = {
  requestId: 'phase210-repeated-scan',
  target: 'nv0.kr',
  normalizedTarget: 'nv0.kr',
  industry: '온라인 사업',
  totalFindings: 3,
  topFindings: ['환불 기준', '개인정보 안내', '문의 경로'],
  detailFindings: [
    { title: '환불 기준' },
    { title: '개인정보 안내' },
    { title: '문의 경로' }
  ]
};

function ctaLikeItem(i) {
  return {
    id: `duplicate-board-${String(i).padStart(3, '0')}`,
    title: '같은 CTA 게시글',
    body: '제목 후보\n같은 내용\n\nCTA\n무료 진단으로 확인하세요.',
    summary: '같은 내용',
    boardType: 'cta',
    type: 'cta',
    ctaType: 'duplicate_cta',
    primaryKeyword: '사이트 점검',
    target: 'nv0.kr',
    industry: '온라인 사업',
    autoPublished: true,
    visibility: 'public',
    createdAt: `2026-05-08T00:${String(i % 60).padStart(2, '0')}:00.000Z`
  };
}

const stats = ctaCombinationStats();
assert.equal(stats.engineVersion, 'cta-board-v9.0-phase210-diverse-professional-4000');
assert.ok(stats.finiteTemplateFloor > 100_000_000, '조합 바닥값이 충분히 커야 합니다.');

const db = { boards: [], publications: [] };
const generated = [];
for (let i = 0; i < 200; i += 1) {
  const variant = chooseCtaVariant(db, { seed: 'phase210-generation-test', sequenceOffset: i });
  const article = buildCtaBoardArticle(repeatedScan, variant, { seed: 'phase210-generation-test', sequenceOffset: i });
  const audit = auditHumanFriendlyCtaArticle(article);
  assert.ok(audit.ok, `generated article ${i} failed audit: ${JSON.stringify(audit)}`);
  assert.ok(article.body.length >= 3800 && article.body.length <= 4500, `generated article ${i} length out of range: ${article.body.length}`);
  assert.ok(article.body.includes('중학생도 이해할 수 있게 말하면'));
  assert.ok(article.body.includes('전문적으로 보면'));
  assert.ok(article.body.includes('다음에 할 일'));
  generated.push(article);
  db.boards.unshift({ ...article, id: `board-${i}`, title: article.title, body: article.body, createdAt: new Date(Date.UTC(2026, 4, 8, 0, i % 60, i)).toISOString(), autoPublished: true, boardType: 'cta', type: 'cta' });
}

const generatedTitles = new Set(generated.map(item => item.title));
const generatedBodies = new Set(generated.map(item => item.contentFingerprint));
assert.ok(generatedTitles.size >= 190, `generated title diversity too low: ${generatedTitles.size}`);
assert.equal(generatedBodies.size, 200, 'generated bodies must be unique');

const migrated = [];
for (let i = 0; i < 200; i += 1) {
  const rewritten = rewriteExistingCtaPublication(ctaLikeItem(i), {
    force: true,
    seed: `phase210-migration-test:${i}`,
    sequenceOffset: i,
    rewrittenAt: '2026-05-08T09:00:00.000Z'
  });
  const audit = auditHumanFriendlyCtaArticle(rewritten);
  assert.ok(audit.ok, `rewritten article ${i} failed audit: ${JSON.stringify(audit)}`);
  assert.ok(rewritten.body.length >= 3800 && rewritten.body.length <= 4500, `rewritten article ${i} length out of range: ${rewritten.body.length}`);
  assert.notEqual(rewritten.title, '같은 CTA 게시글');
  migrated.push(rewritten);
}
const migratedTitles = new Set(migrated.map(item => item.title));
const migratedBodies = new Set(migrated.map(item => item.contentFingerprint));
assert.ok(migratedTitles.size >= 190, `migrated title diversity too low: ${migratedTitles.size}`);
assert.equal(migratedBodies.size, 200, 'migrated bodies must be unique');

console.log(JSON.stringify({
  ok: true,
  test: 'phase210-cta-diversity-4000',
  generated: { count: generated.length, uniqueTitles: generatedTitles.size, uniqueBodies: generatedBodies.size },
  migrated: { count: migrated.length, uniqueTitles: migratedTitles.size, uniqueBodies: migratedBodies.size },
  engineVersion: stats.engineVersion,
  finiteTemplateFloor: stats.finiteTemplateFloor
}, null, 2));

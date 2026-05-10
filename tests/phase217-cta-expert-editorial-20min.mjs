import assert from 'node:assert/strict';
import {
  buildCtaBoardArticle,
  chooseCtaVariant,
  rewriteExistingCtaPublication,
  auditHumanFriendlyCtaArticle,
  ctaCombinationStats
} from '../server/core/cta-publication.mjs';

const repeatedScan = {
  requestId: 'phase217-repeated-scan',
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
assert.equal(stats.engineVersion, 'cta-board-v10.0-phase217-expert-editorial-revenue-20min');
assert.ok(stats.finiteTemplateFloor > 100_000_000, '조합 바닥값이 충분히 커야 합니다.');

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

function assertExpertArticle(article, label) {
  const audit = auditHumanFriendlyCtaArticle(article);
  assert.ok(audit.ok, `${label} failed audit: ${JSON.stringify(audit)}`);
  assert.ok(article.body.length >= 4200 && article.body.length <= 5600, `${label} length out of range: ${article.body.length}`);
  for (const section of REQUIRED_SECTIONS) {
    assert.ok(article.body.includes(section), `${label} missing section: ${section}`);
  }
  assert.ok(!/중학생도 이해할 수 있게|쉬운 전문|4천자 내외/.test(article.body), `${label} contains legacy wording`);
}

const db = { boards: [], publications: [] };
const generated = [];
for (let i = 0; i < 200; i += 1) {
  const variant = chooseCtaVariant(db, { seed: 'phase217-expert-generation-test', sequenceOffset: i });
  const article = buildCtaBoardArticle(repeatedScan, variant, { seed: 'phase217-expert-generation-test', sequenceOffset: i });
  assertExpertArticle(article, `generated article ${i}`);
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
    seed: `phase217-expert-migration-test:${i}`,
    sequenceOffset: i,
    rewrittenAt: '2026-05-10T09:00:00.000Z'
  });
  assertExpertArticle(rewritten, `rewritten article ${i}`);
  assert.notEqual(rewritten.title, '같은 CTA 게시글');
  migrated.push(rewritten);
}
const migratedTitles = new Set(migrated.map(item => item.title));
const migratedBodies = new Set(migrated.map(item => item.contentFingerprint));
assert.ok(migratedTitles.size >= 190, `migrated title diversity too low: ${migratedTitles.size}`);
assert.equal(migratedBodies.size, 200, 'migrated bodies must be unique');

console.log(JSON.stringify({
  ok: true,
  test: 'phase217-cta-expert-editorial-20min',
  generated: { count: generated.length, uniqueTitles: generatedTitles.size, uniqueBodies: generatedBodies.size },
  migrated: { count: migrated.length, uniqueTitles: migratedTitles.size, uniqueBodies: migratedBodies.size },
  engineVersion: stats.engineVersion,
  finiteTemplateFloor: stats.finiteTemplateFloor,
  cadence: '20min 유지',
  targetLengthKo: '4200-5200',
  articleStandard: 'expert_editorial_revenue_post'
}, null, 2));

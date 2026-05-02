import { buildCtaBoardArticle, chooseCtaVariant, rewriteExistingCtaPublication, auditHumanFriendlyCtaArticle } from '../server/core/cta-publication.mjs';

const banned = ['CTA', 'SEO', 'fingerprint', '퍼널', '아키타입', '랜딩', '메타 설명 후보'];
const samples = [];
const failures = [];

for (let i = 0; i < 120; i += 1) {
  const variant = chooseCtaVariant({ publications: samples }, { seed: `phase155-new-${i}`, sequenceOffset: i });
  const article = buildCtaBoardArticle({
    requestId: `scan-${i}`,
    target: `https://example${i}.co.kr`,
    industry: i % 3 === 0 ? '온라인 쇼핑몰' : i % 3 === 1 ? '예약 서비스' : '교육 서비스',
    totalFindings: 4,
    topFindings: ['환불 안내', '문의 버튼', '개인정보 안내']
  }, variant, { seed: `phase155-new-${i}`, sequenceOffset: i });
  samples.push(article);
  const audit = auditHumanFriendlyCtaArticle(article);
  if (!audit.ok) failures.push({ type: 'new', i, title: article.title, audit });
}

const legacyRows = [
  {
    id: 'legacy-1',
    type: 'cta',
    boardType: 'cta',
    autoPublished: true,
    ctaType: 'seo_conversion_old',
    title: 'SEO CTA 퍼널 최적화 전략',
    body: '제목 후보\nSEO CTA 퍼널 최적화\n\n검색 의도\n전환 퍼널 개선\n\n메타 설명 후보\nfingerprint 기반으로 랜딩 아키타입을 고도화합니다.',
    tags: ['#CTA', '#SEO', '#퍼널']
  },
  {
    id: 'legacy-2',
    autoPublished: true,
    baseCtaType: 'policy_gap',
    title: '랜딩 CTA 전환 개선',
    body: '고객 단계와 메타 설명 후보를 기준으로 CTA를 최적화합니다. contentFingerprint 중복을 줄입니다.'
  }
];

const rewritten = legacyRows.map((row, index) => rewriteExistingCtaPublication(row, { seed: `legacy-${index}`, sequenceOffset: index }));
for (const [i, row] of rewritten.entries()) {
  const audit = auditHumanFriendlyCtaArticle(row);
  if (!audit.ok) failures.push({ type: 'rewrite', i, title: row.title, audit });
  const text = [row.title, row.body, (row.tags || []).join(' ')].join('\n');
  for (const word of banned) {
    if (new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(text)) {
      failures.push({ type: 'banned-word', i, word, title: row.title });
    }
  }
  if (row.humanToneVersion !== 'p155-human-reader-friendly-existing-rewrite-v2') {
    failures.push({ type: 'version', i, value: row.humanToneVersion });
  }
}

const titles = new Set(samples.map(item => item.title));
const bodies = new Set(samples.map(item => item.contentFingerprint));
const bodyContainsRequiredSections = samples.every(item => [
  '왜 이 글을 썼나요?',
  '고객 입장에서 보면',
  '바로 고칠 수 있는 것',
  '자주 묻는 질문',
  '다음에 할 일'
].every(section => String(item.body || '').includes(section)));

if (titles.size < 115) failures.push({ type: 'title-diversity', unique: titles.size, total: samples.length });
if (bodies.size !== samples.length) failures.push({ type: 'body-diversity', unique: bodies.size, total: samples.length });
if (!bodyContainsRequiredSections) failures.push({ type: 'required-sections' });

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures: failures.slice(0, 20) }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  phase: 'P155',
  samples: samples.length,
  uniqueTitles: titles.size,
  uniqueBodies: bodies.size,
  legacyRewriteSamples: rewritten.length,
  readabilityTarget: 'middle_school_korean',
  existingMigrationFunction: true,
  bannedJargonRemovedFromBodyAndTags: true,
  requiredSections: true
}, null, 2));

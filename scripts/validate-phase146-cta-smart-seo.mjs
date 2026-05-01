import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCtaBoardArticle, chooseCtaVariant, ctaTopicPacks } from '../server/core/cta-publication.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const requiredSections = ['제목 후보', '도입', '문제 제기', '해결 과정', '신뢰 근거', 'FAQ', '자연스러운 CTA', '태그'];
const db = { publications: [], boards: [] };
const generated = [];

for (let i = 0; i < 30; i += 1) {
  const scan = {
    requestId: `phase146-${i}`,
    target: `https://sample-${i % 5}.example.com/path`,
    industry: ['온라인 쇼핑몰', '디지털 서비스', '지역 상담 서비스', 'B2B SaaS', '교육 서비스'][i % 5],
    riskScore: 42 + (i % 38),
    totalFindings: 2 + (i % 7),
    topFindings: ['환불 정책 표시', '개인정보 안내 위치', '결제 전 고지']
  };
  const variant = chooseCtaVariant(db, { sequenceOffset: i, seed: `phase146-${i}` });
  const article = buildCtaBoardArticle(scan, variant, { seed: `phase146-${i}` });
  generated.push(article);
  db.publications.unshift({
    title: article.title,
    ctaType: article.ctaType,
    searchIntent: article.seo?.searchIntent,
    contentFingerprint: article.contentFingerprint,
    type: 'cta',
    autoPublished: true,
    createdAt: new Date(Date.now() + i).toISOString()
  });
}

function fail(message) {
  throw new Error(message);
}
function assert(condition, message) {
  if (!condition) fail(message);
}

const topicPacks = ctaTopicPacks();
const titleCount = new Set(generated.map(item => item.title)).size;
const bodyCount = new Set(generated.map(item => item.contentFingerprint)).size;
const typeCount = new Set(generated.map(item => item.ctaType)).size;
const intentCount = new Set(generated.map(item => item.seo?.searchIntent)).size;
const missingSections = generated.flatMap((item, index) => requiredSections.filter(section => !item.body.includes(section)).map(section => `${index}:${section}`));
const badSeo = generated.filter(item => !item.seo?.primaryKeyword || !item.seo?.searchIntent || !item.seo?.metaDescription || !Array.isArray(item.tags) || item.tags.length < 5);

assert(topicPacks.length >= 24, `topic pack count too low: ${topicPacks.length}`);
assert(titleCount === generated.length, `duplicate titles: ${titleCount}/${generated.length}`);
assert(bodyCount === generated.length, `duplicate body fingerprints: ${bodyCount}/${generated.length}`);
assert(typeCount >= 20, `cta type diversity too low: ${typeCount}`);
assert(intentCount >= 8, `search intent diversity too low: ${intentCount}`);
assert(missingSections.length === 0, `missing sections: ${missingSections.join(', ')}`);
assert(badSeo.length === 0, `SEO metadata missing: ${badSeo.length}`);
assert(generated.every(item => !/(100%\s*보장|무조건\s*해결|법률\s*위반입니다)/.test(item.body)), 'forbidden guarantee/legal wording found');

const bodyLengths = generated.map(item => item.body.length);
const report = {
  phase: 146,
  name: 'cta-smart-seo-intent-router',
  ok: true,
  generated: generated.length,
  topicPacks: topicPacks.length,
  uniqueTitles: titleCount,
  uniqueBodyFingerprints: bodyCount,
  uniqueCtaTypes: typeCount,
  uniqueSearchIntents: intentCount,
  bodyLengthMin: Math.min(...bodyLengths),
  bodyLengthMax: Math.max(...bodyLengths),
  requiredSections,
  sample: generated.slice(0, 5).map(item => ({
    title: item.title,
    ctaType: item.ctaType,
    searchIntent: item.seo?.searchIntent,
    primaryKeyword: item.seo?.primaryKeyword,
    tagCount: item.tags.length,
    bodyLength: item.body.length
  }))
};

writeFileSync(path.join(ROOT, 'PHASE146_CTA_SMART_SEO_VALIDATION_20260430.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildPublicColumnEnginePosts, publicColumnStats } from '../server/core/public-column-engine.mjs';

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

const posts = buildPublicColumnEnginePosts({ pageSize: 20, now: Date.now() });
assert.ok(posts.length >= 10, 'board engine should generate at least 10 posts');

for (const post of posts) {
  assert.equal(post.boardType, 'cta', `${post.id}: boardType must stay cta`);
  assert.equal(post.boardPurpose, 'cta', `${post.id}: boardPurpose must stay cta`);
  assert.equal(post.engine, 'public-cta-column-engine-v5-seo-expanded-purpose-100-mix-60-20-20', `${post.id}: engine version mismatch`);
  assert.ok(post.title && post.title.length >= 18, `${post.id}: title too short`);
  assert.ok(post.metaTitle && post.metaTitle.includes('nv0'), `${post.id}: metaTitle missing`);
  assert.ok(post.metaDescription && post.metaDescription.length >= 80, `${post.id}: metaDescription too short`);
  assert.ok(post.canonicalPath && post.canonicalPath.startsWith('/board#'), `${post.id}: canonicalPath missing`);
  assert.ok(Array.isArray(post.tags) && post.tags.length === 10, `${post.id}: exactly 10 tags required`);
  assert.ok(Array.isArray(post.hashtags) && post.hashtags.length === 10, `${post.id}: exactly 10 hashtags required`);
  assert.ok(Array.isArray(post.headings) && post.headings.length >= 5, `${post.id}: headings missing`);
  assert.ok(Array.isArray(post.checklist) && post.checklist.length >= 4, `${post.id}: checklist missing`);
  assert.ok(Array.isArray(post.faq) && post.faq.length >= 2, `${post.id}: FAQ missing`);
  assert.ok(Array.isArray(post.internalLinks) && post.internalLinks.length >= 3, `${post.id}: internal links missing`);
  assert.ok(post.structuredData && post.structuredData['@type'] === 'Article', `${post.id}: Article structured data missing`);
  assert.ok(/왜 이 문제가 지금 중요할까요/.test(post.body), `${post.id}: interest section missing`);
  assert.ok(/무료 진단으로 먼저 확인할 수 있는 것/.test(post.body), `${post.id}: CTA section missing`);
  assert.ok(/체크리스트와 FAQ/.test(post.body), `${post.id}: support section missing`);
  assert.ok(String(post.body).length >= 1200, `${post.id}: body should be slightly expanded`);
  assert.deepEqual(post.contentMix.sectionRatio, { interestProblem: 3, ctaPersuasion: 1, supportInfo: 1 }, `${post.id}: 60/20/20 section ratio mismatch`);
}

const stats = publicColumnStats(posts);
assert.equal(stats.nonCtaPurpose, 0, 'all board posts must remain CTA purpose');
assert.equal(stats.seoEnhancement.tenHashtags, true, 'all posts must have 10 hashtags');

const boardHtml = read('apps/public/board/index.html');
for (const token of ['application/ld+json', 'og:title', 'og:description', '해시태그 10개', '#온라인사업자', '#법률리스크']) {
  assert.ok(boardHtml.includes(token), `board HTML missing ${token}`);
}

const boardJs = read('apps/public/board/app.js');
for (const token of ['seo-meta-strip', '빠른 체크리스트', '자주 묻는 질문', 'internal-link-row', 'slice(0, 10)']) {
  assert.ok(boardJs.includes(token), `board JS missing ${token}`);
}

const css = read('shared/nv0-clean-slate-20260512.css');
for (const token of ['PHASE253 board SEO expansion', '.seo-meta-strip', '.seo-meta-card', '.internal-link-row']) {
  assert.ok(css.includes(token), `CSS missing ${token}`);
}

console.log(JSON.stringify({
  ok: true,
  checkedPosts: posts.length,
  tagsPerPost: 10,
  boardPurpose: '100% CTA',
  contentMix: '60/20/20',
  seoElements: ['unique title', 'meta description', 'canonical', 'headings', 'FAQ', 'checklist', 'internal links', '10 hashtags', 'Article JSON-LD']
}, null, 2));

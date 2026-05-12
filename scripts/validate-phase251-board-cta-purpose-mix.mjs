import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildPublicColumnEnginePosts, publicColumnStats } from '../server/core/public-column-engine.mjs';

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

const posts = buildPublicColumnEnginePosts({ pageSize: 20 });
assert.equal(posts.length, 10, 'column engine should produce 10 CTA-purpose posts');
const stats = publicColumnStats(posts);
assert.equal(stats.ctaPurpose, posts.length, 'all board posts must be CTA-purpose posts');
assert.equal(stats.nonCtaPurpose, 0, 'non-CTA purpose posts must not exist');
assert.deepEqual(stats.ratio, { interestProblem: '60%', ctaPersuasion: '20%', supportInfo: '20%' }, 'content mix ratio mismatch');

for (const post of posts) {
  assert.equal(post.boardType, 'cta', `${post.id} boardType must be cta`);
  assert.equal(post.boardPurpose, 'cta', `${post.id} boardPurpose must be cta`);
  assert.equal(post.contentMix?.interestProblem, '60%', `${post.id} missing 60% interest mix`);
  assert.equal(post.contentMix?.ctaPersuasion, '20%', `${post.id} missing 20% cta mix`);
  assert.equal(post.contentMix?.supportInfo, '20%', `${post.id} missing 20% support mix`);
  assert.deepEqual(post.contentMix?.sectionRatio, { interestProblem: 3, ctaPersuasion: 1, supportInfo: 1 }, `${post.id} section ratio mismatch`);
  const sections = String(post.body || '').split(/\n{2,}/).filter(Boolean);
  assert.equal(sections.length, 5, `${post.id} should have 5 body sections`);
  assert.match(post.body, /무료 진단|기본 리포트|전문가 리포트|진단으로 확인|서비스 연결|재진단/, `${post.id} must naturally lead to CTA`);
}

const board = read('apps/public/board/index.html');
for (const text of ['글 목적 100% CTA', '흥미·문제 인식 60%', 'CTA 설득 20%', '체크리스트·FAQ 20%']) {
  assert.ok(board.includes(text), `board page missing corrected mix text: ${text}`);
}
for (const bad of ['일반 독자형 60%', 'CTA 관련 20%', '기타 운영 글 20%', 'data-filter="general"', 'data-filter="cta"', 'data-filter="other"']) {
  assert.ok(!board.includes(bad), `board page still exposes wrong interpretation: ${bad}`);
}

const routes = read('server/routes/public.mjs');
assert.ok(routes.includes("['all', 'read', 'diagnosis', 'policy', 'conversion']"), 'board API filters must be topic filters');
assert.ok(routes.includes("boardType: 'cta'"), 'board API must force boardType cta');
assert.ok(routes.includes("boardPurpose: 'cta'"), 'board API must force boardPurpose cta');
assert.ok(routes.includes('public-cta-column-engine-v3-purpose-100-mix-60-20-20'), 'engine version missing');
assert.ok(!routes.includes("['all', 'general', 'cta', 'other']"), 'old general/cta/other filter remains');

console.log(JSON.stringify({ ok: true, posts: posts.length, ctaPurpose: stats.ctaPurpose, contentMix: stats.ratio }, null, 2));

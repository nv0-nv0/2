import fs from 'node:fs';
import { buildCtaBoardArticle, ctaTopicPacks } from '../server/core/cta-publication.mjs';
const files = ['runtime/data/db.json', 'runtime/data/db.seed.json'];
const scan = { requestId: 'seed-scan-cta', target: 'https://example.com', industry: '일반 이커머스', riskScore: 64, totalFindings: 6, topFindings: ['개인정보처리방침 링크 또는 본문', '사업자 정보 고지', '환불·교환·청약철회 안내'] };
function stamp(index) {
  const d = new Date(Date.UTC(2026, 3, 29, 5, 0, 0));
  d.setMinutes(d.getMinutes() - index * 7);
  return d.toISOString();
}
for (const file of files) {
  const db = JSON.parse(fs.readFileSync(file, 'utf8'));
  const keepBoards = (db.boards || []).filter(item => !(item.autoPublished || item.type === 'cta' || item.boardType === 'cta'));
  const keepPubs = (db.publications || []).filter(item => !(item.autoPublished || item.type === 'cta'));
  const posts = ctaTopicPacks().map((pack, index) => {
    const article = buildCtaBoardArticle(scan, pack, {});
    const base = { ctaType: article.ctaType, titleCandidates: article.titleCandidates, tags: article.tags, qualityStandard: 'cta-board-v6.7-encyclopedic-router-diverse', wordRangeKo: '900-1500', sections: ['제목 후보', '도입', '문제 제기', '해결 과정', '신뢰 근거', 'FAQ', '자연스러운 CTA', '태그'], diversityKey: article.diversityKey, contentFingerprint: article.contentFingerprint, autoPublished: true, createdAt: stamp(index) };
    return { article, base, index };
  });
  db.boards = [
    ...posts.map(({ article, base, index }) => ({ id: `board-seed-diverse-${String(index + 1).padStart(2, '0')}`, title: article.title, boardType: article.boardType, type: 'cta', ...base, body: article.body, visibility: 'public', publishIntervalMs: 86400000 })),
    ...keepBoards
  ].slice(0, 200);
  db.publications = [
    ...posts.map(({ article, base, index }) => ({ id: `pub-seed-diverse-${String(index + 1).padStart(2, '0')}`, title: article.title, status: 'published', type: 'cta', boardType: article.boardType, ...base, relatedRequestId: scan.requestId, body: article.body })),
    ...keepPubs
  ].slice(0, 200);
  fs.writeFileSync(file, JSON.stringify(db, null, 2) + '\n');
}
console.log('CTA seed diversity repaired');

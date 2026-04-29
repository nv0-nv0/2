import fs from 'node:fs';
import path from 'node:path';
import { buildCtaBoardArticle, ctaTopicPacks } from '../server/core/cta-publication.mjs';
const root = process.cwd();
const requiredFiles = [
  'server/core/cta-publication.mjs',
  'server/index.mjs',
  'runtime/data/db.json',
  'runtime/data/db.seed.json',
  'apps/public/board/app.js',
  'apps/admin/publications/app.js'
];
const failures = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`${file}: missing`);
}
const moduleText = fs.readFileSync(path.join(root, 'server/core/cta-publication.mjs'), 'utf8');
for (const token of ['chooseCtaVariant', 'contentFingerprint', '진단 요약', '전환 전 체크리스트', '주간 운영 루틴']) {
  if (!moduleText.includes(token)) failures.push(`cta-publication.mjs missing ${token}`);
}
const serverText = fs.readFileSync(path.join(root, 'server/index.mjs'), 'utf8');
for (const token of ['buildCtaBoardArticle', 'chooseCtaVariant', 'contentFingerprint', 'title: article.title']) {
  if (!serverText.includes(token)) failures.push(`server/index.mjs missing ${token}`);
}
const packs = ctaTopicPacks();
if (packs.length < 12) failures.push(`topic pack count too low: ${packs.length}`);
const scan = { target: 'https://example.com', industry: '일반 이커머스', riskScore: 64, totalFindings: 6, topFindings: ['개인정보처리방침 링크', '사업자 정보 고지', '환불 안내'] };
const generated = packs.map(pack => buildCtaBoardArticle(scan, pack));
const titles = new Set(generated.map(item => item.title));
const bodies = new Set(generated.map(item => item.contentFingerprint));
const ctaTypes = new Set(generated.map(item => item.ctaType));
if (titles.size !== generated.length) failures.push(`generated titles not unique: ${titles.size}/${generated.length}`);
if (bodies.size !== generated.length) failures.push(`generated bodies not unique: ${bodies.size}/${generated.length}`);
if (ctaTypes.size !== generated.length) failures.push(`generated cta types not unique: ${ctaTypes.size}/${generated.length}`);
const sectionTokens = ['제목 후보', '도입', '문제 제기', '해결 과정', '신뢰 근거', 'FAQ', '자연스러운 CTA', '태그'];
for (const [index, item] of generated.entries()) {
  for (const token of sectionTokens) if (!item.body.includes(token)) failures.push(`generated ${index} missing section ${token}`);
  const length = item.body.replace(/\s/g, '').length;
  if (length < 900 || length > 1800) failures.push(`generated ${index} length out of range: ${length}`);
}
for (const file of ['runtime/data/db.json', 'runtime/data/db.seed.json']) {
  const db = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  const autoBoards = (db.boards || []).filter(item => item.autoPublished || item.type === 'cta' || item.boardType === 'cta');
  const autoPubs = (db.publications || []).filter(item => item.autoPublished || item.type === 'cta');
  if (autoBoards.length < 12) failures.push(`${file}: auto board count too low ${autoBoards.length}`);
  if (autoPubs.length < 12) failures.push(`${file}: auto publication count too low ${autoPubs.length}`);
  const boardTitles = new Set(autoBoards.map(item => item.title).filter(Boolean));
  const boardFingerprints = new Set(autoBoards.map(item => item.contentFingerprint).filter(Boolean));
  const boardTypes = new Set(autoBoards.map(item => item.ctaType).filter(Boolean));
  if (boardTitles.size < Math.min(12, autoBoards.length)) failures.push(`${file}: duplicate or missing board titles`);
  if (boardFingerprints.size < Math.min(12, autoBoards.length)) failures.push(`${file}: duplicate or missing board fingerprints`);
  if (boardTypes.size < 12) failures.push(`${file}: cta type diversity too low ${boardTypes.size}`);
}
const result = { ok: failures.length === 0, checked: { packs: packs.length, generated: generated.length }, failures };
console.log(JSON.stringify(result, null, 2));
process.exit(failures.length ? 1 : 0);

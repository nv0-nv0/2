import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredSections = ['제목 후보', '도입', '문제 제기', '해결 과정', '신뢰 근거', 'FAQ', '자연스러운 CTA', '태그'];
const report = { phase: 127, name: 'cta-board-v6.7-encyclopedic-router', checks: [] };
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function ok(name, pass, detail = '') { report.checks.push({ name, pass, detail }); if (!pass) throw new Error(`${name}: ${detail}`); }
function articleLength(body) { return String(body || '').length; }

const server = read('server/index.mjs');
ok('server has CTA board article builder', server.includes('function buildCtaBoardArticle'), 'buildCtaBoardArticle missing');
ok('server stores quality standard', server.includes('cta-board-v6.7-encyclopedic-router'), 'qualityStandard missing');
ok('server stores title candidates', server.includes('titleCandidates'), 'titleCandidates missing');
ok('server stores tags', server.includes('tags:'), 'tags missing');
for (const section of requiredSections) ok(`server section ${section}`, server.includes(section), `${section} missing`);
ok('server avoids old one-line CTA bodies', !server.includes('무료 진단으로 같은 기준을 확인하고 필요한 경우 상세 리포트와 수정 문구안으로 이어가세요.` }'), 'old diagnosis one-liner remains');
ok('server includes legal non-guarantee guard', server.includes('법률 자문이나 결과 보장을 대신하지 않습니다'), 'legal guard missing');
ok('server includes official-source guard', server.includes('공식 원문 확인이 필요합니다'), 'official-source guard missing');

const boardApp = read('apps/public/board/app.js');
ok('public board renders long body sections', boardApp.includes('function renderPostBody'), 'renderPostBody missing');
ok('public board preserves paragraphs', boardApp.includes("split(/\\n{2,}/)"), 'paragraph split missing');
ok('public board escapes section text', boardApp.includes('escapeHtml(content)'), 'safe body escape missing');
const boardCss = read('apps/public/board/app.css');
ok('public board has post body layout', boardCss.includes('.post-body') && boardCss.includes('.post-section'), 'post layout CSS missing');

const adminApp = read('apps/admin/publications/app.js');
ok('admin preview renders long posts', adminApp.includes('formatBody'), 'admin formatBody missing');
ok('admin preview escapes long posts', adminApp.includes('escapeHtml(section)'), 'admin body escape missing');
const adminCss = read('apps/admin/publications/app.css');
ok('admin long post preview style exists', adminCss.includes('.admin-post-body'), 'admin long post CSS missing');

for (const rel of ['runtime/data/db.seed.json', 'runtime/data/db.json']) {
  const db = JSON.parse(read(rel));
  const items = [
    ...(db.publications || []).filter(item => item.autoPublished || item.type === 'cta'),
    ...(db.boards || []).filter(item => item.autoPublished || item.boardType === 'cta')
  ];
  ok(`${rel} has CTA items`, items.length > 0, 'no CTA items found');
  for (const [index, item] of items.entries()) {
    const body = item.body || '';
    ok(`${rel} CTA ${index} length 900-1500`, articleLength(body) >= 900 && articleLength(body) <= 1500, `length=${articleLength(body)}`);
    for (const section of requiredSections) ok(`${rel} CTA ${index} section ${section}`, body.includes(section), `${section} missing`);
    ok(`${rel} CTA ${index} has title candidates`, Array.isArray(item.titleCandidates) && item.titleCandidates.length >= 3, 'titleCandidates < 3');
    ok(`${rel} CTA ${index} has tags`, Array.isArray(item.tags) && item.tags.length >= 5, 'tags < 5');
    ok(`${rel} CTA ${index} quality standard`, item.qualityStandard === 'cta-board-v6.7-encyclopedic-router', 'qualityStandard mismatch');
    ok(`${rel} CTA ${index} no guarantee wording`, !/(100%\s*보장|무조건\s*해결|법률\s*위반입니다)/.test(body), 'forbidden guarantee/legal wording found');
  }
}

report.passed = report.checks.every(item => item.pass);
report.checkedAt = new Date().toISOString();
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/PHASE127_CTA_BOARD_STANDARD_VALIDATION_20260429.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: true, phase: 127, checks: report.checks.length }, null, 2));

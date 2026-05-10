
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const publicFiles = [];
function walk(dir){ for(const ent of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){ const rel=path.join(dir,ent.name); if(ent.isDirectory()) walk(rel); else if(/\.(html|js|css)$/.test(ent.name)) publicFiles.push(rel); }}
walk('apps/public');
const publicText = publicFiles.map(read).join('\n---FILE---\n');
const server = read('server/index.mjs');
for (const token of ['replace-with-number','상용 결제 전 입력 필요','호스팅 제공자 실제 운영 인프라 확정 후 입력 필요','통신판매업 신고 완료 후 표시 예정','문서을 눌러주세요','상품 보기✎','문서 보기PDF','무료로 진단 시작무료진단 보기','전자동 무료진단 실행다시 실행','오늘 남은 무료 진단 확인 중이용 가능 횟수','자동 근거 정리 로','수동확인 분리 로','생성 문서 24개','최근 수정 2025.05.26','위험도 72 / 100']) {
  assert(!publicText.includes(token), `public text still contains banned token: ${token}`);
}
assert(publicText.includes('환불·청약철회 정책'), 'unified refund policy label is visible');
assert(publicText.includes('평일 09:00–18:00 접수 확인'), 'support hours are visible');
assert(server.includes("{ code: 'Report'"), 'Report offer exists');
assert(server.includes("price: 39000"), 'Report 39000 exists');
assert(server.includes("{ code: 'FixPack'"), 'FixPack offer exists');
assert(server.includes("price: 79000"), 'FixPack 79000 exists');
assert(server.includes("{ code: 'Auto'"), 'Auto offer exists');
assert(server.includes("price: 149000"), 'Auto 149000 exists');
assert(server.includes('function normalizePlanCode'), 'legacy plan normalization exists');
assert(read('apps/public/checkout/index.html').includes('상세 리포트 · 39,000원 · 1회'), 'checkout default report option is explicit');
assert(read('apps/public/board/index.html').includes('쇼핑몰 푸터 고지 정리 사례'), 'board SSR fallback samples exist');
assert(read('apps/public/cases/index.html').includes('적용 사례'), 'cases page is dedicated');
assert(read('apps/public/service/index.html').includes('서비스 구조'), 'service page is dedicated');
console.log(JSON.stringify({ ok:true, checkedAt:new Date().toISOString(), publicFiles: publicFiles.length, gates: 20 }, null, 2));

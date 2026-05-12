import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const publicPages = [
  'apps/public/home/index.html','apps/public/service/index.html','apps/public/guides/index.html','apps/public/solutions/index.html','apps/public/plans/index.html','apps/public/board/index.html','apps/public/veridion-demo/index.html'
];
const combined = publicPages.map(read).join('\n') + read('server/index.mjs') + read('server/core/public-column-engine.mjs') + read('apps/public/veridion-demo/app.js');
for (const token of ['법률·규제','과태료','전자상거래','개인정보','환불·청약철회','표시광고','법률 자문을 대체하지']) {
  assert.ok(combined.includes(token), `missing legal-risk product definition token: ${token}`);
}
for (const p of publicPages) {
  const html = read(p);
  assert.ok(html.includes('법률') || html.includes('규제') || html.includes('과태료'), `${p} must include legal/regulatory risk copy`);
}
const engine = read('server/core/public-column-engine.mjs');
assert.ok(engine.includes('public-cta-column-engine-v4-legal-risk-purpose-100-mix-60-20-20'));
assert.ok(engine.includes("boardPurpose: 'cta'"));
assert.ok(engine.includes('interestProblem: \'60%\''));
assert.ok(engine.includes('ctaPersuasion: \'20%\''));
assert.ok(engine.includes('supportInfo: \'20%\''));
assert.ok(!/법률 위반이 확정|과태료가 확정|100% 예방|무조건 방지/.test(combined), 'banned legal overclaim detected');
console.log(JSON.stringify({ ok: true, checkedPages: publicPages.length, engine: 'legal-risk-cta-v4' }, null, 2));

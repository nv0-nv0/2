import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const add = (label, ok, detail = {}) => checks.push({ label, ok: Boolean(ok), ...detail });
const publicPages = fs.readdirSync(path.join(root, 'apps/public')).map((dir)=>`apps/public/${dir}/index.html`).filter((p)=>fs.existsSync(path.join(root,p)));
add('phase224 css file exists', fs.existsSync(path.join(root,'shared/phase224-readable-marketing.css')));
add('all public pages load phase224 css exactly once', publicPages.every((p)=>(read(p).match(/phase224-readable-marketing\.css/g)||[]).length===1));
add('all public pages use phase224-readable body class', publicPages.every((p)=>read(p).includes('phase224-readable')));
add('home copy is human and direct', read('apps/public/home/index.html').includes('광고를 더 쓰기 전에 사이트 안의 불안 요소부터 정리하세요'));
add('plans copy is less pushy', read('apps/public/plans/index.html').includes('처음부터 결제하지 않아도 됩니다'));
add('demo copy avoids technical jargon', read('apps/public/veridion-demo/index.html').includes('직접 확인이 필요한 항목'));
add('checkout copy has readable separators', read('apps/public/checkout/index.html').includes('상품 금액') && !read('apps/public/checkout/index.html').includes('상품 금액39,000'));
add('board copy keeps 20 minute cadence without filler emphasis', read('apps/public/board/index.html').includes('자동 발행 주기는 20분 1회로 유지합니다'));
add('documents copy uses customer-facing wording', read('apps/public/documents/index.html').includes('고객 안내문과 작업지시서'));
add('CSS overrides old dark/low contrast public UI', ['body.nv0-dark','.nv0-live-preview-card','.board-post .post-body','.business-footer'].every((n)=>read('shared/phase224-readable-marketing.css').includes(n)));
const fullText = publicPages.map(read).join('\n') + read('server/core/cta-publication.mjs') + read('apps/public/board/app.js');
for (const term of ['replace-with-number','수익화 흐름','Free Demo','Pro/Fix','정책 문서 초안','고정 점수','자동 단정','AI 티']) {
  add(`banned term removed: ${term}`, !fullText.includes(term));
}
const failed = checks.filter((c)=>!c.ok);
const result = {
  ok: failed.length === 0,
  phase:'phase224',
  name:'readability-human-copy-visual-clarity',
  checkedAt:new Date().toISOString(),
  scoreAfterPatch: failed.length ? Math.max(0, 100 - failed.length * 5) : 100,
  totalChecks:checks.length,
  passedChecks:checks.length - failed.length,
  failedChecks:failed,
  focus:['visibility','human expert copy','page consistency','premium SaaS tone','CTA 20 minute cadence preserved']
};
fs.writeFileSync(path.join(root,'PHASE224_READABILITY_HUMAN_COPY_VALIDATION_20260510.json'), JSON.stringify(result,null,2)+'\n');
if (!result.ok) {
  console.error(JSON.stringify(result,null,2));
  process.exit(1);
}
console.log(JSON.stringify(result,null,2));

import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const htmlFiles = fs.readdirSync(path.join(root, 'apps/public'))
  .map((dir) => `apps/public/${dir}/index.html`)
  .filter((file) => fs.existsSync(path.join(root, file)));
const bannedVisible = [
  'replace-with-number',
  '수익화 흐름',
  'Pro/Fix',
  'Free Demo',
  '정책 문서 초안',
  '고정 점수',
  '자동 단정',
  'AI 티',
  '단정 불가',
  '결제 시작결제 완료',
  '상세 리포트고객',
  '상품 금액69,000',
  '전달 방식결제',
  '추천 대상근거',
  '예상 결제 금액69,000'
];
const requiredPageCopy = {
  'apps/public/home/index.html': ['결제 전 신뢰 공백을 찾고', '광고를 더 쓰기 전에 사이트 안의 불안 요소부터 정리하세요'],
  'apps/public/plans/index.html': ['먼저 무료로 확인하고', '고칠 때만 필요한 결과물을 선택하세요'],
  'apps/public/veridion-demo/index.html': ['주소 하나로', '결제 전 신뢰 요소를 먼저 확인합니다'],
  'apps/public/checkout/index.html': ['결제 전에 결과물과 금액을', '한 번 더 확인하세요'],
  'apps/public/board/index.html': ['전문가형 운영 콘텐츠', '자동 발행 주기는 20분'],
  'apps/public/documents/index.html': ['고객 안내문과 작업지시서', '바로 검토할 수 있는 초안'],
  'apps/public/portal/index.html': ['내 사이트 상태와 다음 작업을 한눈에 관리하세요']
};
const failures = [];
for (const file of htmlFiles) {
  const html = read(file);
  const cssCount = (html.match(/phase224-readable-marketing\.css/g) || []).length;
  if (cssCount !== 1) failures.push(`${file}: phase224 css count ${cssCount}`);
  if (!html.includes('phase224-readable')) failures.push(`${file}: missing phase224-readable body class`);
  for (const term of bannedVisible) {
    if (html.includes(term)) failures.push(`${file}: banned visible term ${term}`);
  }
  if (/<h1[^>]*>\s*<\/h1>/i.test(html)) failures.push(`${file}: empty h1`);
}
for (const [file, needles] of Object.entries(requiredPageCopy)) {
  const html = read(file);
  for (const needle of needles) {
    if (!html.includes(needle)) failures.push(`${file}: missing human copy '${needle}'`);
  }
}
const css = read('shared/phase224-readable-marketing.css');
for (const needle of [
  'neutralizes older dark/low-contrast',
  'body.nv0-dark',
  '.board-post .post-body',
  '.btn.primary',
  '.nv0-live-preview-card',
  '.business-footer',
  '@media(max-width:900px)'
]) {
  if (!css.includes(needle)) failures.push(`phase224 css missing ${needle}`);
}
const boardEngine = read('apps/public/board/app.js') + read('server/core/cta-publication.mjs');
if (!boardEngine.includes('20분')) failures.push('CTA auto publishing 20-minute language missing');
if (failures.length) {
  console.error(JSON.stringify({ ok:false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  ok:true,
  test:'phase224-readability-human-copy',
  htmlFiles:htmlFiles.length,
  bannedTermsChecked:bannedVisible.length,
  requiredPageCopyChecks:Object.values(requiredPageCopy).flat().length,
  ctaIntervalMinutes:20,
  focus:'visibility_readability_human_marketing_copy'
}, null, 2));

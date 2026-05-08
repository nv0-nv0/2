import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const failures = [];

for (const rel of [
  'server/core/work-order-generator.mjs',
  'tests/phase208-work-order-generator.mjs',
  'apps/public/documents/index.html',
  'apps/public/documents/app.js',
  'apps/public/documents/app.css'
]) if (!exists(rel)) failures.push(`missing:${rel}`);

const core = read('server/core/work-order-generator.mjs');
for (const token of ['buildFinalWorkOrder', 'buildWorkOrderPreview', 'assertWorkOrderContract', '# 최종 작업지시서', '롤백/보완 기준', '확인 필요']) {
  if (!core.includes(token)) failures.push(`core missing:${token}`);
}

const route = read('server/routes/public.mjs');
if (!route.includes("body.documentKind === 'work_order'")) failures.push('public route does not select work order preview');
if (!route.includes('buildWorkOrderPreview')) failures.push('public route missing buildWorkOrderPreview');

const index = read('apps/public/documents/index.html');
for (const token of ['작업지시서 생성', '입력 → 생성 → 복사/저장', 'sourceInput', 'documentKind', '작업지시서 결과']) {
  if (!index.includes(token)) failures.push(`documents UI missing:${token}`);
}

const app = read('apps/public/documents/app.js');
for (const token of ['documentKind = \'work_order\'', 'navigator.clipboard.writeText', 'localStorage.setItem', 'renderDocuments']) {
  if (!app.includes(token)) failures.push(`documents app missing:${token}`);
}

const publicFiles = ['apps/public/home/index.html','apps/public/veridion-demo/index.html','apps/public/documents/index.html','apps/public/board/index.html','apps/public/business-info/index.html']
  .filter(exists).map(read).join('\n');
for (const token of ['replace-with-number', '통신판매업 신고 완료 후 표시 예정', '상용 결제 전 입력 필요', '호스팅 제공자 실제 운영 인프라 확정 후 입력 필요']) {
  if (publicFiles.includes(token)) failures.push(`public placeholder still exposed:${token}`);
}

const pkg = JSON.parse(read('package.json'));
for (const scriptName of ['test:phase208', 'validate:phase208', 'phase208:final']) {
  if (!pkg.scripts?.[scriptName]) failures.push(`package script missing:${scriptName}`);
}

const result = { ok: failures.length === 0, phase: 208, failures, checkedAt: new Date().toISOString() };
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);

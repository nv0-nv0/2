import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (file) => fs.readFileSync(file, 'utf8');
const findings = [];
const requireText = (file, token) => { if (!read(file).includes(token)) findings.push({ file, error: `missing Korean-first token: ${token}` }); };
const forbid = (file, token) => { if (read(file).includes(token)) findings.push({ file, error: `forbidden stale or typo token: ${token}` }); };
for (const file of ['apps/public/home/index.html','apps/public/demo/index.html']) {
  requireText(file, '무료 진단 시작');
  requireText(file, '이메일 입력 없이 시작');
}
for (const file of ['apps/public/home/index.html','apps/public/demo/index.html','apps/public/plans/index.html','apps/public/board/index.html','apps/public/auth/index.html']) {
  for (const token of ['진단','인사이트','요금제','고객 포털']) requireText(file, token);
}
requireText('scripts/project-help.mjs', '핵심 명령:');
requireText('scripts/project-help.mjs', '문서:');
for (const file of ['scripts/project-help.mjs','apps/public/board/index.html','README.md','docs/QA.md','docs/OPERATIONS.md','docs/DEPLOYMENT.md']) {
  for (const token of ['Core commands:', 'Docs:', '실행로 구성됩니다.']) forbid(file, token);
}
assert.deepEqual(findings, [], JSON.stringify(findings, null, 2));
console.log(JSON.stringify({ ok: true, contract: 'korean-first-ui-v1', checked: 6, findings }, null, 2));

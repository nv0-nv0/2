import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (file) => fs.readFileSync(file, 'utf8');
const findings = [];
const assertCheck = (condition, message) => { if (!condition) findings.push(message); };
const help = read('scripts/project-help.mjs');
const readme = read('README.md');
const deployment = read('docs/DEPLOYMENT.md');
const qa = read('docs/QA.md');
const operations = read('docs/OPERATIONS.md');
const packageJson = JSON.parse(read('package.json'));
const scripts = packageJson.scripts || {};
assertCheck(help.includes('VERIDION 2.7 상용 하드닝 최대화 기준선'), 'project-help must identify the 2.7 baseline');
assertCheck(readme.startsWith('# VERIDION 2.7 상용 하드닝 최대화 기준선'), 'README title must identify the 2.7 baseline');
for (const [file, text] of [['README.md', readme], ['docs/DEPLOYMENT.md', deployment], ['docs/QA.md', qa], ['docs/OPERATIONS.md', operations]]) {
  assertCheck(!/v2\.6\s/.test(text), `${file}: stale v2.6 heading remains`);
  assertCheck(text.includes('`진단`, `인사이트`, `요금제`, `고객 포털`') || file === 'docs/DEPLOYMENT.md', `${file}: Korean public navigation reference must match the actual route order`);
}
assertCheck(!deployment.includes('npm run dev'), 'docs/DEPLOYMENT.md must not instruct the missing npm run dev command');
for (const token of ['npm start', 'npm run verify:release', 'npm run deploy:precheck']) assertCheck(deployment.includes(token), `deployment docs missing operator command: ${token}`);
for (const command of ['start', 'verify:release', 'deploy:precheck', 'release:create', 'clean:runtime']) assertCheck(Boolean(scripts[command]), `package.json missing documented command: ${command}`);
assert.deepEqual(findings, [], JSON.stringify(findings, null, 2));
console.log(JSON.stringify({ ok: true, contract: 'operator-documentation-current-v1', checked: 5, findings }, null, 2));

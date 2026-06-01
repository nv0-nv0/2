import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
function add(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
}
const forbidden = [/같은 진단 엔진/, /메인과 진단 페이지가 같은/, /무의미하게/, /고객 포털로 .*넘/, /결과 생성 후 다시 점검/, /결과 생성 후 이어보기/];

const home = read('apps/public/home/index.html');
add('home:forbidden-internal-copy-removed', () => forbidden.forEach(pattern => assert.doesNotMatch(home, pattern, String(pattern))));
add('home:dedicated-screen-copy-present', () => assert.match(home, /전용 (?:진단 )?화면|진단 페이지는 실행/));
add('home:canonical-action-present', () => assert.match(home, /사이트 무료 진단 실행/));
add('home:no-inline-form', () => assert.doesNotMatch(home, /id="unifiedDiagnosisForm"/));

for (const file of ['apps/public/demo/index.html', 'apps/public/veridion-demo/index.html']) {
  const text = read(file);
  add(`${file}:forbidden-internal-copy-removed`, () => forbidden.forEach(pattern => assert.doesNotMatch(text, pattern, String(pattern))));
  add(`${file}:value-copy-present`, () => assert.match(text, /주소.*결과|결과.*이 자리|한 화면/));
  add(`${file}:progressive-action-copy-present`, () => assert.match(text, /결과가 생성되면 다시 진단하기와 저장·이어보기 버튼이 표시됩니다/));
}

const failures = checks.filter(item => !item.ok);
const report = { ok: failures.length === 0, phase: 'phase353-diagnosis-copy-contract', checked: checks.length, failed: failures.length, failures };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE353_DIAGNOSIS_COPY_CONTRACT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);

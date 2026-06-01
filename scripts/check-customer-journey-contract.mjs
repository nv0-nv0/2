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

const home = read('apps/public/home/index.html');
add('home:result-value-copy', () => assert.match(home, /무료 결과|결과 구조|결과물/));
add('home:dedicated-diagnosis-link', () => assert.match(home, /href="\/products\/veridion\/demo"[^>]*>사이트 무료 진단 실행<\/a>/));
add('home:no-inline-diagnosis-form', () => assert.doesNotMatch(home, /id="unifiedDiagnosisForm"|data-unified-diagnosis-form/));
add('home:no-inline-result-actions', () => assert.doesNotMatch(home, /id="(?:retryBtn|unlockBtn|resultActionHint)"|class="bridge-actions"/));
add('home:no-duplicated-core-classes', () => assert.doesNotMatch(home, /class="([^"]*\bvr-(?:topbar|main|hero|preview|footer)\b[^" ]*) \1"/));

const diagnosisPages = ['apps/public/demo/index.html', 'apps/public/veridion-demo/index.html'];
for (const file of diagnosisPages) {
  const html = read(file);
  add(`${file}:result-first-copy`, () => assert.match(html, /결과|무료 결과|결과 확인/));
  add(`${file}:no-internal-engine-copy`, () => assert.doesNotMatch(html, /같은 진단 엔진|메인과 진단 페이지|무의미하게|포털로 넘기/));
  add(`${file}:hidden-result-actions-before-result`, () => assert.match(html, /class="bridge-actions" hidden aria-hidden="true"/));
  add(`${file}:result-action-hint-present`, () => assert.match(html, /id="resultActionHint"/));
  add(`${file}:result-actions-human-copy`, () => {
    assert.match(html, />다시 진단하기<\/button>/);
    assert.match(html, />결과 저장하고 이어보기<\/button>/);
  });
  add(`${file}:primary-diagnosis-submit-copy`, () => assert.match(html, /data-diagnosis-primary-action="true">사이트 무료 진단 실행<\/button>/));
  add(`${file}:no-duplicated-core-classes`, () => assert.doesNotMatch(html, /class="([^"]*\bvr-(?:topbar|main|hero|preview|footer)\b[^" ]*) \1"/));
}
const demoJs = read('apps/public/demo/app.js');
add('demo-js:has-action-group', () => assert.match(demoJs, /resultActionGroup/));
add('demo-js:toggles-hidden-result-actions', () => {
  assert.match(demoJs, /resultActionGroup\.hidden\s*=\s*!showActions/);
  assert.match(demoJs, /resultActionGroup\.setAttribute\('aria-hidden', showActions \? 'false' : 'true'\)/);
});
add('demo-js:toggles-result-action-hint', () => {
  assert.match(demoJs, /resultActionHint\.hidden\s*=\s*showActions/);
  assert.match(demoJs, /resultActionHint\.setAttribute\('aria-hidden', showActions \? 'true' : 'false'\)/);
});
add('demo-js:post-result-copy', () => {
  assert.match(demoJs, /다시 진단하기/);
  assert.match(demoJs, /결과 저장하고 이어보기/);
  assert.doesNotMatch(demoJs, /결과 생성 후 다시 점검|결과 생성 후 이어보기/);
});
const css = read('shared/veridion-rebrand.css');
add('css:phase349-hidden-actions-contract', () => assert.match(css, /Phase349 customer journey closeout/));
add('css:unlock-active-high-contrast', () => assert.match(css, /#unlockBtn:not\(\[disabled\]\).*background:#075e54/s));

const failures = checks.filter(item => !item.ok);
const report = { ok: failures.length === 0, phase: 'phase353-customer-journey-contract', checked: checks.length, failed: failures.length, failures };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE353_CUSTOMER_JOURNEY_CONTRACT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);

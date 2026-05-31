import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const checks = [];
function check(name, fn) { try { fn(); checks.push({ name, ok: true }); } catch (error) { checks.push({ name, ok: false, error: error.message }); } }
function read(p) { return fs.readFileSync(path.join(root, p), 'utf8'); }
check('version:phase350', () => assert.match(pkg.version, /phase350-global-cta-semantics-closeout|phase351-prompt-full-sweep-closeout/));
check('delivery-final:phase350', () => assert.ok(['npm run phase350:final','npm run phase351:final'].includes(pkg.scripts['delivery:final'])));
check('release-predeploy:phase350', () => assert.ok(['npm run phase350:final','npm run phase351:final'].includes(pkg.scripts['release:predeploy'])));
check('run-all-tests:phase350', () => assert.match(read('RUN_ALL_TESTS.sh'), /npm run phase350:final|npm run phase351:final/));
check('script:check-global-cta-semantics', () => assert.equal(pkg.scripts['check:global-cta-semantics'], 'node scripts/check-global-cta-semantics.mjs'));
check('script:phase350-final', () => assert.equal(pkg.scripts['phase350:final'], 'node scripts/run-phase350-final.mjs'));
check('docs:work-order', () => assert.match(read('docs/PHASE350_GLOBAL_CTA_SEMANTICS_WORK_ORDER.md'), /전역 CTA 의미 통일/));
check('docs:matrix', () => assert.match(read('docs/PHASE350_104_GLOBAL_CTA_MATRIX.md'), /\| 104 \|/));
check('docs:closeout', () => assert.match(read('docs/PHASE350_GLOBAL_CTA_SEMANTICS_CLOSEOUT.md'), /100\/100/));
check('home:canonical-copy', () => assert.match(read('apps/public/home/index.html'), /사이트 무료 진단 실행/));
check('demo:canonical-copy', () => assert.match(read('apps/public/demo/index.html'), /사이트 무료 진단 실행/));
check('board:no-old-copy', () => assert.doesNotMatch(read('apps/public/board/index.html'), /무료 진단 시작|사이트 구조 진단/));
check('auth:no-old-copy', () => assert.doesNotMatch(read('apps/public/auth/index.html'), /무료 진단 시작/));
check('currentness-script:phase350', () => assert.match(read('scripts/check-release-currentness.mjs'), /phase350|phase351/));
const failed = checks.filter(c => !c.ok);
const report = { ok: failed.length === 0, phase: 'phase350-global-cta-semantics-closeout', checked: checks.length, failed: failed.length, failures: failed };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE350_GLOBAL_CTA_SEMANTICS_VALIDATION.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);

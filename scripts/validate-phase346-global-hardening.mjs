import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const pkg = JSON.parse(read('package.json'));
const checks = [];
function add(name, ok, detail = '') { checks.push({ name, ok: Boolean(ok), detail }); }

add('version:phase346', /phase346-global-hardening-final|phase347-unified-diagnosis-final|phase348-final-unified-engine-closeout|phase349-customer-journey-closeout|phase350-global-cta-semantics-closeout|phase351-prompt-full-sweep-closeout|phase350-global-cta-semantics-closeout|phase351-prompt-full-sweep-closeout/.test(pkg.version), pkg.version);
add('scripts:phase346-final', pkg.scripts?.['phase346:final'] === 'node scripts/run-phase346-final.mjs', pkg.scripts?.['phase346:final']);
add('scripts:terminal-gates', ['npm run phase346:final','npm run phase347:final','npm run phase348:final', 'npm run phase349:final', 'npm run phase350:final','npm run phase358:final', 'npm run phase350:final','npm run phase358:final'].includes(pkg.scripts?.['delivery:final']) && ['npm run phase346:final','npm run phase347:final','npm run phase348:final', 'npm run phase349:final', 'npm run phase350:final','npm run phase358:final', 'npm run phase350:final','npm run phase358:final'].includes(pkg.scripts?.['release:predeploy']), `${pkg.scripts?.['delivery:final']} | ${pkg.scripts?.['release:predeploy']}`);
add('scripts:live-smoke', pkg.scripts?.['live:smoke'] === 'node scripts/live-smoke.mjs');
add('scripts:public-demo-error-contract', pkg.scripts?.['test:public-demo-error-contract'] === 'node tests/public-demo-error-contract.mjs');
add('runner:chains-phase345', /phase345:final/.test(read('scripts/run-phase346-final.mjs')));
add('runner:adds-phase346-checks', /test:public-demo-error-contract/.test(read('scripts/run-phase346-final.mjs')) && /check:release-currentness/.test(read('scripts/run-phase346-final.mjs')) && /live:smoke/.test(read('scripts/run-phase346-final.mjs')));
add('docs:work-order', exists('docs/PHASE346_GLOBAL_HARDENING_WORK_ORDER.md'));
add('docs:closeout', exists('docs/PHASE346_GLOBAL_HARDENING_CLOSEOUT.md'));
add('docs:remaining-matrix', exists('docs/PHASE346_REMAINING_STEPS_MATRIX.md'));
add('docs:remaining-84-elements', /전역 고도화 잔여 요소\s*:\s*84개/.test(read('docs/PHASE346_REMAINING_STEPS_MATRIX.md')));
add('docs:all-84-handled', /처리 완료\s*:\s*84개/.test(read('docs/PHASE346_REMAINING_STEPS_MATRIX.md')));
add('readme:phase346', /phase(346|347|348|349|350)/.test(read('README.md')) && /live:smoke/.test(read('README.md')));
add('run-all-tests:phase346', /phase(346|347|348|349|350|358):final/.test(read('RUN_ALL_TESTS.sh')));
add('report:phase344-216-preserved', /216개/.test(read('docs/PHASE344_216_REDTEAM_REMEDIATION_REPORT.md')));

const failures = checks.filter(item => !item.ok);
const report = {
  ok: failures.length === 0,
  phase: 'phase346-global-hardening-final',
  checked: checks.length,
  failed: failures.length,
  failures,
  qualityTarget: 'local package 100/100; live production verification remains operator-run through npm run live:smoke'
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE346_GLOBAL_HARDENING_VALIDATION.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);

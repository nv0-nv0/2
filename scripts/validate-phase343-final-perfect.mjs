import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const pkg = JSON.parse(read('package.json'));
const checks = [];
const failures = [];
function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error: error.message });
    failures.push({ name, error: error.message });
  }
}

const readme = read('README.md');
const runAll = read('RUN_ALL_TESTS.sh');
const operational = read('scripts/check-operational-readiness-contract.mjs');
const phase337 = read('scripts/validate-phase337-product-evolution.mjs');
const phase340 = read('scripts/validate-phase340-redteam-closeout.mjs');
const phase341 = read('scripts/validate-phase341-final-closeout.mjs');
const phase342 = read('scripts/validate-phase342-merged-best.mjs');
const publicRoutes = read('server/routes/public.mjs');
const serverIndex = read('server/index.mjs');
const packageText = read('package.json');

check('package:phase343-version', () => assert.equal(pkg.version, '1.0.6-commercial-phase343-final-perfect'));
check('package:description-phase343', () => assert.match(pkg.description || '', /phase343 final perfect closeout/));
check('package:delivery-final-phase343', () => assert.equal(pkg.scripts['delivery:final'], 'npm run phase343:final'));
check('package:release-predeploy-phase343', () => assert.equal(pkg.scripts['release:predeploy'], 'npm run phase343:final'));
check('package:phase343-final-chains-phase342', () => assert.match(pkg.scripts['phase343:final'], /phase342:final/));
check('package:phase343-final-runs-operational-contract', () => assert.match(pkg.scripts['phase343:final'], /check:operational-contract/));
check('package:phase343-final-runs-validator', () => assert.match(pkg.scripts['phase343:final'], /validate:phase343/));
check('package:phase343-final-cleans-runtime', () => assert.match(pkg.scripts['phase343:final'], /clean:runtime.*check-runtime-clean/));

check('run-all-tests:uses-terminal-gate', () => assert.match(runAll, /npm run phase343:final/));
check('readme:terminal-command-current', () => {
  assert.match(readme, /npm run phase343:final/);
  assert.match(readme, /release:predeploy.*delivery:final.*phase343:final/s);
});
check('readme:no-obsolete-phase323-final-command', () => assert.ok(!readme.includes('npm run phase323:final')));
check('readme:no-hidden-public-api-advertising', () => {
  ['/api/public/trustops-100-final','/api/public/trustops-final-handoff','/api/public/trustops-production-sentinel'].forEach(token => assert.ok(!readme.includes(token), token));
});

check('operational-contract:accepts-phase343', () => {
  assert.match(operational, /phase343-operational-readiness-contract/);
  assert.match(operational, /phase343:final/);
  assert.match(operational, /PHASE343_OPERATIONAL_READINESS_CONTRACT/);
});
check('validators:phase337-through-phase342-accept-phase343', () => {
  assert.match(phase337, /343/);
  assert.match(phase340, /phase343-final-perfect/);
  assert.match(phase341, /phase343-final-perfect/);
  assert.match(phase342, /phase343-final-perfect/);
});
check('public-api:isolation-preserved', () => {
  assert.match(publicRoutes, /customerHiddenOperationalEndpoints/);
  assert.match(publicRoutes, /api\/public\/diagnosis-engine/);
  assert.match(publicRoutes, /return json\(req, res, 404/);
});
check('security:headers-and-fetch-hardening-preserved', () => {
  ['isBlockedTargetUrlResolved','redirect: \'manual\'','TARGET_FETCH_MAX_BYTES','PAYMENT_REDIRECT_ALLOWED_HOSTS'].forEach(token => assert.ok(serverIndex.includes(token), token));
  assert.ok(!serverIndex.includes('x-vr-risk-guard'));
  assert.ok(!serverIndex.includes('x-vr-redirect-owner'));
});
check('docs:phase343-report-exists', () => assert.ok(exists('docs/PHASE343_FINAL_PERFECT_CLOSEOUT_REPORT.md')));
check('release:package-json-has-no-phase342-terminal-gate', () => {
  assert.ok(!packageText.includes('"delivery:final": "npm run phase342:final"'));
  assert.ok(!packageText.includes('"release:predeploy": "npm run phase342:final"'));
});

const report = {
  ok: failures.length === 0,
  phase: 'phase343-final-perfect',
  checked: checks.length,
  failed: failures.length,
  checks,
  failedChecks: failures,
  focus: [
    'terminal command alignment',
    'README and RUN_ALL_TESTS correction',
    'operational readiness contract upgraded to current final gate',
    'older validators allowed to recognize phase343 without weakening phase340 security baseline',
    'public API isolation and SSRF/payment/header hardening retained'
  ]
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE343_FINAL_PERFECT_VALIDATION.json'), JSON.stringify(report, null, 2));
if (failures.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, phase: report.phase, checked: report.checked, focus: report.focus }, null, 2));

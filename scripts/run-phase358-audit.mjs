import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const pkg = JSON.parse(read('package.json'));
const checks = [];
function add(name, fn) { try { fn(); checks.push({ name, ok: true }); } catch (error) { checks.push({ name, ok: false, error: error.message }); } }

add('package-version-phase358', () => assert.match(pkg.version, /phase358-commercial-deploy-integrity-closeout/));
add('description-phase358', () => assert.match(pkg.description || '', /phase358 commercial deploy integrity closeout/i));
add('terminal-aliases-phase358', () => { for (const key of ['delivery:final','release:predeploy','verify:release']) assert.equal(pkg.scripts[key], 'npm run phase358:final', key); });
add('run-all-tests-phase358', () => assert.match(read('RUN_ALL_TESTS.sh'), /npm run phase358:final/));
add('phase358-scripts-exist', () => {
  for (const file of ['scripts/check-phase358-commercial-deploy-integrity.mjs','scripts/run-phase358-audit.mjs','scripts/run-phase358-final.mjs']) assert.equal(exists(file), true, file);
});
add('phase358-docs-exist', () => {
  for (const file of ['docs/PHASE358_COMMERCIAL_DEPLOY_INTEGRITY_WORK_ORDER.md','docs/PHASE358_REMEDIATION_MATRIX.md','docs/PHASE358_COMMERCIAL_DEPLOY_INTEGRITY_CLOSEOUT.md']) assert.equal(exists(file), true, file);
});
add('historical-csp-contract-still-wired', () => assert.equal(pkg.scripts['check:csp-inline-style'], 'node scripts/check-csp-inline-style-contract.mjs'));
add('commercial-integrity-contract-wired', () => assert.equal(pkg.scripts['check:commercial-deploy-integrity'], 'node scripts/check-phase358-commercial-deploy-integrity.mjs'));
add('script-keys-sorted', () => assert.deepEqual(Object.keys(pkg.scripts), [...Object.keys(pkg.scripts)].sort((a,b) => a.localeCompare(b))));

const failures = checks.filter(item => !item.ok);
const report = { ok: failures.length === 0, phase: 'phase358-commercial-deploy-integrity-audit', checkedAt: new Date().toISOString(), checked: checks.length, failed: failures.length, failures, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE358_COMMERCIAL_DEPLOY_INTEGRITY_AUDIT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);

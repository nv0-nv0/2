import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const pkg = JSON.parse(read('package.json'));
const checks = [];
function add(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
}

add('package-version-phase354', () => assert.match(pkg.version, /phase354-deployment-security-closeout|phase355-organization-closeout|phase356-conversion-dashboard-closeout|phase357-global-qa-accessibility-closeout|phase358-commercial-deploy-integrity-closeout/));
add('delivery-final-phase354', () => assert.ok(['npm run phase354:final','npm run phase355:final','npm run phase356:final','npm run phase357:final','npm run phase358:final'].includes(pkg.scripts['delivery:final'])));
add('release-predeploy-phase354', () => assert.ok(['npm run phase354:final','npm run phase355:final','npm run phase356:final','npm run phase357:final','npm run phase358:final'].includes(pkg.scripts['release:predeploy'])));
add('run-all-tests-phase354', () => assert.match(read('RUN_ALL_TESTS.sh'), /npm run phase354:final|npm run phase355:final|npm run phase356:final|npm run phase357:final|npm run phase358:final/));
add('readme-phase354', () => assert.match(read('README.md'), /npm run phase354:final|npm run phase355:final|npm run phase356:final|npm run phase357:final|npm run phase358:final/));
add('gitignore-added', () => assert.equal(exists('.gitignore'), true));
add('public-probe-contract-added', () => assert.equal(pkg.scripts['test:public-probe-minimal'], 'node tests/public-probe-minimal-contract.mjs'));
add('compose-forwarding-check-added', () => assert.equal(pkg.scripts['check:compose-env-forwarding'], 'node scripts/check-compose-env-forwarding.mjs'));
add('phase354-final-runner-added', () => assert.equal(pkg.scripts['phase354:final'], 'node scripts/run-phase354-final.mjs'));
add('session-secret-local-example', () => assert.match(read('.env.example'), /^NV0_SESSION_SECRET=/m));
add('session-secret-coolify-template', () => assert.match(read('deploy/coolify.env.example'), /^NV0_SESSION_SECRET=/m));
add('compose-explicit-internal-api-off', () => ['docker-compose.yml','deploy/docker-compose.coolify.yml'].forEach(file => assert.match(read(file), /NV0_EXPOSE_INTERNAL_PUBLIC_APIS:\s*\$\{NV0_EXPOSE_INTERNAL_PUBLIC_APIS:-false\}/, file)));
add('compose-payment-allowlist-forwarded', () => ['docker-compose.yml','deploy/docker-compose.coolify.yml'].forEach(file => assert.match(read(file), /NV0_PAYMENT_REDIRECT_ALLOWED_HOSTS:/, file)));
add('healthz-sanitized', () => assert.match(read('server/index.mjs'), /buildPublicHealthzPayload\(payload\)/));
add('readyz-sanitized', () => assert.match(read('server/index.mjs'), /buildPublicReadyzPayload\(payload/));
add('phase354-docs-exist', () => ['docs/PHASE354_DEPLOYMENT_SECURITY_WORK_ORDER.md','docs/PHASE354_REMEDIATION_MATRIX.md','docs/PHASE354_DEPLOYMENT_SECURITY_CLOSEOUT.md'].forEach(file => assert.equal(exists(file), true, file)));

const failures = checks.filter(item => !item.ok);
const report = {
  ok: failures.length === 0,
  phase: 'phase354-deployment-security-closeout',
  checkedAt: new Date().toISOString(),
  checked: checks.length,
  failed: failures.length,
  failures,
  checks
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE354_GLOBAL_AUDIT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, checked: report.checked, failed: report.failed, report: 'docs/current/PHASE354_GLOBAL_AUDIT.json' }, null, 2));
if (!report.ok) process.exit(1);

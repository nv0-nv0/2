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

add('package-version-phase355', () => assert.match(pkg.version, /phase355-organization-closeout|phase356-conversion-dashboard-closeout|phase357-global-qa-accessibility-closeout|phase358-commercial-deploy-integrity-closeout/));
add('description-phase355', () => assert.match(pkg.description || '', /phase355 organization closeout|phase356 conversion dashboard closeout|phase357 global QA and accessibility closeout/i));
add('delivery-final-phase355', () => assert.ok(['npm run phase355:final','npm run phase356:final','npm run phase357:final','npm run phase358:final'].includes(pkg.scripts['delivery:final'])));
add('release-predeploy-phase355', () => assert.ok(['npm run phase355:final','npm run phase356:final','npm run phase357:final','npm run phase358:final'].includes(pkg.scripts['release:predeploy'])));
add('verify-release-phase355', () => assert.ok(['npm run phase355:final','npm run phase356:final','npm run phase357:final','npm run phase358:final'].includes(pkg.scripts['verify:release'])));
add('run-all-tests-phase355', () => assert.match(read('RUN_ALL_TESTS.sh'), /npm run phase355:final|npm run phase356:final|npm run phase357:final|npm run phase358:final/));
add('readme-phase355', () => assert.match(read('README.md'), /npm run phase355:final|npm run phase356:final|npm run phase357:final|npm run phase358:final/));
add('readme-correct-rollback', () => {
  const text = read('README.md');
  assert.match(text, /PHASE354.*PHASE353|PHASE356.*PHASE355|PHASE357.*PHASE356|PHASE358.*PHASE357/s);
  assert.doesNotMatch(text, /PHASE353 변경은 데이터 마이그레이션을 포함하지 않습니다\. 문제가 발생하면 PHASE352/);
});
add('simple-command-aliases', () => {
  assert.equal(pkg.scripts.help, 'node scripts/project-help.mjs');
  assert.equal(pkg.scripts.dev, 'npm start');
  assert.equal(pkg.scripts['verify:quick'], 'npm run check:syntax && npm test && npm run test:e2e && npm run smoke');
  assert.equal(pkg.scripts['runtime:clean'], 'npm run clean:runtime && node scripts/check-runtime-clean.mjs');
});
add('scripts-sorted-alphabetically', () => {
  const keys = Object.keys(pkg.scripts);
  assert.deepEqual(keys, [...keys].sort((a, b) => a.localeCompare(b)));
});
add('navigation-docs-exist', () => ['docs/INDEX.md','docs/CURRENT_RELEASE.md','docs/PROJECT_STRUCTURE.md','docs/current/README.md','deploy/README.md'].forEach(file => assert.equal(exists(file), true, file)));
add('phase355-docs-exist', () => ['docs/PHASE355_ORGANIZATION_WORK_ORDER.md','docs/PHASE355_REMEDIATION_MATRIX.md','docs/PHASE355_ORGANIZATION_CLOSEOUT.md','docs/PHASE355_FULL_PACKAGE_CLOSEOUT.md','docs/PHASE355_CHANGED_FILES.md'].forEach(file => assert.equal(exists(file), true, file)));
add('phase355-runner-added', () => assert.equal(pkg.scripts['phase355:final'], 'node scripts/run-phase355-final.mjs'));
add('phase355-audit-added', () => assert.equal(pkg.scripts['check:phase355-audit'], 'node scripts/run-phase355-audit.mjs'));
add('historical-assets-preserved', () => ['docs/PHASE311_CLEAN_REDTEAM_REPORT.md','docs/PHASE340_REDTEAM_100_CLOSEOUT_REPORT.md','docs/PHASE354_FULL_PACKAGE_CLOSEOUT.md','scripts/run-phase354-final.mjs'].forEach(file => assert.equal(exists(file), true, file)));
add('runtime-seed-preserved', () => assert.equal(exists('runtime/data/db.seed.json'), true));
add('volatile-runtime-not-shipped', () => ['runtime/data/db.json','runtime/data/sessions.json','runtime/data/secure-records'].forEach(file => assert.equal(exists(file), false, file)));
add('gitignore-volatile-runtime', () => {
  const text = read('.gitignore');
  ['runtime/data/db.json','runtime/data/sessions.json','runtime/data/secure-records/','runtime/uploads/','runtime/backups/','runtime/reports/'].forEach(token => assert.ok(text.includes(token), token));
});

const failures = checks.filter(item => !item.ok);
const report = {
  ok: failures.length === 0,
  phase: 'phase355-organization-closeout',
  checkedAt: new Date().toISOString(),
  checked: checks.length,
  failed: failures.length,
  failures,
  checks
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE355_GLOBAL_AUDIT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, checked: report.checked, failed: report.failed, report: 'docs/current/PHASE355_GLOBAL_AUDIT.json' }, null, 2));
if (!report.ok) process.exit(1);

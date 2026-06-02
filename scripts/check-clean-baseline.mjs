import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [];
const add = (name, fn) => { try { fn(); checks.push({ name, ok: true }); } catch (error) { checks.push({ name, ok: false, error: error.message }); } };
const exists = rel => fs.existsSync(path.join(root, rel));
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const walk = dir => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]) : [];
const rel = abs => path.relative(root, abs).replaceAll('\\', '/');
const files = walk(root).map(rel).filter(file => !file.startsWith('.git/'));
const pkg = JSON.parse(read('package.json'));

add('package-version-clean-baseline', () => assert.equal(pkg.version, '2.3.0-executive-trust-report-system'));
add('single-terminal-release-gate', () => {
  assert.equal(pkg.scripts['verify:release'], 'node scripts/run-release-gate.mjs');
  assert.equal(pkg.scripts['release:predeploy'], 'npm run verify:release');
  assert.equal(pkg.scripts['delivery:final'], 'npm run verify:release');
  assert.equal(pkg.scripts['check:reference-integrity'], 'node scripts/check-reference-integrity.mjs');
});
add('no-historical-phase-docs', () => assert.deepEqual(files.filter(file => file.startsWith('docs/') && !file.startsWith('docs/current/') && /PHASE\d+/i.test(file)), []));
add('no-historical-phase-scripts', () => assert.deepEqual(files.filter(file => /^scripts\/(?:run-phase|validate-phase|apply-phase|migrate-|repair-)/i.test(file)), []));
add('no-active-phase-evidence-paths', () => {
  const active = [...walk(path.join(root, 'scripts')), ...walk(path.join(root, 'tests'))].map(rel);
  const offenders = active.filter(file => /\.(?:mjs|js)$/.test(file)).filter(file => /docs\/current\/PHASE\d+/i.test(read(file)));
  assert.deepEqual(offenders, []);
});
add('no-stale-engine-script-paths', () => {
  const text = read('server/core/engine-agent-orchestrator.mjs');
  assert.doesNotMatch(text, /scripts\/(?:run-phase|validate-phase|redteam-global-audit)/i);
});
add('no-git-metadata', () => assert.equal(exists('.git'), false));
add('required-docs', () => { for (const file of ['docs/INDEX.md','docs/ARCHITECTURE.md','docs/DEPLOYMENT.md','docs/OPERATIONS.md','docs/QA.md','docs/ROLLBACK.md','docs/CLEANUP_REPORT.md','docs/COMPATIBILITY.md']) assert.equal(exists(file), true, file); });
add('canonical-stylesheet-only', () => {
  assert.equal(exists('shared/veridion-rebrand.css'), true);
  assert.equal(exists('shared/base.css'), false);
  assert.equal(exists('shared/veridion-clean-v311.css'), false);
});
add('no-empty-page-css-debris', () => {
  const debris = files.filter(file => /^apps\/.+\/app\.css$/.test(file) && !['apps/public/demo/app.css','apps/public/home/app.css'].includes(file));
  assert.deepEqual(debris, []);
});
add('no-single-import-public-wrapper-debris', () => {
  const debris = files.filter(file => /^apps\/public\/.+\/app\.js$/.test(file)).filter(file => read(file).trim() === "import '/shared/public-page-optimizer.js';");
  assert.deepEqual(debris, []);
});
add('no-forbidden-runtime-state', () => {
  const forbidden = files.filter(file => file === 'runtime/data/db.json' || file === 'runtime/data/sessions.json' || file.startsWith('runtime/data/secure-records/') || file.startsWith('runtime/uploads/') || file.startsWith('runtime/backups/') || file.startsWith('runtime/reports/') || file.startsWith('runtime-test-'));
  assert.deepEqual(forbidden, []);
});
add('no-real-root-env-files', () => {
  const allowed = new Set(['.env.example','.env.coolify.example']);
  const forbidden = files.filter(file => path.posix.basename(file).startsWith('.env') && !allowed.has(file));
  assert.deepEqual(forbidden, []);
});
add('stable-core-module-filenames', () => {
  const core = files.filter(file => file.startsWith('server/core/'));
  assert.deepEqual(core.filter(file => /phase\d+|-[0-9]{3}\.mjs$/i.test(file)), []);
});
add('no-legacy-diagnosis-ui-debris', () => {
  const js = read('apps/public/demo/app.js');
  const css = read('apps/public/demo/app.css');
  for (const token of ['renderConversionCommandCenter','renderCrisisAreaMap','renderProgressiveEvidenceDetails','renderDemoCountOnlyResult','vr-phase356-conversion-report','vr-crisis-command-center']) assert.equal(js.includes(token) || css.includes(token), false, token);
  assert.doesNotMatch(css, /\.vr-(?:crisis|target|score)-\d+\{/);
});
add('script-surface-reduced', () => assert.ok(Object.keys(pkg.scripts).length <= 70, `too many scripts: ${Object.keys(pkg.scripts).length}`));
add('package-file-count-reduced', () => assert.ok(files.length < 350, `package still bloated: ${files.length}`));

const failures = checks.filter(item => !item.ok);
const report = { ok: failures.length === 0, contract: 'clean-commercial-baseline-audit', checkedAt: new Date().toISOString(), files: files.length, scripts: Object.keys(pkg.scripts).length, checked: checks.length, failed: failures.length, failures, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/CLEAN_BASELINE_AUDIT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);

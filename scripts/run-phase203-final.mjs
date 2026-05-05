import { spawnSync } from 'node:child_process';

const steps = [
  ['check:syntax', ['node', 'scripts/check-source-syntax.mjs']],
  ['GOLDEN_CORE', ['node', 'tests/phase203-intent-firewall.mjs']],
  ['unit', ['node', 'scripts/test-all.mjs']],
  ['routes', ['node', 'tests/routes-smoke.mjs']],
  ['e2e', ['node', 'tests/e2e.mjs']],
  ['phase201', ['node', 'tests/phase201-product-quality.mjs']],
  ['phase202', ['node', 'tests/phase202-live-consistency.mjs']],
  ['STATIC_UI', ['node', 'scripts/check-client-render-safety.mjs']],
  ['pages', ['node', 'scripts/check-page-integrity.mjs']],
  ['links', ['node', 'scripts/check-links.mjs', '--summary']],
  ['env', ['node', 'scripts/check-env-examples.mjs']],
  ['deploy', ['node', 'scripts/validate-deploy-bundle.mjs']],
  ['phase203', ['node', 'scripts/validate-phase203-global-engine-100.mjs']]
];

const results = [];
for (const [name, cmd] of steps) {
  const started = Date.now();
  const run = spawnSync(cmd[0], cmd.slice(1), { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });
  results.push({ name, ok: run.status === 0, ms: Date.now() - started });
  if (run.status !== 0) {
    console.error(run.stdout);
    console.error(run.stderr);
    console.log(JSON.stringify({ ok: false, failedAt: name, results }, null, 2));
    process.exit(1);
  }
}
console.log(JSON.stringify({ ok: true, score: 100, passedSteps: results.length, totalSteps: steps.length, results, checkedAt: new Date().toISOString() }, null, 2));

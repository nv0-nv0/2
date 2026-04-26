import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const docsDir = path.join(root, 'docs');
fs.mkdirSync(docsDir, { recursive: true });
const tasks = [
  ['syntax', 'scripts/check-source-syntax.mjs', 30000],
  ['test-all', 'scripts/test-all.mjs', 300000],
  ['content-completeness', 'scripts/check-content-completeness.mjs', 30000],
  ['whole-package-completion', 'scripts/check-phase105-whole-package-completion.mjs', 30000],
  ['ast-placeholder-guard', 'scripts/check-ast-placeholder-guard.mjs', 30000],
  ['local-ai-review', 'scripts/local-ai-code-review.mjs', 30000],
  ['monitoring-rollback-gate', 'scripts/monitoring-rollback-gate.mjs', 30000],
  ['phase76-security-routing', 'scripts/validate-phase76-security-routing.mjs', 30000],
  ['phase77-visibility-unification', 'scripts/validate-phase77-visibility-unification.mjs', 30000],
  ['phase100-visual-accessibility', 'scripts/validate-phase100-visual-accessibility.mjs', 30000],
  ['ci-strict', 'scripts/ci-strict.mjs', 300000]
];
const results = [];
for (const [name, script, timeout] of tasks) {
  const started = Date.now();
  try {
    execFileSync('node', [script], { cwd: root, stdio: 'inherit', timeout, env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production', NV0_TARGET_FETCH_ENABLED: 'false', NV0_ENABLE_TURNSTILE: 'false' } });
    results.push({ name, ok: true, durationMs: Date.now() - started });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, ok: false, durationMs: Date.now() - started, error: error.message, status: error.status, signal: error.signal });
    console.log(`FAIL ${name}`);
    break;
  }
}
const ok = results.length === tasks.length && results.every(r => r.ok);
const report = { generatedAt: new Date().toISOString(), ok, phase: 106, name: 'selection-options-complete-final-gate', results };
fs.writeFileSync(path.join(docsDir, 'PHASE106_SELECTION_OPTIONS_VALIDATION_20260426.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok, report: 'docs/PHASE106_SELECTION_OPTIONS_VALIDATION_20260426.json' }, null, 2));
process.exit(ok ? 0 : 1);

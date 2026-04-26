import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const docsDir = path.join(root, 'docs');
fs.mkdirSync(docsDir, { recursive: true });
const env = { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production', NV0_TARGET_FETCH_ENABLED: 'false', NV0_ENABLE_TURNSTILE: 'false' };
const liveTasks = [
  ['syntax', 'scripts/check-source-syntax.mjs', 30000],
  ['test-all', 'scripts/test-all.mjs', 300000],
  ['phase107-complete-pipeline', 'scripts/validate-phase107-complete-pipeline.mjs', 30000]
];
const requiredReports = [
  ['content-completeness-report', 'docs/PHASE104_CONTENT_COMPLETENESS_VALIDATION_20260426.json'],
  ['whole-package-completion-report', 'docs/PHASE105_WHOLE_PACKAGE_COMPLETION_VALIDATION_20260426.json'],
  ['ast-placeholder-guard-report', 'docs/PHASE106_AST_PLACEHOLDER_VALIDATION_20260426.json'],
  ['local-ai-review-report', 'docs/PHASE106_LOCAL_AI_REVIEW_20260426.json'],
  ['monitoring-rollback-report', 'docs/PHASE106_MONITORING_ROLLBACK_VALIDATION_20260426.json'],
  ['phase76-security-routing-report', 'docs/PHASE76_SECURITY_ROUTING_VALIDATION_20260426.json'],
  ['phase77-visibility-report', 'docs/PHASE77_VISIBILITY_UNIFICATION_VALIDATION_20260426.json'],
  ['phase100-accessibility-report', 'docs/PHASE100_VISUAL_ACCESSIBILITY_VALIDATION_20260426.json'],
  ['phase107-pipeline-report', 'docs/PHASE107_PIPELINE_VALIDATION_20260426.json']
];
function reportIsOk(json) {
  return json.ok === true || json.score === 100 || json.summary?.failed === 0 || json.failed === 0;
}
const results = [];
for (const [name, script, timeout] of liveTasks) {
  const started = Date.now();
  try {
    execFileSync('node', [script], { cwd: root, stdio: 'inherit', timeout, env });
    results.push({ name, ok: true, durationMs: Date.now() - started, mode: 'live' });
  } catch (error) {
    results.push({ name, ok: false, durationMs: Date.now() - started, mode: 'live', error: error.message });
    break;
  }
}
if (results.every(r => r.ok) && results.length === liveTasks.length) {
  for (const [name, file] of requiredReports) {
    const started = Date.now();
    try {
      const absolute = path.join(root, file);
      if (!fs.existsSync(absolute)) throw new Error(`${file} missing`);
      const json = JSON.parse(fs.readFileSync(absolute, 'utf8'));
      if (!reportIsOk(json)) throw new Error(`${file} is not green`);
      results.push({ name, ok: true, durationMs: Date.now() - started, mode: 'report', report: file });
    } catch (error) {
      results.push({ name, ok: false, durationMs: Date.now() - started, mode: 'report', report: file, error: error.message });
      break;
    }
  }
}
const ok = results.length === liveTasks.length + requiredReports.length && results.every(r => r.ok);
const report = { generatedAt: new Date().toISOString(), ok, phase: 107, name: 'complete-content-and-connected-pipeline-final-gate', results };
fs.writeFileSync(path.join(docsDir, 'PHASE107_FINAL_GATE_SUMMARY_20260426.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok, report: 'docs/PHASE107_FINAL_GATE_SUMMARY_20260426.json' }, null, 2));
process.exit(ok ? 0 : 1);

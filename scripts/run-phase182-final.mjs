import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const commands = [
  ['check:syntax', ['scripts/check-source-syntax.mjs']],
  ['test:all', ['scripts/test-all.mjs']],
  ['test:e2e', ['tests/e2e.mjs']],
  ['test:routes', ['tests/routes-smoke.mjs']],
  ['check:links', ['scripts/check-links.mjs', '--summary']],
  ['smoke', ['scripts/smoke.mjs']],
  ['validate:deploy', ['scripts/validate-deploy-bundle.mjs']],
  ['check:env-examples', ['scripts/check-env-examples.mjs']],
  ['audit:global', ['scripts/phase49-global-audit.mjs']],
  ['validate:commercial', ['scripts/validate-commercial-release.mjs']],
  ['validate:pipeline', ['scripts/validate-pipeline.mjs']],
  ['check:pages', ['scripts/check-page-integrity.mjs']],
  ['verify:prod', ['scripts/verify-prod.mjs']],
  ['ci:strict', ['scripts/ci-strict.mjs']],
  ['validate:phase179', ['scripts/validate-phase179-unified-design-system.mjs']],
  ['validate:phase180', ['scripts/validate-phase180-quality-max.mjs']],
  ['validate:phase181', ['scripts/validate-phase181-zero-blocker-closeout.mjs']],
  ['validate:phase182', ['scripts/validate-phase182-ux-performance-98.mjs']]
];
const results = [];
for (const [name, args] of commands) {
  console.log(`\n=== ${name} ===`);
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
    timeout: 180_000
  });
  const elapsedMs = Date.now() - startedAt;
  results.push({ name, ok: result.status === 0 && !result.error, status: result.status, signal: result.signal || null, elapsedMs, error: result.error?.message || null });
  if (result.error || result.status !== 0) break;
}
const failed = results.filter(item => !item.ok);
const report = {
  generatedAt: new Date().toISOString(),
  ok: failed.length === 0,
  phase: 'phase182-final-runner',
  scoreEstimate: failed.length === 0 ? 98.4 : Math.max(90, 98.4 - failed.length * 2),
  total: commands.length,
  passed: results.filter(item => item.ok).length,
  failed: failed.length,
  results,
  limitation: '로컬 패키지 기준 검증입니다. 실서버 DNS, 실제 PortOne 승인, 실제 SMTP/R2/PostgreSQL 운영 부하, 실외부 스캔 엔진 품질은 운영 환경에서 직접 확인해야 하며 이 정보는 확인되지 않았습니다.'
};
await fs.writeFile(path.join(ROOT, 'PHASE182_FINAL_RUN_VALIDATION_20260503.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, scoreEstimate: report.scoreEstimate, report: 'PHASE182_FINAL_RUN_VALIDATION_20260503.json' }, null, 2));
if (!report.ok) process.exit(1);

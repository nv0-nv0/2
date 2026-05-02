import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportPath = path.join(root, 'docs', 'PHASE168_FINAL_DELIVERY_GATE_20260502.json');

const commands = [
  'node scripts/clean-release-runtime.mjs',
  'node scripts/check-source-syntax.mjs',
  'node scripts/test-all.mjs',
  'node tests/e2e.mjs',
  'node tests/routes-smoke.mjs',
  'node tests/session-persistence.mjs',
  'node tests/runtime-persistence.mjs',
  'node tests/security-stateful.mjs',
  'node tests/provider-adapters.mjs',
  'node tests/portone-provider.mjs',
  'node tests/portone-events.mjs',
  'node tests/contracts-fuzz.mjs',
  'node scripts/check-links.mjs --summary',
  'node scripts/restore-drill.mjs',
  'node scripts/stress-smoke.mjs',
  'node scripts/validate-phase156-global-ux-flow.mjs',
  'node scripts/validate-phase157-nonpayment-ops.mjs',
  'node scripts/validate-phase158-e2big-hotfix.mjs',
  'node scripts/validate-phase159-reader-demo-board.mjs',
  'node scripts/validate-phase160-evidence-first-diagnosis.mjs',
  'node scripts/validate-phase161-zero-cost-max-coverage.mjs',
  'node scripts/validate-phase162-free-auto-disclosure.mjs',
  'node scripts/validate-phase163-remote-backup-security.mjs',
  'node scripts/validate-phase164-zero-cost-hardening-50.mjs',
  'node scripts/validate-phase165-route-security-validation-fix.mjs',
  'node scripts/validate-phase165-final-consolidation.mjs',
  'node scripts/validate-phase166-native-route-split.mjs',
  'node scripts/validate-phase167-native-http-load-security.mjs',
  'node scripts/clean-release-runtime.mjs'
];

function parseCommand(command) {
  const parts = command.split(/\s+/g).filter(Boolean);
  if (parts[0] === 'node') return { command: process.execPath, args: parts.slice(1) };
  return { command: parts[0], args: parts.slice(1) };
}

const results = [];
const startedAt = new Date().toISOString();
for (const commandString of commands) {
  const started = Date.now();
  console.log(`\n[delivery-gate] ${commandString}`);
  const parsed = parseCommand(commandString);
  const result = spawnSync(parsed.command, parsed.args, {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf8',
    timeout: 60_000,
    killSignal: 'SIGKILL',
    env: { ...process.env }
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  console.log(`[delivery-gate] done ${commandString} status=${result.status ?? 'null'} signal=${result.signal || ''}`);
  const item = {
    command: commandString,
    ok: result.status === 0 && !result.error,
    status: result.status,
    signal: result.signal || null,
    error: result.error ? String(result.error.message || result.error) : null,
    elapsedMs: Date.now() - started
  };
  results.push(item);
  if (!item.ok) {
    const report = {
      ok: false,
      phase: 'phase168-zero-risk-best-unified-delivery-gate',
      startedAt,
      finishedAt: new Date().toISOString(),
      passed: results.filter(v => v.ok).length,
      failed: results.filter(v => !v.ok).length,
      results
    };
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
    console.error(JSON.stringify(report, null, 2));
    process.exit(result.status || 1);
  }
}

const report = {
  ok: true,
  phase: 'phase168-zero-risk-best-unified-delivery-gate',
  startedAt,
  finishedAt: new Date().toISOString(),
  passed: results.length,
  failed: 0,
  results
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));

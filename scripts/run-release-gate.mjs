import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PACKAGE_VERSION } from '../shared/release-version.mjs';

const root = process.cwd();
const gateId = `veridion-${PACKAGE_VERSION}`;
const timeoutMs = Number(process.env.NV0_RELEASE_STEP_TIMEOUT_MS || 60000);
const steps = [
  ['clean:audit-evidence', 'node', ['scripts/clean-current-audit-evidence.mjs']],
  ['clean:runtime', 'npm', ['run','clean:runtime']],
  ['check:clean-baseline', 'npm', ['run','check:clean-baseline']],
  ['check:commercial-max-hardening', 'node', ['scripts/check-commercial-max-hardening.mjs']],
  ['test:commercial-max-hardening', 'node', ['tests/commercial-max-hardening-contract.mjs']],
  ['test:commercial-mfa-entrypoint-normalization', 'node', ['tests/commercial-mfa-entrypoint-normalization-contract.mjs']],
  ['test:commercial-totp-preflight-alignment', 'node', ['tests/commercial-totp-preflight-contract.mjs']],
  ['test:commercial-totp-transport-hardening', 'node', ['tests/commercial-totp-transport-hardening-contract.mjs']],
  ['test:commercial-totp-safe-hold', 'node', ['tests/commercial-totp-safe-hold-contract.mjs']],
  ['test:commercial-runtime-startup-preflight', 'node', ['tests/commercial-runtime-startup-preflight-contract.mjs']],
  ['test:system-control-plane', 'node', ['tests/system-control-plane-contract.mjs']],
  ['test:system-control-plane-operations-hardening', 'node', ['tests/system-control-plane-operations-hardening-contract.mjs']],
  ['test:ui-foundation-hardening', 'node', ['tests/ui-foundation-hardening-contract.mjs']],
  ['check:delivery-hygiene', 'node', ['scripts/check-delivery-hygiene.mjs']],
  ['check:static-html-quality', 'node', ['scripts/check-static-html-quality.mjs']],
  ['check:enhanced-html-accessibility', 'node', ['scripts/check-enhanced-html-accessibility.mjs']],
  ['check:deep-html-page-contract', 'node', ['scripts/check-page-contract-deep.mjs']],
  ['check:external-asset-whitelist', 'node', ['scripts/check-external-asset-whitelist.mjs']],
  ['check:public-navigation-state', 'node', ['scripts/check-public-navigation-state.mjs']],
  ['check:url-input-ergonomics', 'node', ['scripts/check-url-input-ergonomics.mjs']],
  ['check:semantic-identifiers', 'node', ['scripts/check-semantic-identifiers.mjs']],
  ['check:duplicate-sync', 'node', ['scripts/check-duplicate-sync.mjs']],
  ['check:clean-rebase-hygiene', 'node', ['scripts/check-clean-rebase-hygiene.mjs']],
  ['check:release-version-sync', 'node', ['scripts/check-release-version-sync.mjs']],
  ['check:canonical-domain-sync', 'node', ['scripts/check-canonical-domain-sync.mjs']],
  ['check:static-seo-fallback', 'node', ['scripts/check-static-seo-fallback.mjs']],
  ['check:generated-error-page', 'node', ['scripts/check-generated-error-page-contract.mjs']],
  ['check:operator-documentation-current', 'node', ['scripts/check-operator-documentation-current.mjs']],
  ['check:korean-first-ui', 'node', ['scripts/check-korean-first-ui.mjs']],
  ['check:asset-integrity', 'npm', ['run','check:asset-integrity']],
  ['check:stitch-experience-pipeline', 'node', ['scripts/check-stitch-experience-pipeline.mjs']],
  ['test:stitch-experience-pipeline', 'node', ['tests/stitch-experience-pipeline.mjs']],
  ['test:commercial-closeout', 'npm', ['run','test:commercial-closeout']],
  ['check:runtime-audits', 'npm', ['run','check:runtime-audits']],
  ['check:syntax', 'npm', ['run','check:syntax']],
  ['check:reference-integrity', 'npm', ['run','check:reference-integrity']],
  ['test', 'npm', ['test']],
  ['test:e2e', 'npm', ['run','test:e2e']],
  ['test:routes', 'npm', ['run','test:routes']],
  ['smoke', 'npm', ['run','smoke']],
  ['test:diagnosis-result-ui', 'npm', ['run','test:diagnosis-result-ui']],
  ['test:report-excellence', 'npm', ['run','test:report-excellence']],
  ['test:global-qa-accessibility', 'npm', ['run','test:global-qa-accessibility']],
  ['test:public-target-ssrf', 'npm', ['run','test:public-target-ssrf']],
  ['clean:runtime-before-isolation', 'npm', ['run','clean:runtime']],
  ['test:runtime-isolation', 'npm', ['run','test:runtime-isolation']],
  ['test:commerce', 'npm', ['run','test:commerce']],
  ['test:paid-redteam', 'npm', ['run','test:paid-redteam']],
  ['test:trustops', 'npm', ['run','test:trustops']],
  ['check:pages', 'npm', ['run','check:pages']],
  ['check:links', 'npm', ['run','check:links']],
  ['check:accessibility', 'npm', ['run','check:accessibility']],
  ['check:responsive-contract', 'npm', ['run','check:responsive-contract']],
  ['check:button-contrast', 'npm', ['run','check:button-contrast']],
  ['check:csp-inline-style', 'npm', ['run','check:csp-inline-style']],
  ['check:performance-budget', 'npm', ['run','check:performance-budget']],
  ['verify:security', 'npm', ['run','verify:security']],
  ['test:security-host-guard-contract', 'node', ['tests/security-host-guard-contract.mjs']],
  ['check:local-production-crawl', 'node', ['scripts/check-local-production-crawl.mjs']],
  ['test:public-page-cache', 'node', ['tests/public-page-cache-contract.mjs']],
  ['test:public-response-compression', 'node', ['tests/public-response-compression-contract.mjs']],
  ['check:public-api-isolation', 'npm', ['run','check:public-api-isolation']],
  ['check:public-product-pipeline', 'npm', ['run','check:public-product-pipeline']],
  ['validate:deploy', 'npm', ['run','validate:deploy']],
  ['validate:commercial', 'npm', ['run','validate:commercial']],
  ['validate:commercial-runtime', 'npm', ['run','validate:commercial-runtime']],
  ['check:compose-env-forwarding', 'npm', ['run','check:compose-env-forwarding']],
  ['validate:coolify-env', 'npm', ['run','validate:coolify-env']],
  ['check:release-secret-hygiene', 'npm', ['run','check:release-secret-hygiene']],
  ['check:operational-contract', 'npm', ['run','check:operational-contract']],
  ['clean:runtime-final', 'npm', ['run','clean:runtime']],
  ['check:runtime-clean', 'npm', ['run','check:runtime-clean']],
  ['check:clean-baseline-final', 'npm', ['run','check:clean-baseline']]
];
const reportPath = path.join(root, 'docs/current/RELEASE_GATE_REPORT.json');
const workerMode = String(process.env.NV0_RELEASE_WORKER || 'false').trim().toLowerCase() === 'true';
const maxStepsPerRun = Math.max(0, Number(process.env.NV0_RELEASE_MAX_STEPS_PER_RUN || 0));
const selfPath = fileURLToPath(import.meta.url);

function readCheckpoint() {
  try {
    return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch {
    return null;
  }
}

async function runWorkerSegment({ resume, segmentSize, cycle, targetAttempted }) {
  const segmentTimeoutMs = Math.max(timeoutMs + 10_000, Number(process.env.NV0_RELEASE_SEGMENT_TIMEOUT_MS || 120000));
  return new Promise(resolve => {
    let settled = false;
    let forceTimer = null;
    let progressGraceTimer = null;
    const detached = process.platform !== 'win32';
    const child = spawn(process.execPath, [selfPath], {
      cwd: root,
      detached,
      env: {
        ...process.env,
        NV0_RELEASE_WORKER: 'true',
        NV0_RELEASE_RESUME: String(resume),
        NV0_RELEASE_MAX_STEPS_PER_RUN: String(segmentSize),
        NV0_RELEASE_QUIET: 'true'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', chunk => { stdout = appendTail(stdout, chunk); });
    child.stderr?.on('data', chunk => { stderr = appendTail(stderr, chunk); });
    const terminate = signal => {
      try {
        if (detached && child.pid) process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch {}
    };
    const finish = (status, signal, error = null, checkpointObserved = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(progressTimer);
      if (forceTimer) clearTimeout(forceTimer);
      if (progressGraceTimer) clearTimeout(progressGraceTimer);
      child.stdout?.destroy();
      child.stderr?.destroy();
      resolve({ status, signal, error, cycle, checkpointObserved, stdout, stderr });
    };
    const timer = setTimeout(() => {
      terminate('SIGTERM');
      forceTimer = setTimeout(() => terminate('SIGKILL'), 1_500);
      forceTimer.unref?.();
      finish(null, 'SEGMENT_TIMEOUT', new Error(`Release segment ${cycle} timed out`));
    }, segmentTimeoutMs);
    const progressTimer = setInterval(() => {
      const report = readCheckpoint();
      if (!report) return;
      if (report.status === 'failed' || report.failed > 0) {
        terminate('SIGTERM');
        finish(1, 'CHECKPOINT_FAILED', null, true);
        return;
      }
      if (Number(report.attempted || 0) < targetAttempted) return;
      if (report.status === 'partial' || report.status === 'passed') {
        terminate('SIGTERM');
        finish(0, 'CHECKPOINT_COMPLETE', null, true);
        return;
      }
      if (!progressGraceTimer) {
        progressGraceTimer = setTimeout(() => {
          terminate('SIGTERM');
          finish(0, 'CHECKPOINT_PROGRESS', null, true);
        }, 750);
      }
    }, 100);
    child.once('error', error => finish(null, null, error));
    child.once('exit', (status, signal) => finish(status, signal));
  });
}

async function runSegmentedGate() {
  const previousCheckpoint = readCheckpoint();
  const freshRequested = process.argv.includes('--fresh');
  const explicitResume = process.argv.includes('--resume') || String(process.env.NV0_RELEASE_RESUME || 'false').trim().toLowerCase() === 'true';
  const resumableCheckpoint = ['running', 'resuming', 'partial'].includes(previousCheckpoint?.status);
  const resumeInitially = !freshRequested && (explicitResume || resumableCheckpoint);
  const segmentSize = Math.max(1, Number(process.env.NV0_RELEASE_SEGMENT_SIZE || 2));
  const maxCycles = Math.max(1, Number(process.env.NV0_RELEASE_MAX_SEGMENTS || Math.ceil(steps.length / segmentSize) + 3));
  if (!resumeInitially) fs.rmSync(reportPath, { force: true });
  let previousAttempted = -1;
  for (let cycle = 1; cycle <= maxCycles; cycle += 1) {
    const existing = readCheckpoint();
    if (existing?.status === 'passed' && existing?.ok) return existing;
    const resume = resumeInitially || cycle > 1 || Boolean(existing);
    console.log(`[SEGMENT ${cycle}/${maxCycles}] release gate ${resume ? 'resume' : 'fresh'} · max ${segmentSize} steps`);
    const targetAttempted = Math.min(steps.length, Number(existing?.attempted || 0) + segmentSize);
    const child = await runWorkerSegment({ resume, segmentSize, cycle, targetAttempted });
    const report = readCheckpoint();
    if (!report) throw new Error(`Release segment ${cycle} ended without checkpoint (status=${child.status}, signal=${child.signal || 'none'})`);
    console.log(`[SEGMENT DONE] ${report.attempted}/${report.total} · ${report.status} · next=${report.nextStep || 'none'}`);
    if (report.status === 'failed' || report.failed > 0) return report;
    if (report.status === 'passed' && report.ok) return report;
    if (report.attempted <= previousAttempted) {
      throw new Error(`Release gate made no progress at segment ${cycle}: attempted=${report.attempted}`);
    }
    previousAttempted = report.attempted;
  }
  throw new Error(`Release gate did not complete within ${maxCycles} segments`);
}

if (!workerMode) {
  try {
    const report = await runSegmentedGate();
    console.log(JSON.stringify({ ok: report.ok, status: report.status, resumable: report.resumable, nextStep: report.nextStep, gate: report.gate, passed: report.passed, attempted: report.attempted, total: report.total, failed: report.failed, report: 'docs/current/RELEASE_GATE_REPORT.json' }, null, 2));
    process.exit(report.ok ? 0 : 1);
  } catch (error) {
    console.error(`[FAIL] segmented release gate: ${error.message}`);
    process.exit(1);
  }
}
const quietWorker = String(process.env.NV0_RELEASE_QUIET || 'false').trim().toLowerCase() === 'true';
const resumeRequested = String(process.env.NV0_RELEASE_RESUME || 'false').trim().toLowerCase() === 'true';
let results = [];
let startedAt = new Date().toISOString();
if (resumeRequested && fs.existsSync(reportPath)) {
  try {
    const previous = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    if (previous.gate === gateId && Array.isArray(previous.results)) {
      startedAt = previous.startedAt || startedAt;
      for (const item of previous.results) {
        const expected = steps[results.length]?.[0];
        if (!item?.ok || item.name !== expected) break;
        results.push({ ...item, resumed: true });
      }
    }
  } catch {}
}
const requestedFromStep = String(process.env.NV0_RELEASE_FROM_STEP || '').trim();
let startIndex = results.length;
if (requestedFromStep) {
  const requestedIndex = steps.findIndex(([name]) => name === requestedFromStep);
  if (requestedIndex < 0) throw new Error(`Unknown NV0_RELEASE_FROM_STEP: ${requestedFromStep}`);
  startIndex = requestedIndex;
  if (results.length > startIndex) results = results.slice(0, startIndex);
}
function writeCheckpoint(status = 'running') {
  const failures = results.filter(item => !item.ok);
  const report = {
    ok: status === 'passed' && failures.length === 0 && results.length === steps.length,
    status,
    resumable: true,
    nextStep: steps[results.length]?.[0] || null,
    gate: gateId,
    startedAt,
    finishedAt: new Date().toISOString(),
    passed: results.filter(item => item.ok).length,
    attempted: results.length,
    total: steps.length,
    failed: failures.length,
    results
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  return report;
}
writeCheckpoint(startIndex > 0 ? 'resuming' : 'running');
function appendTail(current, chunk, maxLength = 12_000) {
  return `${current}${String(chunk || '')}`.slice(-maxLength);
}
async function runStep(cmd, args) {
  return new Promise(resolve => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;
    let forceTimer = null;
    const detached = process.platform !== 'win32';
    const child = spawn(cmd, args, { cwd: root, detached, shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout?.on('data', chunk => { stdout = appendTail(stdout, chunk); });
    child.stderr?.on('data', chunk => { stderr = appendTail(stderr, chunk); });
    const terminate = signal => {
      try {
        if (detached && child.pid) process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch {}
    };
    const timer = setTimeout(() => {
      timedOut = true;
      terminate('SIGTERM');
      forceTimer = setTimeout(() => terminate('SIGKILL'), 1_500);
    }, timeoutMs);
    const finish = (status, signal, error = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (forceTimer) clearTimeout(forceTimer);
      child.stdout?.destroy();
      child.stderr?.destroy();
      if (status !== null) terminate('SIGTERM');
      resolve({ status, signal, timedOut, stdout, stderr, error });
    };
    child.once('error', error => finish(null, null, error));
    child.once('exit', (status, signal) => finish(status, signal));
  });
}
const endIndex = maxStepsPerRun > 0 ? Math.min(steps.length, startIndex + maxStepsPerRun) : steps.length;
for (const [name, cmd, args] of steps.slice(startIndex, endIndex)) {
  const started = Date.now();
  const res = await runStep(cmd, args);
  const ok = res.status === 0 && !res.timedOut && !res.error;
  const item = { name, ok, status: res.status, signal: res.signal, timedOut: res.timedOut, durationMs: Date.now() - started, stdoutTail: res.stdout, stderrTail: res.stderr, error: res.error?.message || null };
  results.push(item);
  writeCheckpoint(ok ? 'running' : 'failed');
  if (!quietWorker) console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name} ${item.durationMs}ms${item.timedOut ? ' TIMEOUT' : ''}`);
  if (!ok) break;
}
const failures = results.filter(item => !item.ok);
const report = writeCheckpoint(failures.length === 0 && results.length === steps.length ? 'passed' : failures.length ? 'failed' : 'partial');
if (!quietWorker) console.log(JSON.stringify({ ok: report.ok, status: report.status, resumable: report.resumable, nextStep: report.nextStep, gate: report.gate, passed: report.passed, attempted: report.attempted, total: report.total, failed: report.failed, report: 'docs/current/RELEASE_GATE_REPORT.json' }, null, 2));
if (report.status === 'failed') process.exit(1);

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const port = Number(process.env.NV0_STRESS_SMOKE_PORT || 3291);
const runtimeDir = path.join(ROOT, 'runtime-test-stress-smoke');
await fs.rm(runtimeDir, { recursive: true, force: true });
await fs.mkdir(path.join(runtimeDir, 'data'), { recursive: true });

const env = {
  ...process.env,
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: String(port),
  NV0_RUNTIME_DIR: runtimeDir,
  NV0_PLATFORM_TARGET: 'mvp',
  NV0_DEPLOYMENT_STAGE: 'mvp',
  NV0_ADMIN_AUTH_MODE: 'shared_key',
  NV0_ADMIN_KEY: 'stress-smoke-key',
  NV0_RUN_PREFLIGHT: 'false',
  NV0_AUTO_BACKUP_ENABLED: 'false',
  NV0_CTA_AUTOPUBLISH_INTERVAL_MS: '86400000'
};

const child = spawn(process.execPath, ['server/index.mjs'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
let stdout = '';
let stderr = '';
child.stdout.on('data', chunk => { stdout += chunk.toString(); });
child.stderr.on('data', chunk => { stderr += chunk.toString(); });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitReady() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (res.ok) return;
    } catch {}
    await wait(150);
  }
  throw new Error(`stress smoke server not ready: ${stderr.slice(-1000)}`);
}

const targets = ['/healthz', '/health', '/livez', '/api/public/health', '/api/public/plans'];
const hiddenTargets = ['/api/public/openapi.json', '/api/public/hardening-matrix'];
try {
  await waitReady();
  const startedAt = Date.now();
  const responses = await Promise.all(Array.from({ length: 8 }, (_, round) => Promise.all(targets.map(async pathname => {
    const res = await fetch(`http://127.0.0.1:${port}${pathname}`);
    const text = await res.text();
    return { round, pathname, status: res.status, ok: res.ok, bytes: text.length };
  }))));
  const hiddenResponses = await Promise.all(hiddenTargets.map(async pathname => {
    const res = await fetch(`http://127.0.0.1:${port}${pathname}`);
    const text = await res.text();
    return { pathname, status: res.status, isolated: res.status === 404, bytes: text.length };
  }));
  const flat = responses.flat();
  const failures = flat.filter(item => !item.ok);
  const hiddenFailures = hiddenResponses.filter(item => !item.isolated);
  const report = { ok: failures.length === 0 && hiddenFailures.length === 0, phase: 'phase357-public-stress-and-private-api-isolation', requests: flat.length, hiddenIsolationChecks: hiddenResponses.length, failures, hiddenFailures, elapsedMs: Date.now() - startedAt };
  console.log(JSON.stringify(report, null, 2));
  if (failures.length || hiddenFailures.length) process.exitCode = 1;
} finally {
  if (child.exitCode === null) {
    await new Promise(resolve => {
      const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} resolve(); }, 1000);
      child.once('exit', () => { clearTimeout(timer); resolve(); });
      try { child.kill('SIGTERM'); } catch { resolve(); }
    });
  }
  await fs.rm(runtimeDir, { recursive: true, force: true });
}

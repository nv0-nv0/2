import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const appPort = 3228;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const runtimeDir = path.join(root, 'runtime-test-diagnose-fallback');
fs.rmSync(runtimeDir, { recursive: true, force: true });

const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(appPort),
    NV0_RUNTIME_DIR: runtimeDir,
    NV0_ADMIN_KEY: 'fallback-key',
    NV0_SCAN_PROVIDER: 'external_http',
    NV0_SCAN_PROVIDER_URL: 'http://127.0.0.1:9/unavailable',
    NV0_SCAN_PROVIDER_FALLBACK: 'false',
    NV0_PUBLIC_DEMO_FORCE_SCAN_FALLBACK: 'true',
    NV0_TARGET_FETCH_TIMEOUT_MS: '500',
    NV0_SCAN_SOFT_TIMEOUT_MS: '2500'
  },
  stdio: 'ignore'
});

async function stopChild() {
  if (!child || child.exitCode !== null) return;
  await new Promise(resolve => {
    const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 800);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
    try { child.kill('SIGTERM'); } catch { resolve(); }
  });
}

async function waitUntilReady() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${appPort}/healthz`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok === true) return;
    } catch {}
    await wait(150);
  }
  throw new Error('server not healthy');
}

async function j(url, options = {}) {
  const res = await fetch(`http://127.0.0.1:${appPort}${url}`, options);
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

try {
  await waitUntilReady();
  const failingProvider = await j('/api/public/diagnose', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ target: 'https://external-provider-outage.example' })
  });
  assert.equal(failingProvider.res.status, 200);
  assert.equal(failingProvider.data.ok, true);
  assert.equal(failingProvider.data.result.provider, 'builtin_fallback');
  assert.match(failingProvider.data.result.resultStatus, /fallback/);
  assert.equal(failingProvider.data.result.upstreamProviderStatus?.fallbackApplied, true);

  const blockedTarget = await j('/api/public/diagnose', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ target: 'http://127.0.0.1/private' })
  });
  assert.equal(blockedTarget.res.status, 200);
  assert.equal(blockedTarget.data.ok, true);
  assert.equal(blockedTarget.data.result.resultStatus, 'completed_limited_blocked_target');
  assert.match(blockedTarget.data.result.resultLimitNotice, /보안상/);

  console.log('diagnose fallback ok');
} finally {
  await stopChild();
  fs.rmSync(runtimeDir, { recursive: true, force: true });
}
process.exit(0);

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const appPort = 3242;
const runtimeDir = path.join(root, 'runtime-test-public-probe-minimal');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
fs.rmSync(runtimeDir, { recursive: true, force: true });

const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(appPort),
    NODE_ENV: 'test',
    NV0_RUNTIME_DIR: runtimeDir,
    NV0_FALLBACK_RUNTIME_DIR: runtimeDir,
    NV0_PLATFORM_TARGET: 'mvp',
    NV0_PAYMENT_PROVIDER: 'demo',
    NV0_TARGET_FETCH_ENABLED: 'false',
    NV0_EXPOSE_INTERNAL_PUBLIC_APIS: 'false'
  },
  stdio: 'ignore'
});

async function stopChild() {
  if (!child || child.exitCode !== null) return;
  await new Promise(resolve => {
    const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 1000);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
    try { child.kill('SIGTERM'); } catch { resolve(); }
  });
}

async function request(pathname) {
  const res = await fetch(`http://127.0.0.1:${appPort}${pathname}`);
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { res, data, text };
}

async function waitUntilReady() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const { res, data } = await request('/healthz');
      if (res.status === 200 && data.ok === true) return;
    } catch {}
    await wait(150);
  }
  throw new Error('server did not become healthy');
}

function assertNoPrivateKeys(name, data, forbiddenKeys) {
  const serialized = JSON.stringify(data);
  for (const key of forbiddenKeys) {
    assert.equal(Object.prototype.hasOwnProperty.call(data, key), false, `${name} must not expose top-level ${key}`);
    assert.doesNotMatch(serialized, new RegExp(`"${key}"\\s*:`), `${name} must not expose nested ${key}`);
  }
}

try {
  await waitUntilReady();
  const healthz = await request('/healthz');
  assert.equal(healthz.res.status, 200);
  assert.equal(healthz.data.ok, true);
  assert.equal(healthz.data.status, 'ok');
  assert.deepEqual(Object.keys(healthz.data.buildFingerprint || {}).sort(), ['version']);
  assertNoPrivateKeys('healthz', healthz.data, [
    'memory', 'runtime', 'integrations', 'readinessAdvisory', 'releasePhase',
    'commitOrRelease', 'missing', 'warnings', 'pid', 'node', 'platform'
  ]);

  const readyzFirst = await request('/readyz');
  assert.equal(readyzFirst.res.status, 200);
  assert.equal(readyzFirst.data.ok, true);
  assert.equal(readyzFirst.data.ready, true);
  assert.equal(readyzFirst.data.status, 'ready');
  assert.equal(readyzFirst.data.cacheHit, false);
  assert.deepEqual(Object.keys(readyzFirst.data.buildFingerprint || {}).sort(), ['version']);
  assertNoPrivateKeys('readyz', readyzFirst.data, [
    'runtimeWritable', 'privacy', 'platformTarget', 'deploymentStage', 'commercialLaunchReady',
    'prelaunchMode', 'persistenceMode', 'storageMode', 'runtimeDir', 'runtimeEphemeral',
    'turnstileEnabled', 'redis', 'paymentProvider', 'secureRecordStore', 'commercialEnv',
    'deploymentRiskGuard', 'systemLayer', 'cachedForMs', 'error', 'missing', 'warnings'
  ]);

  const readyzCached = await request('/readyz');
  assert.equal(readyzCached.res.status, 200);
  assert.equal(readyzCached.data.cacheHit, true);
  assertNoPrivateKeys('readyz-cache', readyzCached.data, ['runtimeDir', 'commercialEnv', 'secureRecordStore', 'error']);

  console.log(JSON.stringify({ ok: true, checked: 3, contract: 'phase354-public-probe-minimal' }, null, 2));
} finally {
  await stopChild();
  fs.rmSync(runtimeDir, { recursive: true, force: true });
}

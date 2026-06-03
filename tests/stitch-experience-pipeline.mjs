import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildStitchExperiencePipelineSnapshot } from '../server/core/stitch-experience-pipeline.mjs';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');
const port = 3244;
const runtimeDir = path.join(root, 'runtime-test-stitch-experience-pipeline');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
fs.rmSync(runtimeDir, { recursive: true, force: true });

const snapshot = buildStitchExperiencePipelineSnapshot();
assert.equal(snapshot.ok, true);
assert.equal(snapshot.metrics.layerCount, 5);
assert.equal(snapshot.metrics.prototypeCount, 10);
assert.equal(snapshot.metrics.mappedPrototypeCount, 10);
assert.ok(snapshot.metrics.surfaceCount >= 24);
assert.ok(snapshot.metrics.functionBindingCount >= 8);
assert.ok(snapshot.metrics.stateRequirementCount >= 10);
assert.equal(snapshot.audit.customerPublicExposure, false);
assert.deepEqual(snapshot.audit.unmappedPrototypeIds, []);

const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    NODE_ENV: 'test',
    NV0_EXPOSE_INTERNAL_PUBLIC_APIS: 'true',
    NV0_RUNTIME_DIR: runtimeDir,
    NV0_PLATFORM_TARGET: 'mvp',
    NV0_PAYMENT_PROVIDER: 'demo',
    NV0_PRELAUNCH_MODE: 'false',
    NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT: 'true',
    NV0_PUBLIC_BASE_URL: `http://127.0.0.1:${port}`,
    NV0_ADMIN_KEY: 'stitch-experience-pipeline-key'
  },
  stdio: 'ignore'
});

async function stop() {
  if (!child || child.exitCode !== null) return;
  await new Promise(resolve => {
    const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 800);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
    try { child.kill('SIGTERM'); } catch { resolve(); }
  });
}
async function ready() {
  for (let i = 0; i < 50; i += 1) {
    try { const res = await fetch(`http://127.0.0.1:${port}/readyz`); if (res.ok) return; } catch {}
    await wait(200);
  }
  throw new Error('server not ready');
}
try {
  await ready();
  const result = await fetch(`http://127.0.0.1:${port}/api/public/stitch-experience-pipeline`);
  assert.equal(result.status, 200);
  const data = await result.json();
  assert.equal(data.ok, true);
  assert.equal(data.pipeline.ready, true);
  assert.equal(data.pipeline.metrics.prototypeCount, 10);
  assert.equal(data.pipeline.metrics.mappedPrototypeCount, 10);
  assert.equal(data.pipeline.audit.customerPublicExposure, false);
  console.log('stitch experience pipeline integration ok');
} finally {
  await stop();
  fs.rmSync(runtimeDir, { recursive: true, force: true });
}

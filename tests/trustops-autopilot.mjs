import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const appPort = 3222;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const testRuntimeDir = path.join(root, 'runtime-test-trustops-autopilot');
fs.rmSync(testRuntimeDir, { recursive: true, force: true });

const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(appPort),
    NODE_ENV: 'test',
    NV0_RUNTIME_DIR: testRuntimeDir,
    NV0_PLATFORM_TARGET: 'mvp',
    NV0_PAYMENT_PROVIDER: 'demo',
    NV0_PRELAUNCH_MODE: 'false',
    NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT: 'true',
    NV0_PUBLIC_SCAN_LIMIT: '200',
    NV0_PUBLIC_BASE_URL: `http://127.0.0.1:${appPort}`,
    NV0_ADMIN_KEY: 'phase318-key'
  },
  stdio: 'ignore'
});


async function stopChild(child) {
  if (!child || child.exitCode !== null) return;
  await new Promise(resolve => {
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch {}
    }, 500);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
    try { child.kill('SIGTERM'); } catch { resolve(); }
  });
}

async function waitUntilReady() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${appPort}/readyz`);
      if (res.ok) return;
    } catch {}
    await wait(200);
  }
  throw new Error('server not ready');
}

async function j(url, options = {}) {
  const res = await fetch(`http://127.0.0.1:${appPort}${url}`, options);
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { res, data, text };
}

try {
  await waitUntilReady();

  const scan = await j('/api/public/diagnose', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ target: 'https://phase318-autopilot.example' })
  });
  assert.equal(scan.res.status, 200);

  const autopilot = await j('/api/public/trustops-autopilot');
  assert.equal(autopilot.res.status, 200);
  assert.equal(autopilot.data.cockpit.version, 'phase318-trustops-autopilot-cockpit-v1');
  assert.ok(autopilot.data.cockpit.backlogCount >= 130);
  assert.ok(autopilot.data.cockpit.nextBestOffer.code);
  assert.ok(Array.isArray(autopilot.data.cockpit.workQueue));

  const lifecycle = await j('/api/public/customer-lifecycle', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ siteUrl: 'https://phase318-autopilot.example', riskScore: 78, currentPlan: 'Free', industry: 'shopping' })
  });
  assert.equal(lifecycle.res.status, 200);
  assert.equal(lifecycle.data.lifecycle.stages.length, 6);
  assert.equal(lifecycle.data.lifecycle.nextBestOffer.code, 'FixPack');

  const queue = await j('/api/public/automation-workqueue');
  assert.equal(queue.res.status, 200);
  assert.ok(Array.isArray(queue.data.queue));
  assert.ok(queue.data.queue.every(item => !('target' in item)), 'public queue must not expose raw customer target');

  const status = await j('/api/public/engine-agent-status');
  assert.equal(status.res.status, 200);
  assert.ok(status.data.engineCount >= 34);
  assert.ok(status.data.agentCount >= 76);
  assert.ok(status.data.eventPolicyCount >= 14);

  console.log('phase318 trustops autopilot integration ok');
} finally {
  await stopChild(child);
}

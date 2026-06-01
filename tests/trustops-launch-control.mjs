import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const appPort = 3223;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const testRuntimeDir = path.join(root, 'runtime-test-trustops-launch-control');
fs.rmSync(testRuntimeDir, { recursive: true, force: true });

const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(appPort),
    NODE_ENV: 'test',
    NV0_EXPOSE_INTERNAL_PUBLIC_APIS: 'true',
    NV0_RUNTIME_DIR: testRuntimeDir,
    NV0_PLATFORM_TARGET: 'mvp',
    NV0_PAYMENT_PROVIDER: 'demo',
    NV0_PRELAUNCH_MODE: 'false',
    NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT: 'true',
    NV0_PUBLIC_SCAN_LIMIT: '200',
    NV0_PUBLIC_BASE_URL: `http://127.0.0.1:${appPort}`,
    NV0_PRIVACY_OFFICER_EMAIL: 'privacy@example.com',
    NV0_SECURE_RECORDS_KEY: 'phase319-secure-records-key',
    NV0_PRIVACY_HASH_KEY: 'phase319-privacy-hash-key',
    NV0_ADMIN_KEY: 'phase319-key'
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
    body: JSON.stringify({ target: 'https://phase319-launch.example' })
  });
  assert.equal(scan.res.status, 200);

  const launch = await j('/api/public/trustops-launch-control');
  assert.equal(launch.res.status, 200, launch.text);
  assert.equal(launch.data.launch.version, 'phase319-trustops-launch-control-v1');
  assert.ok(launch.data.launch.backlogCount >= 170);
  assert.equal(launch.data.launch.phase319BacklogCount, 40);
  assert.ok(launch.data.launch.launchSequence.length >= 5);
  assert.ok(launch.data.launch.incidentPlaybooks.length >= 5);
  assert.ok(launch.data.launch.experiments.length >= 8);

  const message = await j('/api/public/lifecycle-message-sequence', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ stage: 'renewal_guard', currentPlan: 'Monitoring', riskScore: 61 })
  });
  assert.equal(message.res.status, 200, message.text);
  assert.equal(message.data.sequence.stage, 'renewal_guard');
  assert.ok(message.data.sequence.message.subject.includes('만료'));
  assert.ok(message.data.sequence.suppressionRules.length >= 3);

  const status = await j('/api/public/engine-agent-status');
  assert.equal(status.res.status, 200);
  assert.ok(status.data.engineCount >= 38);
  assert.ok(status.data.agentCount >= 84);
  assert.ok(status.data.eventPolicyCount >= 16);

  console.log('phase319 trustops launch control integration ok');
} finally {
  await stopChild(child);
}

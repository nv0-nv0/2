import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const appPort = 3224;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const testRuntimeDir = path.join(root, 'runtime-test-trustops-production-sentinel');
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
    NV0_SECURE_RECORDS_KEY: 'phase320-secure-records-key',
    NV0_PRIVACY_HASH_KEY: 'phase320-privacy-hash-key',
    NV0_ADMIN_KEY: 'phase320-key'
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
    body: JSON.stringify({ target: 'https://phase320-sentinel.example' })
  });
  assert.equal(scan.res.status, 200, scan.text);

  const sentinel = await j('/api/public/trustops-production-sentinel');
  assert.equal(sentinel.res.status, 200, sentinel.text);
  assert.equal(sentinel.data.sentinel.version, 'phase320-trustops-production-sentinel-v1');
  assert.ok(sentinel.data.sentinel.backlogCount >= 220);
  assert.equal(sentinel.data.sentinel.phase320BacklogCount, 50);
  assert.ok(sentinel.data.sentinel.liveVerification.checks.length >= 13);
  assert.ok(sentinel.data.sentinel.canaryStages.length >= 5);
  assert.ok(sentinel.data.sentinel.rollbackMatrix.length >= 7);
  assert.ok(sentinel.data.sentinel.slaMatrix.length >= 3);

  const checklist = await j('/api/public/live-verification-checklist?baseUrl=https://nv0.kr');
  assert.equal(checklist.res.status, 200, checklist.text);
  assert.ok(checklist.data.checklist.checks.every(item => String(item.url).startsWith('https://nv0.kr')));

  const status = await j('/api/public/engine-agent-status');
  assert.equal(status.res.status, 200);
  assert.ok(status.data.engineCount >= 42);
  assert.ok(status.data.agentCount >= 92);
  assert.ok(status.data.eventPolicyCount >= 17);
  assert.ok(status.data.publicSummary.appliedRoutes.includes('/api/public/trustops-production-sentinel'));

  console.log('phase320 trustops production sentinel integration ok');
} finally {
  await stopChild(child);
  fs.rmSync(testRuntimeDir, { recursive: true, force: true });
}

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const appPort = 3225;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const testRuntimeDir = path.join(root, 'runtime-test-trustops-final-handoff');
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
    NV0_SECURE_RECORDS_KEY: 'phase321-secure-records-key',
    NV0_PRIVACY_HASH_KEY: 'phase321-privacy-hash-key',
    NV0_BUSINESS_TRADE_NAME: 'VERIDION TEST',
    NV0_BUSINESS_REPRESENTATIVE: '대표자',
    NV0_BUSINESS_REGISTRATION_NUMBER: '123-45-67890',
    NV0_BUSINESS_ADDRESS: '서울특별시 테스트로 1',
    NV0_HOSTING_PROVIDER: 'Test Hosting',
    NV0_CUSTOMER_SERVICE_PHONE: '02-0000-0000',
    NV0_ADMIN_KEY: 'phase321-key'
  },
  stdio: 'ignore'
});

async function stopChild(proc) {
  if (!proc || proc.exitCode !== null) return;
  await new Promise(resolve => {
    const timer = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch {}
    }, 500);
    proc.once('exit', () => { clearTimeout(timer); resolve(); });
    try { proc.kill('SIGTERM'); } catch { resolve(); }
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
    body: JSON.stringify({ target: 'https://phase321-final.example' })
  });
  assert.equal(scan.res.status, 200, scan.text);

  const handoff = await j('/api/public/trustops-final-handoff');
  assert.equal(handoff.res.status, 200, handoff.text);
  assert.equal(handoff.data.handoff.version, 'phase321-trustops-final-handoff-v1');
  assert.ok(handoff.data.handoff.acceptanceChecklist.length >= 15);
  assert.ok(handoff.data.handoff.operatorRunbook.length >= 12);
  assert.ok(handoff.data.handoff.safeModeMatrix.length >= 5);
  assert.ok(handoff.data.handoff.goLiveKpi.length >= 6);
  assert.ok(handoff.data.handoff.summary.backlogCount >= 280);
  assert.equal(handoff.data.handoff.summary.phase321BacklogCount, 60);

  const status = await j('/api/public/engine-agent-status');
  assert.equal(status.res.status, 200, status.text);
  assert.ok(status.data.engineCount >= 46);
  assert.ok(status.data.agentCount >= 100);
  assert.ok(status.data.eventPolicyCount >= 18);
  assert.ok(status.data.publicSummary.appliedRoutes.includes('/api/public/trustops-final-handoff'));

  console.log('phase321 trustops final handoff integration ok');
} finally {
  await stopChild(child);
  fs.rmSync(testRuntimeDir, { recursive: true, force: true });
}

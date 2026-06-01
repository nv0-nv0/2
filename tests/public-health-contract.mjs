import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const appPort = 3231;
const runtimeDir = path.join(root, 'runtime-test-public-health-contract');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
fs.rmSync(runtimeDir, { recursive: true, force: true });

const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(appPort),
    NV0_RUNTIME_DIR: runtimeDir,
    NV0_ADMIN_KEY: 'public-health-contract-key',
    NV0_SCAN_PROVIDER: 'builtin',
    NV0_TARGET_FETCH_ENABLED: 'false',
    NV0_PUBLIC_SCAN_LIMIT: '50'
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

async function request(pathname, options = {}) {
  const res = await fetch(`http://127.0.0.1:${appPort}${pathname}`, options);
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { res, data, text };
}

async function waitUntilHealthy() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const { res, data } = await request('/healthz');
      if (res.status === 200 && data.ok === true) return;
    } catch {}
    await wait(150);
  }
  throw new Error('server health contract did not become ready');
}

try {
  await waitUntilHealthy();

  const healthz = await request('/healthz');
  assert.equal(healthz.res.status, 200, '/healthz must return HTTP 200 only when JSON ok is true');
  assert.equal(healthz.data.ok, true, '/healthz JSON body must expose ok:true for Docker/Coolify healthcheck');

  const publicHealth = await request('/api/public/health');
  assert.equal(publicHealth.res.status, 200);
  assert.equal(publicHealth.data.ok, true);
  assert.equal(publicHealth.res.headers.get('cache-control'), 'no-store');

  const config = await request('/api/public/config');
  assert.equal(config.res.status, 200);
  assert.equal(config.data.ok, true);

  const malformed = await request('/api/public/diagnose', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ target: 'not a url' })
  });
  assert.equal(malformed.res.status, 400, 'malformed target must be a user input error, not a server error');
  assert.equal(malformed.data.ok, false);
  assert.match(String(malformed.data.error || ''), /주소|URL|사이트|필요|target|형식/);

  console.log('public health contract ok');
} finally {
  await stopChild();
  fs.rmSync(runtimeDir, { recursive: true, force: true });
}

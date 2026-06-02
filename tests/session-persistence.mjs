import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const port = 3212;
const runtimeDir = path.join(root, 'runtime-test-session-persistence');
await fs.rm(runtimeDir, { recursive: true, force: true });
const env = {
  ...process.env,
  PORT: String(port),
  NV0_ADMIN_KEY: 'persist-key',
  NV0_TRUST_PROXY_HEADERS: 'true',
  NV0_RUNTIME_DIR: runtimeDir,
  NV0_FALLBACK_RUNTIME_DIR: runtimeDir
};

const wait = ms => new Promise(r => setTimeout(r, ms));

function startServer() {
  return spawn(process.execPath, ['server/index.mjs'], { cwd: root, env, stdio: 'ignore' });
}

async function waitUntilReady() {
  for (let i = 0; i < 30; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/readyz`);
      if (res.ok) return;
    } catch {}
    await wait(200);
  }
  throw new Error('server not ready');
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  await new Promise(resolve => {
    const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} resolve(); }, 1000);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
    try { child.kill('SIGTERM'); } catch { resolve(); }
  });
}

async function json(url, options={}) {
  const res = await fetch(`http://127.0.0.1:${port}${url}`, options);
  const data = await res.json();
  return { res, data };
}

const sessionsFile = path.join(runtimeDir, 'data', 'sessions.json');
let child = startServer();
await waitUntilReady();
try {
  let x = await json('/api/admin/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: 'persist-key' }) });
  assert.equal(x.res.status, 200);
  const cookie = x.res.headers.get('set-cookie');
  assert.ok(cookie.includes('nv0_admin_sid='));
  const rowsBefore = JSON.parse(await fs.readFile(sessionsFile, 'utf8'));
  assert.ok(Array.isArray(rowsBefore));
  assert.ok(rowsBefore.length >= 1);

  await stopServer(child);
  child = startServer();
  await waitUntilReady();

  const page = await fetch(`http://127.0.0.1:${port}/admin/console`, { headers: { cookie } });
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.ok(html.includes('관리자 대시보드'));

  const rowsAfter = JSON.parse(await fs.readFile(sessionsFile, 'utf8'));
  assert.ok(Array.isArray(rowsAfter));
  assert.ok(rowsAfter.length >= 1);
  console.log('session persistence ok');
} finally {
  await stopServer(child);
  await fs.rm(runtimeDir, { recursive: true, force: true });
}

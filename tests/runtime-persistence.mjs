import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const port = 3213;
const runtimeDir = path.join(root, 'runtime-test-runtime-persistence');
await fs.rm(runtimeDir, { recursive: true, force: true });
const env = {
  ...process.env,
  PORT: String(port),
  NV0_ADMIN_KEY: 'persist-key',
  NV0_TRUST_PROXY_HEADERS: 'true',
  NV0_AUDIT_LOG_RETENTION_COUNT: '5',
  NV0_RUNTIME_DIR: runtimeDir,
  NV0_FALLBACK_RUNTIME_DIR: runtimeDir
};

const wait = ms => new Promise(r => setTimeout(r, ms));
function startServer() {
  return spawn(process.execPath, ['server/index.mjs'], { cwd: root, env, stdio: 'ignore' });
}
async function waitUntilReady() {
  for (let i = 0; i < 40; i += 1) {
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
async function j(url, options={}) {
  const res = await fetch(`http://127.0.0.1:${port}${url}`, options);
  const text = await res.text();
  let data = null; try { data = JSON.parse(text); } catch {}
  return { res, data, text };
}

let child = startServer();
await waitUntilReady();
try {
  let x = await j('/api/admin/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: 'persist-key' }) });
  const cookie = x.res.headers.get('set-cookie');
  const csrf = x.data.csrfToken;
  assert.ok(cookie && csrf);

  const beforeLibrary = await j('/api/admin/library', { headers: { cookie } });
  const beforeCount = beforeLibrary.data.library.length;

  const backup = await j('/api/admin/backups/run', { method: 'POST', headers: { cookie, 'x-nv0-csrf': csrf } });
  assert.equal(backup.data.ok, true);
  const backupName = path.basename(backup.data.backup.dbTarget);

  const fd = new FormData();
  fd.append('title', 'persist upload');
  fd.append('file', new Blob(['hello runtime persistence'], { type: 'text/plain' }), 'persist.txt');
  let uploadRes = await fetch(`http://127.0.0.1:${port}/api/admin/library/upload`, { method: 'POST', headers: { cookie, 'x-nv0-csrf': csrf }, body: fd });
  let uploadData = await uploadRes.json();
  assert.equal(uploadData.ok, true);
  const uploadPath = `/runtime/uploads/${uploadData.item.filename}`;

  let fileRes = await fetch(`http://127.0.0.1:${port}${uploadPath}`, { headers: { cookie } });
  assert.equal(fileRes.status, 200);
  assert.equal(await fileRes.text(), 'hello runtime persistence');

  await stopServer(child);
  child = startServer();
  await waitUntilReady();

  fileRes = await fetch(`http://127.0.0.1:${port}${uploadPath}`, { headers: { cookie } });
  assert.equal(fileRes.status, 200);
  assert.equal(await fileRes.text(), 'hello runtime persistence');

  x = await j('/api/admin/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: 'persist-key' }) });
  const cookie2 = x.res.headers.get('set-cookie');
  const csrf2 = x.data.csrfToken;

  const createLib = await j('/api/admin/library/post', { method: 'POST', headers: { 'content-type': 'application/json', cookie: cookie2, 'x-nv0-csrf': csrf2 }, body: JSON.stringify({ title: 'restore target', body: 'should disappear' }) });
  assert.equal(createLib.data.ok, true);

  const midLibrary = await j('/api/admin/library', { headers: { cookie: cookie2 } });
  assert.equal(midLibrary.data.library.length, beforeCount + 2);

  const restored = await j('/api/admin/backups/restore', { method: 'POST', headers: { 'content-type': 'application/json', cookie: cookie2, 'x-nv0-csrf': csrf2 }, body: JSON.stringify({ name: backupName }) });
  assert.equal(restored.data.ok, true);

  const afterRestore = JSON.parse(await fs.readFile(path.join(runtimeDir, 'data', 'db.json'), 'utf8'));
  assert.equal(afterRestore.library.length, beforeCount);

  for (let i = 0; i < 12; i += 1) {
    await j('/api/admin/status', { headers: { cookie: cookie2 } });
  }
  const audit = await j('/api/admin/audit-logs', { headers: { cookie: cookie2 } });
  assert.ok(audit.data.auditLogs.length <= 5);

  console.log('runtime persistence / recovery / retention ok');
} finally {
  await stopServer(child);
  await fs.rm(runtimeDir, { recursive: true, force: true });
}

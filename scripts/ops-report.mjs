import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const port = Number(process.env.NV0_OPS_REPORT_PORT || 3223);
const adminKey = process.env.NV0_ADMIN_KEY || 'ops-report-key';
const env = { ...process.env, PORT: String(port), NV0_ADMIN_KEY: adminKey, NV0_TRUST_PROXY_HEADERS: process.env.NV0_TRUST_PROXY_HEADERS || 'true' };
const child = spawn(process.execPath, ['server/index.mjs'], { cwd: ROOT, env, stdio: 'inherit' });
const wait = ms => new Promise(r => setTimeout(r, ms));

async function waitReady() {
  for (let i = 0; i < 30; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/readyz`);
      if (res.ok) return;
    } catch {}
    await wait(200);
  }
  throw new Error('server not ready');
}

try {
  await waitReady();
  const auth = await fetch(`http://127.0.0.1:${port}/api/admin/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key: adminKey })
  });
  const authData = await auth.json();
  const cookie = auth.headers.get('set-cookie');
  const report = await fetch(`http://127.0.0.1:${port}/api/admin/ops-report`, { headers: { cookie } });
  const reportData = await report.json();
  const summary = { auth: authData.ok, report: reportData };
  console.log(JSON.stringify(summary, null, 2));
  if (!authData.ok || !report.ok || !reportData?.ok) {
    process.exitCode = 1;
  }
} finally {
  child.kill('SIGTERM');
}

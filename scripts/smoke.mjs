import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const base = process.env.NV0_BASE_URL || 'http://127.0.0.1:3210';
const localBase = /^http:\/\/127\.0\.0\.1:(\d+)$/.exec(base);
let child = null;

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function canReach(url) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    return res.ok || res.status > 0;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await canReach(`${base}/healthz`)) return;
  if (!localBase) {
    throw new Error(`Server is not reachable at ${base}`);
  }
  const port = localBase[1];
  child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      NV0_ADMIN_KEY: process.env.NV0_ADMIN_KEY || 'smoke-key',
      NV0_TRUST_PROXY_HEADERS: process.env.NV0_TRUST_PROXY_HEADERS || 'true'
    },
    stdio: 'inherit'
  });
  for (let i = 0; i < 20; i += 1) {
    await wait(200);
    if (await canReach(`${base}/healthz`)) return;
  }
  throw new Error(`Failed to start local smoke server on ${base}`);
}

async function check(urlPath, expectedStatus = 200, mustInclude = '') {
  const res = await fetch(`${base}${urlPath}`, { redirect: 'manual' });
  const text = await res.text();
  if (res.status !== expectedStatus) {
    throw new Error(`${urlPath} expected ${expectedStatus}, got ${res.status}`);
  }
  if (mustInclude && !text.includes(mustInclude)) {
    throw new Error(`${urlPath} missing expected text: ${mustInclude}`);
  }
}

try {
  await ensureServer();
  await check('/healthz', 200, '"ok": true');
  await check('/readyz', 200, '"ready": true');
  await check('/', 200, 'NV0 / Veridion');
  await check('/demo', 200, '일반 데모');
  await check('/products/veridion/demo', 200, 'Veridion 전용 데모');
  await check('/admin', 200, '관리자 키 게이트');
  const adminRedirect = await fetch(`${base}/admin/console`, { redirect: 'manual' });
  if (adminRedirect.status !== 302 || adminRedirect.headers.get('location') !== '/admin') {
    throw new Error('/admin/console should redirect to /admin when unauthenticated');
  }
  console.log('smoke ok');
} finally {
  if (child) {
    child.kill('SIGTERM');
  }
}

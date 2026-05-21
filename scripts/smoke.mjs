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
    stdio: 'ignore'
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

let failed = null;
try {
  await ensureServer();
  await check('/healthz', 200, '"ok": true');
  await check('/readyz', 200, '"ready": true');
  await check('/', 200, '고객이 안심하고 결제할 수 있는 사이트인지 확인하세요');
  await check('/demo', 200, '리스크 진단 결과');
  await check('/products/veridion/demo', 200, '사이트 주소만 입력하면 핵심 안내 공백을 바로 확인할 수 있습니다');
  await check('/admin', 200, '관리자');
  await check('/api/public/auth/session', 200, '"authenticated": false');
  await check('/api/public/system-items', 200, '"ok": true');
  const adminRedirect = await fetch(`${base}/admin/console`, { redirect: 'manual' });
  if (adminRedirect.status !== 302 || adminRedirect.headers.get('location') !== '/admin') {
    throw new Error('/admin/console should redirect to /admin when unauthenticated');
  }
  console.log('smoke ok');
} catch (error) {
  failed = error;
} finally {
  if (child) {
    child.removeAllListeners();
    try { child.kill('SIGKILL'); } catch {}
    try { child.unref(); } catch {}
  }
}

if (failed) {
  console.error(failed);
  process.exit(1);
}
process.exit(0);

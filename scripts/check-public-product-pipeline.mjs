import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const baseUrl = (process.env.NV0_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:3210').replace(/\/$/, '');
const localBase = /^http:\/\/127\.0\.0\.1:(\d+)$/.exec(baseUrl);
const routes = ['/', '/service', '/solutions', '/plans', '/products/veridion/demo', '/portal', '/board', '/business-info', '/terms', '/privacy', '/refund'];
const bannedPublicCopy = /위험 진단|요금 안내|내 사이트 관리|20분에 1회|자동 발행|TrustOps|프로덕션 센티널|런칭 컨트롤|운영 큐|자동화 백로그|rollback|canary|prelaunch|phase319|phase320|phase321|API 키 관리|보안 점수88|성능 점수76|SEO 점수90|접근성 점수75|법률 리스크|규제 리스크|과태료 리스크|NV0는/i;
let child = null;
const checks = [];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
function check(name, fn) { try { fn(); checks.push({ name, ok: true }); } catch (error) { checks.push({ name, ok: false, error: error.message }); } }
async function canReach(url) { try { const res = await fetch(url, { redirect: 'manual' }); return res.status > 0; } catch { return false; } }
async function ensureServer() {
  if (await canReach(`${baseUrl}/healthz`)) return;
  if (!localBase) throw new Error(`Server is not reachable at ${baseUrl}`);
  child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: localBase[1], NODE_ENV: 'test', NV0_PLATFORM_TARGET: 'mvp', NV0_PAYMENT_PROVIDER: 'demo', NV0_ADMIN_KEY: process.env.NV0_ADMIN_KEY || 'pipeline-check-key' },
    stdio: 'ignore'
  });
  for (let i = 0; i < 40; i += 1) { await wait(200); if (await canReach(`${baseUrl}/healthz`)) return; }
  throw new Error(`Failed to start local pipeline server at ${baseUrl}`);
}
async function stopServer() {
  if (!child || child.exitCode !== null) return;
  await new Promise(resolve => { const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} resolve(); }, 800); child.once('exit', () => { clearTimeout(timer); resolve(); }); try { child.kill('SIGTERM'); } catch { clearTimeout(timer); resolve(); } });
}
try {
  await ensureServer();
  for (const route of routes) {
    const res = await fetch(`${baseUrl}${route}`);
    const html = await res.text();
    check(`${route}:status`, () => assert.equal(res.status, 200));
    check(`${route}:title`, () => assert.match(html, /<title>[^<]+<\/title>/));
    check(`${route}:description`, () => assert.match(html, /<meta name="description"/));
    check(`${route}:canonical`, () => assert.match(html, /rel="canonical"/));
    check(`${route}:og`, () => assert.match(html, /property="og:title"/));
    check(`${route}:twitter`, () => assert.match(html, /name="twitter:card"/));
    check(`${route}:single-h1`, () => assert.equal((html.match(/<h1\b/g) || []).length, 1));
    check(`${route}:no-old-public-copy`, () => assert.doesNotMatch(html, bannedPublicCopy));
    if (route !== '/portal') check(`${route}:json-ld`, () => assert.match(html, /application\/ld\+json/));
  }
} finally {
  await stopServer();
}
const failed = checks.filter(item => !item.ok);
const report = { ok: failed.length === 0, baseUrl, checked: checks.length, failed: failed.length, failedChecks: failed };
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);

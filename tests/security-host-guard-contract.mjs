import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportDir = path.join(root, 'docs/current');
const reportPath = path.join(reportDir, 'SECURITY_HOST_GUARD_CONTRACT.json');
const port = 39000 + Math.floor(Math.random() * 1200);
const runtimeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'veridion-host-guard-'));
const env = {
  ...process.env,
  HOST: '127.0.0.1',
  PORT: String(port),
  NV0_RUNTIME_DIR: runtimeDir,
  NV0_RUN_PREFLIGHT: 'false',
  NV0_RUNTIME_VERBOSE: 'false',
  NV0_ALLOWED_HOSTS: 'localhost,127.0.0.1',
  NV0_ALLOWED_ADMIN_ORIGINS: 'localhost,127.0.0.1',
  NV0_PUBLIC_BASE_URL: `http://127.0.0.1:${port}`
};
const child = spawn(process.execPath, ['scripts/start-local-server.mjs'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
child.stdout.on('data', chunk => { output += chunk.toString(); });
child.stderr.on('data', chunk => { output += chunk.toString(); });
function request(pathname, host = `127.0.0.1:${port}`, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, method, path: pathname, headers: { host, 'user-agent': 'veridion-host-guard-contract/1.0' } }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.setTimeout(2500, () => req.destroy(new Error(`request timeout: ${pathname}`)));
    req.on('error', reject);
    req.end();
  });
}
async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await request('/healthz');
      if (response.status === 200) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`local server did not start\n${output.slice(-4000)}`);
}
const checks = [];
function add(name, pass, detail) { checks.push({ name, pass: Boolean(pass), detail }); }
try {
  await waitForServer();
  const home = await request('/');
  const evilHome = await request('/', 'evil.example');
  const health = await request('/healthz');
  const evilHealth = await request('/healthz', 'evil.example');
  const trailing = await request('/plans/');
  const internalPipeline = await request('/api/public/stitch-experience-pipeline');
  const adminConsole = await request('/admin/console');
  const adminAsset = await request('/apps/admin/console/app.js?v=2.7.0');
  const traversal = await request('/apps/public/%2e%2e/%2e%2e/server/index.mjs');
  const trace = await request('/', `127.0.0.1:${port}`, 'TRACE');
  const options = await request('/', `127.0.0.1:${port}`, 'OPTIONS');
  const head = await request('/', `127.0.0.1:${port}`, 'HEAD');
  const tooLong = await request('/' + 'a'.repeat(4200));
  const symlink = path.join(root, 'shared', '.max-hardening-symlink-test');
  let symlinkResponse = { status: 0 };
  try {
    fs.symlinkSync(path.join(root, 'server', 'index.mjs'), symlink);
    symlinkResponse = await request('/shared/.max-hardening-symlink-test');
  } finally {
    fs.rmSync(symlink, { force: true });
  }

  add('home-allowed-host-returns-html', home.status === 200 && /text\/html/i.test(String(home.headers['content-type'] || '')) && /data-design-system="executive-trust-framework"/.test(home.body), { status: home.status, contentType: home.headers['content-type'] });
  add('normal-page-rejects-untrusted-host', evilHome.status === 421, { status: evilHome.status });
  add('healthcheck-remains-load-balancer-compatible', health.status === 200 && evilHealth.status === 200, { health: health.status, untrustedHostHealth: evilHealth.status });
  add('security-headers-present', home.headers['x-content-type-options'] === 'nosniff' && home.headers['x-frame-options'] === 'DENY' && home.headers['referrer-policy'] === 'strict-origin-when-cross-origin' && /default-src 'self'/.test(String(home.headers['content-security-policy'] || '')), { headers: home.headers });
  add('trailing-slash-canonical-redirect', trailing.status === 308 && trailing.headers.location === '/plans', { status: trailing.status, location: trailing.headers.location });
  add('internal-stitch-api-isolated', internalPipeline.status === 404, { status: internalPipeline.status });
  add('admin-console-redirects-to-gate-without-session', adminConsole.status === 302 && adminConsole.headers.location === '/admin', { status: adminConsole.status, location: adminConsole.headers.location });
  add('admin-static-asset-blocked-without-session', adminAsset.status === 403, { status: adminAsset.status });
  add('encoded-static-traversal-not-served', traversal.status === 404 || traversal.status === 403, { status: traversal.status });
  add('trace-method-rejected-globally', trace.status === 405 && /GET, HEAD, POST, OPTIONS/.test(String(trace.headers.allow || '')), { status: trace.status, allow: trace.headers.allow });
  add('options-preflight-is-no-store', options.status === 204 && options.headers['cache-control'] === 'no-store', { status: options.status, cacheControl: options.headers['cache-control'] });
  add('head-request-sends-no-body-with-length', head.status === 200 && head.body === '' && Number(head.headers['content-length'] || 0) > 0, { status: head.status, contentLength: head.headers['content-length'], bodyLength: head.body.length });
  add('oversized-request-target-rejected', tooLong.status === 414, { status: tooLong.status });
  add('static-symlink-escape-rejected', symlinkResponse.status === 403, { status: symlinkResponse.status });
} finally {
  child.kill('SIGTERM');
  await new Promise(resolve => setTimeout(resolve, 150));
  if (!child.killed) child.kill('SIGKILL');
  fs.rmSync(runtimeDir, { recursive: true, force: true });
}
const failed = checks.filter(item => !item.pass);
const report = { ok: failed.length === 0, contract: 'security-host-guard-contract-v1', checkedAt: new Date().toISOString(), port, checked: checks.length, failed: failed.length, checks, serverLogTail: output.slice(-4000) };
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ok: report.ok, contract: report.contract, checked: report.checked, failed: report.failed, report: path.relative(root, reportPath).replaceAll('\\', '/') }, null, 2));
assert.equal(failed.length, 0, JSON.stringify(failed, null, 2));

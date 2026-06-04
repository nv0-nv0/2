import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ASSET_VERSION } from '../shared/release-version.mjs';
import { ADMIN_PAGE_ROUTES, CANONICAL_PAGE_ALIASES, PUBLIC_PAGE_ROUTES } from '../server/config/page-registry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportDir = path.join(root, 'docs/current');
const reportPath = path.join(reportDir, 'LOCAL_PRODUCTION_CRAWL_AUDIT.json');
const port = 40400 + Math.floor(Math.random() * 900);
const runtimeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'veridion-production-crawl-'));
const host = `127.0.0.1:${port}`;
const env = {
  ...process.env,
  HOST: '127.0.0.1',
  PORT: String(port),
  NV0_RUNTIME_DIR: runtimeDir,
  NV0_RUN_PREFLIGHT: 'false',
  NV0_RUNTIME_VERBOSE: 'false',
  NV0_ALLOWED_HOSTS: 'localhost,127.0.0.1',
  NV0_ALLOWED_ADMIN_ORIGINS: 'localhost,127.0.0.1',
  NV0_PUBLIC_BASE_URL: `http://${host}`,
  NV0_PLATFORM_TARGET: 'mvp',
  NV0_DEPLOYMENT_STAGE: 'test',
  NODE_ENV: 'production',
  NV0_PUBLIC_CACHE_SECONDS: '60',
  NV0_PUBLIC_ASSET_CACHE_SECONDS: '31536000'
};
const child = spawn(process.execPath, ['scripts/start-local-server.mjs'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
child.stdout.on('data', chunk => { output += chunk.toString(); });
child.stderr.on('data', chunk => { output += chunk.toString(); });

function request(pathname, extraHeaders = {}, method = 'GET') {
  const startedAt = performance.now();
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, method, path: pathname, headers: { host, 'user-agent': 'veridion-local-production-crawl/1.0', ...extraHeaders } }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => { const buffer = Buffer.concat(chunks); resolve({ path: pathname, status: res.statusCode, headers: res.headers, body: buffer.toString('utf8'), bodyBytes: buffer.byteLength, elapsedMs: Number((performance.now() - startedAt).toFixed(3)) }); });
    });
    req.setTimeout(3500, () => req.destroy(new Error(`request timeout: ${pathname}`)));
    req.on('error', reject);
    req.end();
  });
}
async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await request('/healthz');
      if (response.status === 200) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`local production crawl server did not start\n${output.slice(-4000)}`);
}
function ids(body = '') { return [...body.matchAll(/\sid=["']([^"']+)["']/gi)].map(match => match[1]); }
function duplicateValues(values = []) { const seen = new Set(); const duplicates = new Set(); for (const value of values) seen.has(value) ? duplicates.add(value) : seen.add(value); return [...duplicates].sort(); }
function percentile(values, ratio) { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))] || 0; }
async function stopChild() {
  if (!child || child.exitCode !== null) return;
  await new Promise(resolve => {
    let settled = false;
    const finish = () => { if (settled) return; settled = true; clearTimeout(forceTimer); clearTimeout(abandonTimer); resolve(); };
    const forceTimer = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 800);
    const abandonTimer = setTimeout(finish, 1_600);
    child.once('exit', finish);
    try { child.kill('SIGTERM'); } catch { finish(); }
  });
}
const checks = [];
function add(name, pass, detail = {}) { checks.push({ name, pass: Boolean(pass), detail }); }
try {
  await waitForServer();
  const canonicalPublicRoutes = Object.keys(PUBLIC_PAGE_ROUTES).filter(route => !Object.hasOwn(CANONICAL_PAGE_ALIASES, route));
  const canonicalPages = [];
  for (const route of canonicalPublicRoutes) canonicalPages.push(await request(route));
  const badCanonicalPages = canonicalPages.filter(page => page.status !== 200 || !/text\/html/i.test(String(page.headers['content-type'] || '')));
  add('all-canonical-public-pages-return-html-200', badCanonicalPages.length === 0, { checked: canonicalPages.length, failures: badCanonicalPages.map(page => ({ path: page.path, status: page.status, contentType: page.headers['content-type'] })) });

  const duplicateIdPages = canonicalPages.map(page => ({ path: page.path, duplicates: duplicateValues(ids(page.body)) })).filter(page => page.duplicates.length);
  add('canonical-public-pages-have-no-duplicate-html-ids', duplicateIdPages.length === 0, { checked: canonicalPages.length, failures: duplicateIdPages });

  const aliases = [];
  for (const [route, expected] of Object.entries(CANONICAL_PAGE_ALIASES)) aliases.push({ expected, ...(await request(route)) });
  const badAliases = aliases.filter(item => item.status !== 301 || item.headers.location !== item.expected);
  add('legacy-and-alternate-page-aliases-canonicalize-with-301', badAliases.length === 0, { checked: aliases.length, failures: badAliases.map(item => ({ path: item.path, expected: item.expected, status: item.status, location: item.headers.location })) });

  const adminGate = await request('/admin');
  add('admin-gate-remains-public-entry-only', adminGate.status === 200 && /text\/html/i.test(String(adminGate.headers['content-type'] || '')), { status: adminGate.status, contentType: adminGate.headers['content-type'] });
  const protectedAdminRoutes = Object.keys(ADMIN_PAGE_ROUTES).filter(route => route !== '/admin');
  const adminPages = [];
  for (const route of protectedAdminRoutes) adminPages.push(await request(route));
  const exposedAdminRoutes = adminPages.filter(page => page.status !== 302 || page.headers.location !== '/admin');
  add('protected-admin-pages-redirect-to-gate-without-session', exposedAdminRoutes.length === 0, { checked: adminPages.length, failures: exposedAdminRoutes.map(page => ({ path: page.path, status: page.status, location: page.headers.location })) });

  const home = await request('/');
  const repeatSamples = [];
  for (let i = 0; i < 30; i += 1) repeatSamples.push(await request('/'));
  const hitCount = repeatSamples.filter(sample => sample.headers['x-vr-page-cache'] === 'hit').length;
  const timings = repeatSamples.map(sample => sample.elapsedMs);
  add('production-render-cache-serves-repeat-home-requests', hitCount === repeatSamples.length, { checked: repeatSamples.length, hitCount, p50Ms: percentile(timings, 0.5), p95Ms: percentile(timings, 0.95), maxMs: Math.max(...timings) });
  add('local-repeat-home-p95-remains-under-250ms', percentile(timings, 0.95) < 250, { p50Ms: percentile(timings, 0.5), p95Ms: percentile(timings, 0.95), maxMs: Math.max(...timings), note: 'Local process indicator only; production edge and network latency require staging measurement.' });

  const revalidated = await request('/', { 'if-none-match': home.headers.etag || '' });
  add('public-html-etag-revalidation-returns-304', Boolean(home.headers.etag) && revalidated.status === 304 && revalidated.body === '', { etag: home.headers.etag, status: revalidated.status, bodyLength: revalidated.body.length });

  const versionedAsset = await request(`/shared/nv0-ui-runtime.js?v=${ASSET_VERSION}`);
  const rawAsset = await request('/shared/nv0-ui-runtime.js');
  const compressedHome = await request('/', { 'accept-encoding': 'br, gzip' });
  const compressedAsset = await request(`/shared/nv0-ui-runtime.js?v=${ASSET_VERSION}`, { 'accept-encoding': 'br, gzip' });
  const compressedAssetRevalidated = await request(`/shared/nv0-ui-runtime.js?v=${ASSET_VERSION}`, { 'accept-encoding': 'br, gzip', 'if-none-match': compressedAsset.headers.etag || '' });
  add('versioned-assets-have-one-year-immutable-cache', versionedAsset.status === 200 && /max-age=31536000/.test(String(versionedAsset.headers['cache-control'] || '')) && /immutable/.test(String(versionedAsset.headers['cache-control'] || '')), { status: versionedAsset.status, cacheControl: versionedAsset.headers['cache-control'] });
  add('unversioned-assets-force-revalidation', rawAsset.status === 200 && /no-cache/.test(String(rawAsset.headers['cache-control'] || '')), { status: rawAsset.status, cacheControl: rawAsset.headers['cache-control'] });
  add('public-html-prefers-brotli-when-client-supports-it', compressedHome.status === 200 && compressedHome.headers['content-encoding'] === 'br' && /Accept-Encoding/i.test(String(compressedHome.headers.vary || '')), { status: compressedHome.status, encoding: compressedHome.headers['content-encoding'], vary: compressedHome.headers.vary, identityBytes: home.bodyBytes, compressedBytes: compressedHome.bodyBytes, savedPercent: Number(((1 - compressedHome.bodyBytes / home.bodyBytes) * 100).toFixed(1)) });
  add('versioned-text-assets-prefers-brotli-when-client-supports-it', compressedAsset.status === 200 && compressedAsset.headers['content-encoding'] === 'br' && /Accept-Encoding/i.test(String(compressedAsset.headers.vary || '')), { status: compressedAsset.status, encoding: compressedAsset.headers['content-encoding'], vary: compressedAsset.headers.vary, identityBytes: versionedAsset.bodyBytes, compressedBytes: compressedAsset.bodyBytes, savedPercent: Number(((1 - compressedAsset.bodyBytes / versionedAsset.bodyBytes) * 100).toFixed(1)) });
  add('compressed-versioned-assets-revalidate-with-304-and-vary', compressedAssetRevalidated.status === 304 && compressedAssetRevalidated.bodyBytes === 0 && /Accept-Encoding/i.test(String(compressedAssetRevalidated.headers.vary || '')), { status: compressedAssetRevalidated.status, vary: compressedAssetRevalidated.headers.vary, bodyBytes: compressedAssetRevalidated.bodyBytes });
  add('public-home-security-headers-present', home.headers['x-content-type-options'] === 'nosniff' && home.headers['x-frame-options'] === 'DENY' && home.headers['referrer-policy'] === 'strict-origin-when-cross-origin' && /default-src 'self'/.test(String(home.headers['content-security-policy'] || '')), { headers: { 'x-content-type-options': home.headers['x-content-type-options'], 'x-frame-options': home.headers['x-frame-options'], 'referrer-policy': home.headers['referrer-policy'], 'content-security-policy': home.headers['content-security-policy'] } });
} finally {
  await stopChild();
  fs.rmSync(runtimeDir, { recursive: true, force: true });
}
const failed = checks.filter(check => !check.pass);
const report = { ok: failed.length === 0, contract: 'local-production-crawl-audit-v1', checkedAt: new Date().toISOString(), assetVersion: ASSET_VERSION, port, checks: checks.length, failed: failed.length, results: checks, serverLogTail: output.slice(-4000) };
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ok: report.ok, contract: report.contract, checks: report.checks, failed: report.failed, report: path.relative(root, reportPath).replaceAll('\\', '/') }, null, 2));
assert.equal(failed.length, 0, JSON.stringify(failed, null, 2));

import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const appPort = 3236;
const providerPort = 3237;
const runtimeDir = path.join(root, 'runtime-test-public-demo-error-contract');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
fs.rmSync(runtimeDir, { recursive: true, force: true });

let providerHits = 0;
const provider = http.createServer((req, res) => {
  providerHits += 1;
  if (req.url === '/bad-json') {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not json');
    return;
  }
  res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ ok: false, error: 'provider exploded' }));
});

await new Promise(resolve => provider.listen(providerPort, '127.0.0.1', resolve));

const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(appPort),
    NV0_RUNTIME_DIR: runtimeDir,
    NV0_ADMIN_KEY: 'public-demo-error-contract-key',
    NV0_SCAN_PROVIDER: 'external_http',
    NV0_SCAN_PROVIDER_URL: `http://127.0.0.1:${providerPort}/provider-500`,
    NV0_SCAN_PROVIDER_FALLBACK: 'false',
    NV0_PUBLIC_DEMO_FORCE_SCAN_FALLBACK: 'true',
    NV0_TARGET_FETCH_ENABLED: 'false',
    NV0_SCAN_SOFT_TIMEOUT_MS: '500'
  },
  stdio: 'ignore'
});

async function stopAll() {
  if (child.exitCode === null) {
    await new Promise(resolve => {
      const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 1000);
      child.once('exit', () => { clearTimeout(timer); resolve(); });
      try { child.kill('SIGTERM'); } catch { resolve(); }
    });
  }
  await new Promise(resolve => provider.close(resolve));
  fs.rmSync(runtimeDir, { recursive: true, force: true });
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
  throw new Error('server did not become healthy');
}

try {
  await waitUntilHealthy();
  const diagnose = await request('/api/public/diagnose', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ target: 'https://provider-500.example' })
  });

  assert.equal(diagnose.res.status, 200, 'public demo must not surface provider 500 as HTTP 500');
  assert.equal(diagnose.data.ok, true);
  assert.equal(diagnose.data.result.provider, 'builtin_fallback');
  assert.equal(diagnose.data.result.upstreamProviderStatus?.fallbackApplied, true);
  assert.doesNotMatch(JSON.stringify(diagnose.data), /서버 오류가 발생했습니다/);
  assert.ok(providerHits >= 1, 'fake external provider must have been called');

  console.log('public demo error contract ok');
} finally {
  await stopAll();
}

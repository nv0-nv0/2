import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const appPort = 3221;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const testRuntimeDir = path.join(root, 'runtime-test-trustops-growth');
fs.rmSync(testRuntimeDir, { recursive: true, force: true });

const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(appPort),
    NODE_ENV: 'test',
    NV0_EXPOSE_INTERNAL_PUBLIC_APIS: 'true',
    NV0_RUNTIME_DIR: testRuntimeDir,
    NV0_PLATFORM_TARGET: 'mvp',
    NV0_PAYMENT_PROVIDER: 'demo',
    NV0_PRELAUNCH_MODE: 'false',
    NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT: 'true',
    NV0_PUBLIC_SCAN_LIMIT: '200',
    NV0_PUBLIC_BASE_URL: `http://127.0.0.1:${appPort}`,
    NV0_ADMIN_KEY: 'phase317-key'
  },
  stdio: 'ignore'
});


async function stopChild(child) {
  if (!child || child.exitCode !== null) return;
  await new Promise(resolve => {
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch {}
    }, 500);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
    try { child.kill('SIGTERM'); } catch { resolve(); }
  });
}

async function waitUntilReady() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${appPort}/readyz`);
      if (res.ok) return;
    } catch {}
    await wait(200);
  }
  throw new Error('server not ready');
}

async function j(url, options = {}) {
  const res = await fetch(`http://127.0.0.1:${appPort}${url}`, options);
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { res, data, text };
}

try {
  await waitUntilReady();
  const products = await j('/api/public/products');
  assert.equal(products.res.status, 200);
  assert.deepEqual(products.data.offers.map(item => item.code), ['Report','FixPack','Monitoring','Expert','Agency']);

  const scan = await j('/api/public/diagnose', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ target: 'https://phase317-growth.example' })
  });
  assert.equal(scan.res.status, 200);
  assert.equal(scan.data.result.trustOpsBlueprint.positioning, 'VERIDION 신뢰 운영 플랫폼');
  assert.equal(scan.data.result.trustOpsBlueprint.improvementBacklogCount, 100);

  const blueprint = await j('/api/public/trustops-blueprint?riskScore=72&industry=shopping');
  assert.equal(blueprint.res.status, 200);
  assert.equal(blueprint.data.blueprint.fixPack.copyReadyCount, 5);

  const fix = await j('/api/public/fix-generator', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ brandName: '성장몰', siteUrl: 'https://phase317-growth.example', industry: 'shopping', supportEmail: 'help@example.kr' })
  });
  assert.equal(fix.res.status, 200);
  assert.equal(fix.data.fixPack.copyReadyCount, 5);
  assert.ok(fix.data.fixPack.fixes.every(item => item.copy && item.html && item.placement));

  const monitoring = await j('/api/public/monitoring-plan', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ siteUrl: 'https://phase317-growth.example', industry: 'shopping', cadence: 'weekly' })
  });
  assert.equal(monitoring.res.status, 200);
  assert.equal(monitoring.data.monitoring.schedule.length, 5);
  assert.equal(monitoring.data.monitoring.alertRules.length, 4);

  const revenue = await j('/api/public/revenue-optimization');
  assert.equal(revenue.res.status, 200);
  assert.ok(revenue.data.plan.ladder.length >= 6);
  assert.ok(revenue.data.plan.kpis.length >= 8);

  const templates = await j('/api/public/industry-templates');
  assert.equal(templates.res.status, 200);
  assert.equal(templates.data.templates.length, 10);

  const structured = await j('/api/public/structured-data-package');
  assert.equal(structured.res.status, 200);
  assert.equal(structured.data.structuredData.jsonLd['@type'], 'SoftwareApplication');
  assert.equal(structured.data.structuredData.faqJsonLd['@type'], 'FAQPage');

  const status = await j('/api/public/engine-agent-status');
  assert.equal(status.res.status, 200);
  assert.ok(status.data.engineCount >= 30);
  assert.ok(status.data.eventPolicyCount >= 12);

  console.log('phase317 trustops growth integration ok');
} finally {
  await stopChild(child);
  fs.rmSync(testRuntimeDir, { recursive: true, force: true });
}

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');
const port = Number(process.env.PHASE270_RUNTIME_PORT || 3227);
const base = `http://127.0.0.1:${port}`;
let child = null;
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function reachable(pathname) {
  try {
    const res = await fetch(`${base}${pathname}`, { redirect: 'manual' });
    return res.status > 0;
  } catch {
    return false;
  }
}

async function startServer() {
  if (await reachable('/healthz')) return;
  child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'test',
      NV0_ADMIN_KEY: process.env.NV0_ADMIN_KEY || 'phase270-admin-key',
      NV0_TRUST_PROXY_HEADERS: 'true',
      NV0_PUBLIC_SCAN_LIMIT: process.env.NV0_PUBLIC_SCAN_LIMIT || '200'
    },
    stdio: ['ignore', 'ignore', 'ignore']
  });
  for (let i = 0; i < 30; i += 1) {
    await wait(200);
    if (await reachable('/healthz')) return;
  }
  throw new Error(`local server failed to start on ${base}`);
}

async function get(pathname) {
  const res = await fetch(`${base}${pathname}`, { redirect: 'manual' });
  const text = await res.text();
  return { res, text };
}

async function postJson(pathname, body) {
  const res = await fetch(`${base}${pathname}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    redirect: 'manual'
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { res, text, json };
}

function validPortalUrl(value) {
  return typeof value === 'string' && /^\/portal\?siteId=[^&]+&requestId=.+/.test(value);
}

function assertDiagnosisPayload(label, payload) {
  add(`${label}: ok true`, payload?.ok === true, JSON.stringify(payload || {}));
  add(`${label}: completed status`, payload?.status === 'completed');
  add(`${label}: portalUrl present`, validPortalUrl(payload?.portalUrl), payload?.portalUrl || '');
  add(`${label}: redirectUrl equals portalUrl`, payload?.redirectUrl === payload?.portalUrl);
  add(`${label}: scan object exists`, !!payload?.scan && typeof payload.scan === 'object');
  add(`${label}: scan status completed`, payload?.scan?.status === 'completed');
  add(`${label}: scan id/requestId exists`, !!(payload?.scan?.id || payload?.scan?.requestId || payload?.scan?.scanId));
  add(`${label}: targetUrl exists`, typeof payload?.scan?.targetUrl === 'string' && /^https?:\/\//.test(payload.scan.targetUrl));
}

let failed = null;
try {
  await startServer();
  const health = await get('/healthz');
  add('healthz reachable', health.res.status === 200 && health.text.includes('"ok": true'));
  const ready = await get('/readyz');
  add('readyz reachable', ready.res.status === 200 && ready.text.includes('"ready": true'));
  const home = await get('/');
  add('home page status 200', home.res.status === 200);
  add('home instant form rendered', home.text.includes('homeInstantDemoForm') && home.text.includes('data-instant-demo="true"'));
  add('home auto handoff copy rendered', home.text.includes('자동 이동') && home.text.includes('내 사이트 관리'));
  const config = await get('/api/public/config');
  add('public config reachable', config.res.status === 200 && config.text.includes('turnstileEnabled'));

  const legacy = await postJson('/api/diagnostics/start', { url: 'example.com', source: 'phase270-runtime-flow' });
  add('legacy diagnostics start status 200', legacy.res.status === 200, legacy.text.slice(0, 220));
  assertDiagnosisPayload('legacy diagnostics start', legacy.json);

  const diagnose = await postJson('/api/public/diagnose', { target: 'https://example.org', source: 'phase270-runtime-flow' });
  add('public diagnose status 200', diagnose.res.status === 200, diagnose.text.slice(0, 220));
  assertDiagnosisPayload('public diagnose', diagnose.json);

  const portalUrl = diagnose.json?.portalUrl || legacy.json?.portalUrl || '/portal';
  const portal = await get(portalUrl);
  add('portal handoff page status 200', portal.res.status === 200, portal.text.slice(0, 200));
  add('portal page has my-site wording', /내 사이트|확인 기록|관리/.test(portal.text));

  const siteId = diagnose.json?.scan?.siteId || diagnose.json?.result?.siteId || '';
  const summaryPath = `/api/public/portal-summary${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ''}`;
  const summary = await get(summaryPath);
  add('portal summary API status 200', summary.res.status === 200, summary.text.slice(0, 220));
  add('portal summary API ok', summary.text.includes('"ok":true') || summary.text.includes('"ok": true'));
} catch (error) {
  failed = error;
} finally {
  if (child) {
    child.removeAllListeners();
    try { child.kill('SIGKILL'); } catch {}
    try { child.unref(); } catch {}
  }
  try {
    const seed = fs.readFileSync(path.join(root, 'runtime/data/db.seed.json'), 'utf8');
    fs.writeFileSync(path.join(root, 'runtime/data/db.json'), seed.endsWith('\n') ? seed : `${seed}\n`);
    fs.writeFileSync(path.join(root, 'runtime/data/sessions.json'), '[]\n');
  } catch (error) {
    add('runtime reset after flow', false, error.message);
  }
}

if (failed) add('runtime script execution', false, failed.message);
const passed = checks.filter(check => check.ok).length;
const failedCount = checks.length - passed;
const report = { generatedAt: new Date().toISOString(), phase: 'phase270-runtime-flow', ok: failedCount === 0, base, total: checks.length, passed, failed: failedCount, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE270_RUNTIME_FLOW_AUDIT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed, failed: failedCount, report: 'docs/current/PHASE270_RUNTIME_FLOW_AUDIT.json' }, null, 2));
if (!report.ok) {
  console.error(JSON.stringify(checks.filter(check => !check.ok), null, 2));
  process.exit(1);
}

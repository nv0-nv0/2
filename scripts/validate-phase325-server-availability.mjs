import fs from 'node:fs';
import { spawn } from 'node:child_process';

const failures = [];
const requiredFiles = [
  'docker-compose.yml',
  'deploy/docker-compose.coolify.yml',
  'deploy/docker-compose.commercial.yml',
  'docs/PHASE325_NO_AVAILABLE_SERVER_RECOVERY.md',
  'docs/PHASE325_SERVER_AVAILABILITY_REPORT.md',
  'docs/current/PHASE325_SERVER_AVAILABILITY_AUDIT.json'
];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) failures.push(`missing required file: ${file}`);
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (!pkg.version.includes('phase325')) failures.push('package version must include phase325');
for (const script of ['check:no-available-server', 'validate:phase325', 'phase325:final']) {
  if (!pkg.scripts?.[script]) failures.push(`missing package script: ${script}`);
}
if (pkg.scripts?.['delivery:final'] !== 'npm run phase325:final') failures.push('delivery:final must point to phase325:final');
if (pkg.scripts?.['release:predeploy'] !== 'npm run phase325:final') failures.push('release:predeploy must point to phase325:final');

const audit = fs.existsSync('docs/current/PHASE325_SERVER_AVAILABILITY_AUDIT.json')
  ? JSON.parse(fs.readFileSync('docs/current/PHASE325_SERVER_AVAILABILITY_AUDIT.json', 'utf8'))
  : null;
if (!audit?.ok) failures.push('phase325 audit must be ok=true');
if (audit && audit.score !== 100) failures.push('phase325 audit score must be 100');

async function runBootProbe() {
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    HOST: '127.0.0.1',
    PORT: '3299',
    NV0_PLATFORM_TARGET: 'mvp',
    NV0_DEPLOYMENT_STAGE: 'mvp',
    NV0_COMMERCIAL_LAUNCH_READY: 'false',
    NV0_ADMIN_AUTH_MODE: 'shared_key',
    NV0_ADMIN_KEY: 'phase325-local-boot-probe',
    NV0_PAYMENT_PROVIDER: 'disabled',
    NV0_SCAN_PROVIDER: 'builtin',
    NV0_PERSISTENCE_MODE: 'json',
    NV0_STORAGE_MODE: 'local_fs',
    NV0_SESSION_STORE: 'file',
    NV0_RATE_LIMIT_STORE: 'memory',
    NV0_LOCK_PROVIDER: 'memory',
    NV0_ENABLE_TURNSTILE: 'false',
    NV0_RUN_PREFLIGHT: 'false',
    NV0_RUNTIME_DIR: '/tmp/nv0-phase325-boot-probe'
  };
  const child = spawn(process.execPath, ['server/index.mjs'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', d => { output += d.toString(); });
  child.stderr.on('data', d => { output += d.toString(); });
  try {
    const deadline = Date.now() + 6000;
    let healthOk = false;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 250));
      try {
        const res = await fetch('http://127.0.0.1:3299/healthz');
        if (res.ok) { healthOk = true; break; }
      } catch {}
    }
    if (!healthOk) failures.push(`boot probe did not return healthy /healthz. output=${output.slice(-1000)}`);
  } finally {
    child.kill('SIGTERM');
  }
}

await runBootProbe();

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, phase: 325, score: 100, checks: requiredFiles.length + 7, bootProbe: 'pass' }, null, 2));

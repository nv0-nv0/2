import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
function add(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
}
function parseEnv(rel) {
  const values = {};
  for (const raw of read(rel).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 0) continue;
    values[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return values;
}
function appBlock(rel) {
  const text = read(rel);
  return text.split(/^  postgres:/m, 1)[0];
}

const prelaunchTemplates = [
  'deploy/coolify.env.example',
  'deploy/coolify.env.bulk.txt',
  'deploy/env.production.template',
  'deploy/env.production.nv0.kr.example',
  'deploy/env.commercial.template'
];
for (const file of prelaunchTemplates) {
  add(`${file}:prelaunch-payment-disabled`, () => {
    const env = parseEnv(file);
    assert.equal(env.NV0_DEPLOYMENT_STAGE, 'prelaunch', `${file}: expected prelaunch template`);
    assert.equal(env.NV0_COMMERCIAL_LAUNCH_READY, 'false', `${file}: template must remain cutover-safe`);
    assert.equal(env.NV0_PAYMENT_PROVIDER, 'disabled', `${file}: prelaunch must not activate payment provider`);
    assert.equal(env.NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT, 'false', `${file}: prelaunch online payment override must stay false`);
  });
}

for (const file of ['deploy/docker-compose.commercial.yml', 'deploy/docker-compose.local-minio.yml']) {
  add(`${file}:strict-redis-readiness-default`, () => assert.match(appBlock(file), /NV0_READYZ_REDIS_STRICT:\s*\$\{NV0_READYZ_REDIS_STRICT:-true\}/));
  add(`${file}:app-healthcheck-uses-readyz`, () => {
    const app = appBlock(file);
    assert.match(app, /fetch\('http:\/\/127\.0\.0\.1:3210\/readyz'\)/);
    assert.match(app, /b\.ok===true&&b\.ready===true/);
    assert.doesNotMatch(app, /fetch\('http:\/\/127\.0\.0\.1:3210\/healthz'\)/);
  });
}
add('deploy/env.commercial.template:strict-redis-readiness', () => assert.equal(parseEnv('deploy/env.commercial.template').NV0_READYZ_REDIS_STRICT, 'true'));
add('Dockerfile:liveness-remains-healthz', () => assert.match(read('Dockerfile'), /HEALTHCHECK[\s\S]*\/healthz/));
add('.gitignore:no-env-test-allowlist', () => assert.doesNotMatch(read('.gitignore'), /^!\.env\.test$/m));
add('.dockerignore:no-env-test-allowlist', () => assert.doesNotMatch(read('.dockerignore'), /^!\.env\.test$/m));
add('secure-release:dynamic-dot-env-deny-rule', () => {
  const script = read('scripts/create-secure-release.mjs');
  assert.match(script, /allowedRootEnvExamples/);
  assert.match(script, /isForbiddenEnvFile/);
  assert.match(script, /base\.startsWith\('\.env'\)/);
  assert.match(script, /const args = \['-q', zipPath, \.\.\.files\]/);
  assert.doesNotMatch(script, /zipPath, '\.',/);
});

const failures = checks.filter(item => !item.ok);
const report = {
  ok: failures.length === 0,
  phase: 'phase358-commercial-deploy-integrity',
  checkedAt: new Date().toISOString(),
  checked: checks.length,
  failed: failures.length,
  failures,
  checks
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE358_COMMERCIAL_DEPLOY_INTEGRITY.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);

import fs from 'node:fs';

const files = ['docker-compose.yml', 'deploy/docker-compose.coolify.yml'];
const failures = [];

function must(text, needle, file, message) {
  if (!text.includes(needle)) failures.push(`${file}: ${message}`);
}

function mustNot(text, needle, file, message) {
  if (text.includes(needle)) failures.push(`${file}: ${message}`);
}

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  must(text, 'NV0_PLATFORM_TARGET: ${NV0_PLATFORM_TARGET:-mvp}', file, 'boot-safe compose must default to mvp, not strict commercial');
  must(text, 'NV0_RUN_PREFLIGHT: ${NV0_RUN_PREFLIGHT:-false}', file, 'preflight must not block first boot');
  must(text, 'NV0_PERSISTENCE_MODE: ${NV0_PERSISTENCE_MODE:-json}', file, 'first boot must not require PostgreSQL');
  must(text, 'NV0_STORAGE_MODE: ${NV0_STORAGE_MODE:-local_fs}', file, 'first boot must not require S3');
  must(text, 'NV0_SCAN_PROVIDER: ${NV0_SCAN_PROVIDER:-builtin}', file, 'first boot must not require external scan provider');
  must(text, 'NV0_PAYMENT_PROVIDER: ${NV0_PAYMENT_PROVIDER:-disabled}', file, 'first boot must keep payment disabled');
  must(text, 'NV0_ENABLE_TURNSTILE: ${NV0_ENABLE_TURNSTILE:-false}', file, 'first boot must not require Turnstile keys');
  must(text, 'ports:', file, 'Coolify/Traefik needs explicit reachable service port in the boot-safe profile');
  must(text, '"${APP_PORT:-3210}:3210"', file, 'app port 3210 must be explicitly mapped');
  must(text, 'expose:', file, 'service port must be exposed for proxy discovery');
  must(text, 'healthcheck:', file, 'container must expose healthcheck for availability routing');
  must(text, '/healthz', file, 'healthcheck must use /healthz');
  must(text, 'legacy shared-key admin is MVP-only', file, 'boot-safe compose must document that NV0_ADMIN_KEY is not for commercial/prelaunch');
  mustNot(text, 'NV0_ADMIN_KEY:', file, 'boot-safe compose must not inject legacy NV0_ADMIN_KEY');
  mustNot(text, ':?', file, 'boot-safe compose must not include required env blockers like ${VAR:?set ...}');
  mustNot(text, 'depends_on:', file, 'boot-safe compose must not wait on optional infrastructure services');
}

const commercial = fs.readFileSync('deploy/docker-compose.commercial.yml', 'utf8');
must(commercial, 'NV0_PLATFORM_TARGET: commercial', 'deploy/docker-compose.commercial.yml', 'strict commercial compose must remain available');
must(commercial, 'postgres:', 'deploy/docker-compose.commercial.yml', 'strict commercial compose must keep postgres profile');
must(commercial, 'redis:', 'deploy/docker-compose.commercial.yml', 'strict commercial compose must keep redis profile');
must(commercial, 'NV0_PERSISTENCE_MODE: postgres_primary', 'deploy/docker-compose.commercial.yml', 'strict commercial compose must keep postgres_primary');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, checked: files.length + 1, guard: 'no-available-server-guard' }, null, 2));

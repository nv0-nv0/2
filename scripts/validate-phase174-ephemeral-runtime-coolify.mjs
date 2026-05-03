import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const checks = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function add(name, ok, detail = '') { checks.push({ name, ok: Boolean(ok), detail }); }
function run(name, command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', env: { ...process.env, ...options.env }, shell: false });
  add(name, result.status === 0, (result.stdout || result.stderr || '').slice(0, 4000));
  return result;
}

const dockerfile = read('Dockerfile');
const entrypoint = read('deploy/entrypoint.sh');
const server = read('server/index.mjs');
const backup = read('server/core/backup-operations.mjs');
const pkg = JSON.parse(read('package.json'));
const composeRoot = read('docker-compose.yml');
const composeCoolify = read('deploy/docker-compose.coolify.yml');
const envBulk = read('deploy/coolify.env.bulk.txt');

add('phase:package-version', pkg.version.includes('phase174-ephemeral-runtime-coolify-hardening'));
add('phase:script-registered', pkg.scripts?.['validate:phase174'] === 'node scripts/validate-phase174-ephemeral-runtime-coolify.mjs');
add('phase:final-script-registered', Boolean(pkg.scripts?.['phase174:final']));
add('server:release-phase-updated', server.includes("phase174-ephemeral-runtime-coolify-hardening"));

add('docker:no-implicit-volume', !dockerfile.includes('VOLUME ["/app/runtime"]'), 'Dockerfile must not create an anonymous /app/runtime volume in Coolify/rootless deployments.');
add('docker:tmp-runtime-default', dockerfile.includes('NV0_RUNTIME_DIR=/tmp/nv0-runtime') && dockerfile.includes('NV0_FALLBACK_RUNTIME_DIR=/tmp/nv0-runtime'));
add('docker:healthcheck-healthz', dockerfile.includes('/healthz') && !dockerfile.includes('/readyz"'));

add('compose:root-no-app-runtime-volume', !composeRoot.includes('nv0_runtime:/app/runtime') && !/volumes:\s*[\s\S]*nv0_runtime:/m.test(composeRoot));
add('compose:coolify-no-app-runtime-volume', !composeCoolify.includes('nv0_runtime:/app/runtime') && !/volumes:\s*[\s\S]*nv0_runtime:/m.test(composeCoolify));
add('compose:root-runtime-default-tmp', composeRoot.includes('NV0_RUNTIME_DIR=${NV0_RUNTIME_DIR:-/tmp/nv0-runtime}'));
add('compose:coolify-runtime-default-tmp', composeCoolify.includes('NV0_RUNTIME_DIR=${NV0_RUNTIME_DIR:-/tmp/nv0-runtime}'));
add('env:bulk-runtime-default-tmp', envBulk.includes('NV0_RUNTIME_DIR=/tmp/nv0-runtime') && envBulk.includes('NV0_REQUIRE_PERSISTENT_RUNTIME=auto'));

add('entrypoint:external-durable-mode', entrypoint.includes('external_durable_mode') && entrypoint.includes('$PERSISTENCE_MODE') && entrypoint.includes('$STORAGE_MODE'));
add('entrypoint:persistent-runtime-required-gate', entrypoint.includes('persistent_runtime_required') && entrypoint.includes('NV0_REQUIRE_PERSISTENT_RUNTIME'));
add('entrypoint:tmp-scratch-info-not-warning-for-external', entrypoint.includes('using ephemeral scratch runtime') && entrypoint.includes('durable state is external'));
add('entrypoint:no-su-exec', !/\bsu-exec\b/.test(entrypoint));
run('entrypoint:sh-syntax', 'sh', ['-n', 'deploy/entrypoint.sh']);
run('entrypoint:external-durable-command-exec', 'sh', ['-c', 'rm -rf /tmp/nv0-phase174-ok && NV0_PLATFORM_TARGET=commercial NV0_PERSISTENCE_MODE=postgres_primary NV0_STORAGE_MODE=s3 NV0_RUNTIME_DIR=/tmp/nv0-phase174-ok ./deploy/entrypoint.sh /bin/true && test -d /tmp/nv0-phase174-ok/reports && rm -rf /tmp/nv0-phase174-ok']);

add('server:sync-runtime-fallback', server.includes('resolveRuntimeDir') && server.includes('tryPrepareRuntimeDirSync') && server.includes('NV0_RUNTIME_EPHEMERAL'));
add('server:readyz-reports-runtime-mode', server.includes('runtimeEphemeral') && server.includes('runtimeDir: RUNTIME_DIR'));

add('backup:remote-only-local-permission-support', backup.includes('remote-only backup path') && backup.includes('localWritable') && backup.includes('phase174-ephemeral-runtime-remote-backup-v1'));
add('backup:list-snapshots-permission-safe', backup.includes('returning empty local backup list') && backup.includes('EROFS'));
add('backup:provider-handles-erofs', backup.includes("'EROFS'"));

const failed = checks.filter(item => !item.ok);
const report = {
  ok: failed.length === 0,
  phase: 'phase174-ephemeral-runtime-coolify-hardening',
  checkedAt: new Date().toISOString(),
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks
};
fs.writeFileSync(path.join(root, 'PHASE174_EPHEMERAL_RUNTIME_COOLIFY_VALIDATION_20260502.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);

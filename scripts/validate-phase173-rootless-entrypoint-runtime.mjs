import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const checks = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function add(name, ok, detail = '') { checks.push({ name, ok: Boolean(ok), detail }); }
function run(name, command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', env: { ...process.env, ...options.env }, shell: false });
  add(name, result.status === 0, (result.stdout || result.stderr || '').slice(0, 3000));
  return result;
}

const dockerfile = read('Dockerfile');
const entrypoint = read('deploy/entrypoint.sh');
const pkg = JSON.parse(read('package.json'));
const server = read('server/index.mjs');
const backup = read('server/core/backup-operations.mjs');
const publicRoutes = read('server/routes/public.mjs');
const accountRoutes = read('server/routes/account.mjs');
const paymentRoutes = read('server/routes/payment.mjs');
const composeFiles = [
  'docker-compose.yml',
  'deploy/docker-compose.coolify.yml',
  'deploy/docker-compose.commercial.yml',
  'deploy/docker-compose.local-minio.yml'
].map(file => [file, read(file)]);

add('phase:package-version', pkg.version.includes('phase173-rootless-entrypoint-runtime') || pkg.version.includes('phase174-ephemeral-runtime-coolify-hardening'));
add('phase:script-registered', pkg.scripts?.['validate:phase173'] === 'node scripts/validate-phase173-rootless-entrypoint-runtime.mjs');
add('phase:final-script-registered', Boolean(pkg.scripts?.['phase173:final']));
add('server:release-phase-retains-phase167-and-adds-phase173', server.includes('phase174-ephemeral-runtime-coolify-hardening') || server.includes('phase167-native-http-load-security-50-phase173-rootless-entrypoint-runtime'));

add('docker:no-su-exec-package', !/\bsu-exec\b/.test(dockerfile), 'Docker image must not install su-exec in rootless/no-setgroups environments.');
add('docker:entrypoint-retained', dockerfile.includes('ENTRYPOINT ["/app/deploy/entrypoint.sh"]'));
add('docker:cmd-retained', dockerfile.includes('CMD ["node", "server/index.mjs"]'));
add('docker:healthcheck-healthz', dockerfile.includes('/healthz') && !dockerfile.includes('/readyz"'));

add('entrypoint:no-su-exec-call', !/\bsu-exec\b/.test(entrypoint));
add('entrypoint:no-setgroups-path', !/setgroups|chgrp\s/.test(entrypoint));
add('entrypoint:runtime-tree-created', ['data','uploads','backups','reports'].every(name => entrypoint.includes(`$dir/${name}`)));
add('entrypoint:writable-probe', entrypoint.includes('entrypoint-write-probe') && entrypoint.includes('runtime_writable'));
add('entrypoint:fallback-runtime', entrypoint.includes('NV0_FALLBACK_RUNTIME_DIR') && entrypoint.includes('/tmp/nv0-runtime'));
add('entrypoint:exports-runtime-dir', entrypoint.includes('export NV0_RUNTIME_DIR="$RUNTIME_DIR"'));
add('entrypoint:preflight-optional', entrypoint.includes('NV0_RUN_PREFLIGHT') && entrypoint.includes('node scripts/preflight.mjs'));
add('entrypoint:command-override-supported', entrypoint.includes('if [ "$#" -gt 0 ]') && entrypoint.includes('exec "$@"'));
add('entrypoint:default-server-exec', entrypoint.includes('exec node server/index.mjs'));
run('entrypoint:sh-syntax', 'sh', ['-n', 'deploy/entrypoint.sh']);
run('entrypoint:normal-command-exec', 'sh', ['-c', 'NV0_RUNTIME_DIR=/tmp/nv0-phase173-ok ./deploy/entrypoint.sh /bin/true && rm -rf /tmp/nv0-phase173-ok']);

add('compose:all-app-healthchecks-use-healthz', composeFiles.every(([, src]) => src.includes('/healthz') && !src.includes('/readyz')));
add('compose:no-su-exec', composeFiles.every(([, src]) => !/\bsu-exec\b/.test(src)));

add('backup:provider-after-missing-json-or-permission', backup.includes('dbSnapshotProvider') && backup.includes('provider_after_${error.code}') && backup.includes('ENOENT') && backup.includes('EACCES') && backup.includes('EPERM'));
add('backup:auto-backup-permission-does-not-throw', backup.includes('runtime_backup_permission_denied') && backup.includes('runtime_data_permission_denied'));
add('backup:manifest-source-type-recorded', backup.includes('dbSourceType') && backup.includes('manifest.local.dbSha256'));

add('routes:public-customer-in-public-context', publicRoutes.includes('publicCustomer') && publicRoutes.includes('sanitizeOrderForPublic'));
add('routes:public-customer-in-account-context', accountRoutes.includes('publicCustomer') && accountRoutes.includes('sanitizeOrderForPublic'));
add('routes:payment-order-sanitizer-context', paymentRoutes.includes('sanitizeOrderForPublic'));
add('routes:system-items-alias-covered', publicRoutes.includes("/api/public/system-items") && publicRoutes.includes("/api/public/content"));

const failed = checks.filter(item => !item.ok);
const report = {
  ok: failed.length === 0,
  phase: 'phase173-rootless-entrypoint-runtime',
  checkedAt: new Date().toISOString(),
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks
};
fs.writeFileSync(path.join(root, 'PHASE173_ROOTLESS_ENTRYPOINT_RUNTIME_VALIDATION_20260502.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);

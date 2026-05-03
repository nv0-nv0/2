import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const checks = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function add(name, ok, detail = '') { checks.push({ name, ok: Boolean(ok), detail }); }
function run(name, command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', env: { ...process.env, ...options.env }, shell: false });
  add(name, result.status === 0, `${result.stdout || ''}${result.stderr || ''}`.slice(0, 4000));
  return result;
}

const pkg = JSON.parse(read('package.json'));
const entrypoint = read('deploy/entrypoint.sh');
const server = read('server/index.mjs');
const dockerfile = read('Dockerfile');
const envBulk = read('deploy/coolify.env.bulk.txt');
const composeCoolify = read('deploy/docker-compose.coolify.yml');

add('phase:package-version', pkg.version.includes('phase175-quiet-runtime-normalization'));
add('phase:script-registered', pkg.scripts?.['validate:phase175'] === 'node scripts/validate-phase175-quiet-runtime-normalization.mjs');
add('phase:final-script-registered', Boolean(pkg.scripts?.['phase175:final']));
add('server:release-phase-updated', server.includes('phase175-quiet-runtime-normalization'));

add('entrypoint:no-su-exec', !/\bsu-exec\b/.test(entrypoint));
add('entrypoint:verbose-gated-info', entrypoint.includes('NV0_ENTRYPOINT_VERBOSE') && entrypoint.includes('info() { [ "${NV0_ENTRYPOINT_VERBOSE:-false}" = "true" ]'));
add('entrypoint:legacy-runtime-detection', entrypoint.includes('is_legacy_runtime_dir') && entrypoint.includes('/app/runtime'));
add('entrypoint:force-runtime-escape-hatch', entrypoint.includes('NV0_FORCE_RUNTIME_DIR') && entrypoint.includes('FORCE_RUNTIME_DIR'));
add('entrypoint:bypass-legacy-runtime-before-probe', entrypoint.indexOf('is_legacy_runtime_dir "$RUNTIME_DIR"') > -1 && entrypoint.indexOf('prepare_runtime_tree "$RUNTIME_DIR"') > entrypoint.indexOf('is_legacy_runtime_dir "$RUNTIME_DIR"'));
add('entrypoint:still-hard-fails-persistent-local-mode', entrypoint.includes('refusing to boot because local persistent runtime is required'));
add('entrypoint:tmp-runtime-export', entrypoint.includes('export NV0_RUNTIME_DIR="$RUNTIME_DIR"') && entrypoint.includes('NV0_RUNTIME_EPHEMERAL'));

run('entrypoint:sh-syntax', 'sh', ['-n', 'deploy/entrypoint.sh']);
const quiet = run('entrypoint:legacy-app-runtime-external-durable-quiet', 'sh', ['-c', 'NV0_PLATFORM_TARGET=commercial NV0_PERSISTENCE_MODE=postgres_primary NV0_STORAGE_MODE=s3 NV0_REQUIRE_PERSISTENT_RUNTIME=auto NV0_RUNTIME_DIR=/app/runtime NV0_FALLBACK_RUNTIME_DIR=/tmp/nv0-phase175-quiet ./deploy/entrypoint.sh /bin/true'], { env: { NV0_ENTRYPOINT_VERBOSE: 'false' } });
add('entrypoint:quiet-no-warning-output', quiet.status === 0 && !/warning|not writable|using ephemeral scratch runtime|\/app\/runtime/.test(`${quiet.stdout || ''}${quiet.stderr || ''}`), `${quiet.stdout || ''}${quiet.stderr || ''}`);
const verbose = run('entrypoint:legacy-app-runtime-external-durable-verbose', 'sh', ['-c', 'NV0_PLATFORM_TARGET=commercial NV0_PERSISTENCE_MODE=postgres_primary NV0_STORAGE_MODE=s3 NV0_REQUIRE_PERSISTENT_RUNTIME=auto NV0_RUNTIME_DIR=/app/runtime NV0_FALLBACK_RUNTIME_DIR=/tmp/nv0-phase175-verbose NV0_ENTRYPOINT_VERBOSE=true ./deploy/entrypoint.sh /bin/true']);
add('entrypoint:verbose-can-explain-normalization', verbose.status === 0 && /legacy \/app\/runtime override ignored/.test(`${verbose.stdout || ''}${verbose.stderr || ''}`), `${verbose.stdout || ''}${verbose.stderr || ''}`);

add('server:legacy-runtime-normalization', server.includes('shouldBypassLegacyRuntimeDir') && server.includes('isLegacyRuntimeDir') && server.includes('NV0_FORCE_RUNTIME_DIR'));
add('server:runtime-verbose-gated', server.includes('runtimeVerbose') && server.includes('NV0_RUNTIME_VERBOSE'));
add('server:no-default-noisy-runtime-info', !server.includes("console.info(`nv0 runtime: using ephemeral scratch runtime '${fallback}' because requested runtime '${requested}'"));
add('server:marks-ephemeral-runtime', server.includes("env.NV0_RUNTIME_EPHEMERAL = 'true'"));

add('docker:tmp-runtime-default-kept', dockerfile.includes('NV0_RUNTIME_DIR=/tmp/nv0-runtime') && !dockerfile.includes('VOLUME ["/app/runtime"]'));
add('env:coolify-runtime-default-tmp-kept', envBulk.includes('NV0_RUNTIME_DIR=/tmp/nv0-runtime') && envBulk.includes('NV0_REQUIRE_PERSISTENT_RUNTIME=auto'));
add('compose:coolify-no-app-runtime-volume-kept', !composeCoolify.includes('nv0_runtime:/app/runtime'));

const failed = checks.filter(item => !item.ok);
const report = {
  ok: failed.length === 0,
  phase: 'phase175-quiet-runtime-normalization',
  checkedAt: new Date().toISOString(),
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks
};
fs.writeFileSync(path.join(root, 'PHASE175_QUIET_RUNTIME_NORMALIZATION_VALIDATION_20260502.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);

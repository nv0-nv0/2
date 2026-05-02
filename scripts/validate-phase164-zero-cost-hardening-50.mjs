import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildHardeningMatrix } from '../server/core/hardening-matrix.mjs';

const root = process.cwd();
const checks = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function add(name, ok, detail = '') { checks.push({ name, ok: Boolean(ok), detail }); }
function run(name, args) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', env: { ...process.env, NV0_AUTO_BACKUP_ENABLED: 'false' } });
  add(name, result.status === 0, (result.stdout || result.stderr || '').slice(0, 2000));
}

const pkg = JSON.parse(read('package.json'));
const server = read('server/index.mjs');
const routeSources = [server, 'server/routes/public.mjs'].map(item => item === server ? server : (fs.existsSync(path.join(root, item)) ? read(item) : '')).join('\n');
const compose = read('docker-compose.yml');
const coolify = read('deploy/docker-compose.coolify.yml');
const matrix = buildHardeningMatrix({
  releasePhase: 'phase164-zero-cost-hardening-50',
  version: 'phase164-hardening-matrix-v1',
  checkedAt: new Date().toISOString(),
  adminAuthLimit: 8,
  adminAuthWindowMs: 600000,
  publicScanLimit: 20,
  publicScanWindowMs: 60000,
  sessionTtlMs: 3600000,
  adminIpAllowlistCount: 1,
  platformCommercial: true,
  databaseUrl: 'postgres://nv0:pw@postgres:5432/nv0',
  pgSslMode: 'disable',
  redisConfigured: true,
  slowRequestThresholdMs: 1500,
  auditLogRetentionCount: 1000,
  dataDestructionGraceDays: 30,
  backupConfigured: true,
  supportMode: 'email_only'
});

add('phase:package-version', pkg.version.includes('phase164-zero-cost-hardening-50'));
add('phase:script-registered', pkg.scripts['validate:phase164'] === 'node scripts/validate-phase164-zero-cost-hardening-50.mjs');
add('phase:final-script-registered', Boolean(pkg.scripts['phase164:final']));
add('server:release-phase', server.includes("phase164-zero-cost-hardening-50"));
add('server:hardening-module-imported', server.includes('hardening-matrix.mjs'));
add('server:health-aliases', server.includes("'/health'") && server.includes("'/livez'"));
add('server:openapi-endpoint', routeSources.includes('/api/public/openapi.json'));
add('server:hardening-endpoint', routeSources.includes('/api/public/hardening-matrix'));
add('server:data-retention-cleanup', server.includes('cleanupDataRetention') && server.includes('DATA_DESTRUCTION_GRACE_DAYS'));
add('server:slow-request-logging', server.includes('slow_request') && server.includes('SLOW_REQUEST_THRESHOLD_MS'));
add('matrix:exactly-50', matrix.ok && matrix.checks.length === 50);
add('matrix:operator-required-separated', matrix.score.operatorRequired >= 3);
add('compose:app-no-new-privileges', compose.includes('no-new-privileges:true'));
add('compose:app-cap-drop', compose.includes('cap_drop:'));
add('compose:log-rotation', (compose.match(/max-size: "10m"/g) || []).length >= 3);
add('coolify:log-rotation', (coolify.match(/max-size: "10m"/g) || []).length >= 3);
add('env:slow-threshold', read('.env.example').includes('NV0_SLOW_REQUEST_THRESHOLD_MS=1500'));
add('env:data-destruction-grace', read('.env.example').includes('NV0_DATA_DESTRUCTION_GRACE_DAYS=30'));
add('script:restore-drill-exists', fs.existsSync(path.join(root, 'scripts/restore-drill.mjs')));
add('script:stress-smoke-exists', fs.existsSync(path.join(root, 'scripts/stress-smoke.mjs')));
add('docs:phase164-report', fs.existsSync(path.join(root, 'PHASE164_ZERO_COST_HARDENING_50_REPORT_20260502_KO.md')));
run('runtime:restore-drill', ['scripts/restore-drill.mjs']);
run('runtime:stress-smoke', ['scripts/stress-smoke.mjs']);

const failed = checks.filter(item => !item.ok);
const report = { ok: failed.length === 0, phase: 'phase164-zero-cost-hardening-50', checkedAt: new Date().toISOString(), total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks };
fs.writeFileSync(path.join(root, 'PHASE164_ZERO_COST_HARDENING_50_VALIDATION_20260502.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);

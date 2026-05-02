import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const checks = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function add(name, ok, detail = '') { checks.push({ name, ok: Boolean(ok), detail }); }
function run(name, args) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', env: { ...process.env, NV0_AUTO_BACKUP_ENABLED: 'false' } });
  add(name, result.status === 0, (result.stdout || result.stderr || '').slice(0, 1600));
}

const pkg = JSON.parse(read('package.json'));
const index = read('server/index.mjs');
const publicRoutes = exists('server/routes/public.mjs') ? read('server/routes/public.mjs') : '';
const adminRoutes = exists('server/routes/admin.mjs') ? read('server/routes/admin.mjs') : '';
const validation = exists('server/config/validation.mjs') ? read('server/config/validation.mjs') : '';

add('phase165:package-version', pkg.version.includes('phase165-route-security-validation-fix'));
add('phase165:script-registered', pkg.scripts['validate:phase165'] === 'node scripts/validate-phase165-route-security-validation-fix.mjs');
add('routes:public-module-exists', exists('server/routes/public.mjs'));
add('routes:admin-module-exists', exists('server/routes/admin.mjs'));
add('routes:index-imports-public-module', index.includes("./routes/public.mjs") && (index.includes('handlePublicRoutes') || index.includes('createPublicRouteHandler')));
add('routes:index-imports-admin-module', index.includes("./routes/admin.mjs") && (index.includes('handleAdminRoutes') || index.includes('createAdminRouteHandler')));
add('routes:index-delegates-public-before-inline-chain', index.includes("pathname.startsWith('/api/public/')") && index.includes('publicRouteHandler(req, res') && (index.indexOf("pathname === '/api/public/diagnosis-engine'") === -1 || index.indexOf("pathname.startsWith('/api/public/')") < index.indexOf("pathname === '/api/public/diagnosis-engine'")));
add('routes:index-delegates-admin-before-inline-chain', index.includes("pathname.startsWith('/api/admin/')") && index.includes('adminRouteHandler(req, res') && (index.indexOf("pathname === '/api/admin/session'") === -1 || index.indexOf("pathname.startsWith('/api/admin/')") < index.indexOf("pathname === '/api/admin/session'")));
add('routes:public-prefix-boundary', publicRoutes.includes("pathname.startsWith('/api/public/')") && publicRoutes.includes('Public route not found'));
add('routes:admin-prefix-boundary', adminRoutes.includes("pathname.startsWith('/api/admin/')"));
add('routes:admin-ip-allowlist-gate', adminRoutes.includes('adminIpAllowed(req)'));
add('routes:admin-session-gate', adminRoutes.includes('const session = await getSession(req)') && adminRoutes.includes('관리자 세션이 필요합니다'));
add('routes:admin-csrf-gate', adminRoutes.includes('requireAdminCsrf(req, res, session)'));
add('routes:admin-rbac-gate', (adminRoutes.match(/requireAdminPermission\(req, res, session/g) || []).length >= 6);
add('routes:object-storage-import-fixed', index.includes("putObjectToS3Compatible") && index.includes("./infrastructure/storage/s3-compatible.mjs"));
add('config:validation-module-exists', exists('server/config/validation.mjs'));
add('config:index-calls-validation-module', index.includes('validateRuntimeConfig({'));
add('config:enum-guards', validation.includes('assertEnumConfig') && validation.includes('NV0_ADMIN_AUTH_MODE') && validation.includes('NV0_PAYMENT_PROVIDER'));
add('config:range-guards', validation.includes('assertFiniteConfigNumber') && validation.includes('NV0_MAX_JSON_BODY_BYTES') && validation.includes('NV0_REQUEST_TIMEOUT_MS'));
add('config:commercial-guards', validation.includes('Commercial deployments require') && validation.includes('NV0_ADMIN_IP_ALLOWLIST'));
add('config:placeholder-guards', validation.includes('isPlaceholderConfigValue') && validation.includes('Real ${key} is required'));
run('runtime:source-syntax', ['scripts/check-source-syntax.mjs']);
run('runtime:routes-smoke', ['tests/routes-smoke.mjs']);

const failed = checks.filter(item => !item.ok);
const report = {
  ok: failed.length === 0,
  phase: 'phase165-route-security-validation-fix',
  checkedAt: new Date().toISOString(),
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks
};
fs.writeFileSync(path.join(root, 'PHASE165_ROUTE_SECURITY_VALIDATION_FIX_20260502.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);

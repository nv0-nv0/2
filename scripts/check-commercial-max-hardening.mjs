import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [];
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const add = (name, fn) => {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
};
const has = (file, token) => add(`${file}:${token}`, () => assert.ok(read(file).includes(token), `missing token: ${token}`));
const matches = (file, pattern, label) => add(`${file}:${label}`, () => assert.match(read(file), pattern));

// Preserve the previous MFA hotfix exactly as a non-regression baseline.
has('docker-compose.yml', 'NV0_ADMIN_MFA_REQUIRED: ${NV0_ADMIN_MFA_REQUIRED:-true}');
has('deploy/docker-compose.coolify.yml', 'NV0_ADMIN_MFA_REQUIRED: ${NV0_ADMIN_MFA_REQUIRED:-true}');
has('deploy/docker-compose.commercial.yml', 'NV0_ADMIN_MFA_REQUIRED: ${NV0_ADMIN_MFA_REQUIRED:-true}');
has('deploy/docker-compose.local-minio.yml', 'NV0_ADMIN_MFA_REQUIRED: ${NV0_ADMIN_MFA_REQUIRED:-true}');
has('scripts/preflight.mjs', 'Set NV0_ADMIN_MFA_REQUIRED=true in Coolify environment variables and redeploy.');
has('scripts/validate-coolify-env-detection.mjs', 'admin MFA must default to true so an omitted Coolify variable cannot disable the commercial preflight control');
has('deploy/COOLIFY_R2_DEPLOYMENT_RUNBOOK_KO.md', 'NV0_ADMIN_MFA_REQUIRED=true');
has('docs/HOTFIX_MFA_PREFLIGHT_RECOVERY_KO.md', 'NV0_ADMIN_MFA_REQUIRED=true');
has('deploy/entrypoint.sh', 'commercial profile forces NV0_ADMIN_MFA_REQUIRED=true; stale or missing Coolify value was normalized in-container.');
has('deploy/entrypoint.sh', 'export NV0_ADMIN_MFA_RECOVERY_NORMALIZED="true"');
has('deploy/entrypoint.sh', 'node scripts/check-commercial-totp-preflight.mjs');
has('scripts/check-commercial-totp-preflight.mjs', 'generate-admin-totp-secret.mjs --value-only locally');
has('scripts/check-commercial-totp-preflight.mjs', 'Do not paste the secret into logs or chat.');


has('server/config/validation.mjs', 'export function analyzeTotpSecretConfig');
has('server/config/validation.mjs', 'wrong_secret_type_base64url_like');
has('server/core/admin-auth.mjs', "if (!clean || !/^[A-Z2-7]+$/.test(clean)) return Buffer.alloc(0);");
has('deploy/entrypoint.sh', 'normalize_totp_transport_value');
has('deploy/entrypoint.sh', 'NV0_ADMIN_TOTP_TRANSPORT_NORMALIZED');
has('deploy/entrypoint.sh', 'NV0_PREFLIGHT_FAILURE_DELAY_SECONDS');
has('deploy/entrypoint.sh', 'NV0_TOTP_PREFLIGHT_FAILURE_MODE');
has('deploy/entrypoint.sh', 'safe configuration hold mode');
has('deploy/entrypoint.sh', 'commercial TOTP preflight failed; refusing to start the application and entering safe configuration hold mode.');
has('scripts/diagnose-admin-totp-env.mjs', 'commercial-admin-totp-secret-safe-diagnostic');
has('scripts/diagnose-admin-totp-env.mjs', 'secretPrinted: false');
has('docs/HOTFIX_TOTP_PRELAUNCH_SAFE_HOLD_KO.md', 'node scripts/diagnose-admin-totp-env.mjs');
has('scripts/generate-admin-totp-secret.mjs', "args.has('--value-only')");
has('scripts/generate-admin-totp-secret.mjs', "args.has('--env-line')");

// HTTP request hardening.
has('server/middleware/security.mjs', "const DEFAULT_ALLOWED_METHODS = Object.freeze(['GET', 'HEAD', 'POST', 'OPTIONS']);");
has('server/middleware/security.mjs', 'DEFAULT_MAX_REQUEST_TARGET_LENGTH = 4096');
has('server/middleware/security.mjs', "reason: 'request_target_too_long'");
has('server/middleware/security.mjs', "reason: 'request_target_control_character'");
has('server/middleware/security.mjs', "reason: 'invalid_request_url'");
has('server/middleware/security.mjs', "reason: 'method_rejected'");
has('server/middleware/security.mjs', "'cache-control': 'no-store'");
has('server/index.mjs', "'x-dns-prefetch-control': 'off'");
has('server/index.mjs', "'x-robots-tag': category === 'dynamic' || category === 'upload' ? 'noindex, nofollow, noarchive' : 'all'");
has('server/index.mjs', 'function endResponse(req, res, payload = \'\')');
has('server/index.mjs', "String(req.method || 'GET').toUpperCase() === 'HEAD'");
has('server/index.mjs', "const declaredLength = Number(req.headers['content-length'] || 0);");
has('server/index.mjs', 'req.aborted || !req.complete');
has('server/index.mjs', 'await fs.realpath(resolvedRoot)');
has('server/index.mjs', 'await fs.realpath(abs)');
has('server/index.mjs', "path.join(ROOT, 'shared'), '/shared/'");
has('server/index.mjs', "path.join(ROOT, 'apps/public'), '/apps/public/'");
has('server/index.mjs', "path.join(ROOT, 'apps/admin'), '/apps/admin/'");
has('server/index.mjs', "'content-length': String(data.byteLength)");

// Native server resource controls and shutdown behavior.
has('server/index.mjs', 'server.requestTimeout = REQUEST_TIMEOUT_MS;');
has('server/index.mjs', 'server.headersTimeout = Math.min(REQUEST_TIMEOUT_MS, 10_000);');
has('server/index.mjs', 'server.keepAliveTimeout = 5_000;');
has('server/index.mjs', 'server.maxHeadersCount = 100;');
has('server/index.mjs', 'server.maxRequestsPerSocket = 1_000;');
has('server/index.mjs', 'let shutdownPromise = null;');
has('server/index.mjs', 'if (shutdownPromise) return shutdownPromise;');
has('Dockerfile', 'STOPSIGNAL SIGTERM');
has('server/index.mjs', "const platformTarget = String(env.NV0_PLATFORM_TARGET || 'mvp').trim().toLowerCase();");

// Runtime configuration validation coverage.
has('server/config/validation.mjs', 'export function assertUrlConfig');
has('server/config/validation.mjs', 'export function assertSecretConfig');
has('server/config/validation.mjs', 'export function assertTotpSecretConfig');
for (const key of [
  'NV0_TARGET_FETCH_TIMEOUT_MS','NV0_TARGET_FETCH_MAX_BYTES','NV0_TARGET_FETCH_MAX_REDIRECTS','NV0_SCAN_SOFT_TIMEOUT_MS',
  'NV0_TARGET_FETCH_MAX_PAGES','NV0_TARGET_FETCH_CONCURRENCY','NV0_TARGET_FETCH_MAX_SITEMAP_URLS','NV0_TARGET_FETCH_MAX_DISCOVERY_RESOURCES',
  'NV0_DATA_RETENTION_DAYS','NV0_REFUND_REQUEST_WINDOW_DAYS','NV0_PAYMENT_IDEMPOTENCY_TTL_MS','NV0_EMAIL_MAX_RETRY_COUNT',
  'NV0_EMAIL_RETRY_BACKOFF_MS','NV0_PUBLIC_ASSET_CACHE_SECONDS','NV0_READYZ_CACHE_TTL_MS','NV0_REDIS_TIMEOUT_MS'
]) has('server/config/validation.mjs', `assertFiniteConfigNumber('${key}'`);
has('server/config/validation.mjs', "Commercial deployments require NV0_ADMIN_MFA_REQUIRED=true.");
has('server/config/validation.mjs', "assertTotpSecretConfig('NV0_ADMIN_TOTP_SECRET'");
has('server/config/validation.mjs', "assertSecretConfig('NV0_SESSION_SECRET'");
has('server/config/validation.mjs', "assertSecretConfig('NV0_SECURE_RECORDS_KEY'");
has('server/config/validation.mjs', "assertSecretConfig('NV0_PRIVACY_HASH_KEY'");
has('server/config/validation.mjs', "assertSecretConfig('NV0_BACKUP_ENCRYPTION_SECRET'");
has('server/config/validation.mjs', "assertUrlConfig('NV0_REDIS_URL'");
has('server/config/validation.mjs', "assertUrlConfig('NV0_SMTP_URL'");
has('server/config/validation.mjs', "assertUrlConfig('NV0_SCAN_PROVIDER_URL'");
has('server/config/validation.mjs', "assertUrlConfig('NV0_S3_ENDPOINT'");
has('server/config/validation.mjs', 'NV0_PAYMENT_REDIRECT_ALLOWED_HOSTS is empty.');

// Health/readiness commercial environment evidence.
has('server/bootstrap/commercial-env.mjs', 'NV0_ADMIN_MFA_REQUIRED');
has('server/bootstrap/commercial-env.mjs', 'NV0_ADMIN_TOTP_SECRET');
has('server/bootstrap/commercial-env.mjs', 'NV0_SECURE_RECORDS_KEY');
has('server/bootstrap/commercial-env.mjs', 'NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION');
has('server/bootstrap/commercial-env.mjs', 'export function isCommercialPlaceholder');
has('server/bootstrap/commercial-env.mjs', 'NV0_SCAN_PROVIDER_FALLBACK must stay true');
has('server/bootstrap/commercial-env.mjs', 'NV0_PAYMENT_PROVIDER must be disabled during prelaunch.');
has('server/bootstrap/commercial-env.mjs', 'NV0_S3_ENDPOINT must be a valid HTTPS URL except private local MinIO during prelaunch.');
has('server/bootstrap/commercial-env.mjs', 'NV0_SMTP_URL must use smtp:// or smtps://.');
has('server/bootstrap/commercial-env.mjs', 'payment-redirect-hosts-empty');

// Secure release evidence and reproducibility.
has('scripts/create-secure-release.mjs', 'secure-release-reproducible-v3');
has('scripts/create-secure-release.mjs', 'stat.isSymbolicLink()');
has('scripts/create-secure-release.mjs', 'forbiddenExtensions');
has('scripts/create-secure-release.mjs', 'lower.endsWith(extension)');
has('scripts/create-secure-release.mjs', 'NV0_RELEASE_MAX_SINGLE_FILE_BYTES');
has('scripts/create-secure-release.mjs', "spawnSync('zip', ['-X','-q','-@',zipPath]");
has('scripts/create-secure-release.mjs', "spawnSync('unzip', ['-Z1', zipPath]");
has('scripts/create-secure-release.mjs', 'filesSha256');
has('scripts/create-secure-release.mjs', 'verifiedZipEntries');
has('scripts/create-secure-release.mjs', 'duplicateZipEntries');
has('scripts/create-secure-release.mjs', 'sortPaths(files)');
has('scripts/create-secure-release.mjs', "`${zipPath}.sha256.txt`");
has('scripts/check-delivery-hygiene.mjs', "contract: 'delivery-hygiene-v3'");
has('scripts/check-delivery-hygiene.mjs', 'delivery must not contain symlinks');
has('scripts/check-delivery-hygiene.mjs', "'.sql.gz'");
has('scripts/validate-prod-env.mjs', 'NV0_ADMIN_MFA_REQUIRED must be true');
has('scripts/validate-prod-env.mjs', 'NV0_ADMIN_TOTP_SECRET must be a finalized Base32 secret with at least 16 characters');
has('scripts/validate-prod-env.mjs', 'NV0_S3_ENDPOINT must use HTTPS except private local MinIO during prelaunch');
has('scripts/check-no-available-server-guard.mjs', 'boot-safe compose must preserve the commercial MFA fail-closed hotfix');
has('scripts/audit-inventory.mjs', "path.join(ROOT, 'docs', 'current')");
has('scripts/audit-inventory.mjs', 'REMAINING_WORK_INVENTORY.json');
has('scripts/audit-inventory.mjs', 'report.generatedAt.slice(0, 10)');

// Delivery documentation and gate wiring.
for (const file of [
  'docs/COMMERCIAL_MAXIMIZATION_REPORT_KO.md',
  'docs/CONFIGURATION_REFERENCE_KO.md',
  'docs/POST_DEPLOYMENT_ACCEPTANCE_KO.md',
  'tests/commercial-max-hardening-contract.mjs',
  'tests/commercial-mfa-entrypoint-normalization-contract.mjs',
  'docs/HOTFIX_MFA_RUNTIME_NORMALIZATION_KO.md',
  'docs/HOTFIX_TOTP_SECRET_PREFLIGHT_ALIGNMENT_KO.md',
  'tests/commercial-totp-preflight-contract.mjs',
  'tests/commercial-totp-transport-hardening-contract.mjs',
  'docs/HOTFIX_TOTP_TRANSPORT_HARDENING_KO.md',
  'scripts/generate-admin-totp-secret.mjs',
  'tools/copy-admin-totp-secret-normal-view.ps1',
  'tools/copy-admin-totp-secret-developer-view.ps1'
]) add(`artifact:${file}`, () => assert.equal(exists(file), true, `${file} missing`));
has('scripts/run-release-gate.mjs', "['check:commercial-max-hardening', 'node', ['scripts/check-commercial-max-hardening.mjs']]");
has('scripts/run-release-gate.mjs', "['test:commercial-max-hardening', 'node', ['tests/commercial-max-hardening-contract.mjs']]");
has('scripts/run-release-gate.mjs', "['test:commercial-mfa-entrypoint-normalization', 'node', ['tests/commercial-mfa-entrypoint-normalization-contract.mjs']]");
has('scripts/run-release-gate.mjs', "['test:commercial-totp-preflight-alignment', 'node', ['tests/commercial-totp-preflight-contract.mjs']]");
has('scripts/run-release-gate.mjs', "['test:commercial-totp-transport-hardening', 'node', ['tests/commercial-totp-transport-hardening-contract.mjs']]");
has('scripts/check-operational-readiness-contract.mjs', 'docs/COMMERCIAL_MAXIMIZATION_REPORT_KO.md');
has('scripts/validate-deploy-bundle.mjs', 'scripts/check-commercial-max-hardening.mjs');
has('README.md', '상용화 극대화 하드닝');
has('docs/INDEX.md', 'COMMERCIAL_MAXIMIZATION_REPORT_KO.md');

const failures = checks.filter(item => !item.ok);
const report = {
  ok: failures.length === 0,
  contract: 'commercial-max-hardening-static-contract-v1',
  checkedAt: new Date().toISOString(),
  checked: checks.length,
  failed: failures.length,
  failures,
  checks
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/COMMERCIAL_MAX_HARDENING.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ok: report.ok, contract: report.contract, checked: report.checked, failed: report.failed, report: 'docs/current/COMMERCIAL_MAX_HARDENING.json' }, null, 2));
if (!report.ok) process.exit(1);

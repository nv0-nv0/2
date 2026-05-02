import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const docsDir = path.join(root, 'docs');
fs.mkdirSync(docsDir, { recursive: true });
const checks = [];
const add = (name, ok, details = null) => checks.push({ name, ok: Boolean(ok), details });
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));

const pkg = JSON.parse(read('package.json'));
add('version:phase118-production-launch-gated', /phase118-production-100-launch-gated/.test(pkg.version));
add('script:phase118-final', pkg.scripts?.['phase118:final']?.includes('validate-phase118-production-100.mjs'));
add('script:validate-phase118', pkg.scripts?.['validate:phase118'] === 'node scripts/validate-phase118-production-100.mjs');

for (const rel of [
  'server/index.mjs',
  'scripts/validate-prod-env.mjs',
  'scripts/preflight.mjs',
  'scripts/validate-coolify-env-detection.mjs',
  'scripts/validate-deploy-bundle.mjs',
  'deploy/entrypoint.sh',
  'deploy/coolify.env.bulk.txt',
  'deploy/docker-compose.coolify.yml',
  'docker-compose.yml',
  'apps/public/home/index.html',
  'apps/public/veridion-demo/app.js',
  'apps/public/business-info/index.html'
]) add(`exists:${rel}`, exists(rel));

const server = read('server/index.mjs');
for (const token of [
  'Commercial launch requires real ',
  'isPlaceholderConfigValue',
  'buildProductionLaunchChecklist',
  'placeholder_env_removed',
  'NV0_MAIL_ORDER_REGISTRATION_NUMBER',
  'NV0_HOSTING_PROVIDER',
  'NV0_SMTP_URL',
  'NV0_ADMIN_IP_ALLOWLIST',
  'NV0_PORTONE_WEBHOOK_VERIFY_MODE'
]) add(`server:commercial-guard:${token}`, server.includes(token));

const validateEnv = read('scripts/validate-prod-env.mjs');
for (const token of [
  'isPlaceholderConfigValue',
  'must be a real production value, not a placeholder',
  'NV0_MAIL_ORDER_REGISTRATION_NUMBER',
  'NV0_HOSTING_PROVIDER',
  'NV0_ADMIN_IP_ALLOWLIST',
  'NV0_SMTP_URL'
]) add(`validate-prod-env:${token}`, validateEnv.includes(token));

const preflight = read('scripts/preflight.mjs');
for (const token of [
  'function placeholder',
  'finalized(name)',
  'must be finalized before commercial launch',
  'NV0_MAIL_ORDER_REGISTRATION_NUMBER',
  'NV0_HOSTING_PROVIDER'
]) add(`preflight:${token}`, preflight.includes(token));

const html = [
  'apps/public/home/index.html',
  'apps/public/veridion-demo/index.html',
  'apps/public/plans/index.html',
  'apps/public/board/index.html',
  'apps/public/business-info/index.html',
  'apps/public/privacy/index.html',
  'apps/public/terms/index.html',
  'apps/public/refund/index.html'
].map(read).join('\n');

for (const token of ['Why it matters', 'Overview', 'Next Step', 'Preview', '통신판매업 신고 완료 후 표시 예정', '상용 결제 전 입력 필요', '호스팅 제공자 실제 운영 인프라 확정 후 입력 필요', 'support@nv0.kr']) {
  add(`public:no-banned-copy:${token}`, !html.includes(token));
}
for (const token of ['무료 진단 시작', '결제 전 신뢰 점검', '위험도 72 / 100', '전체 상품 비교', '운영 공개 기준', '이메일 전용 고객지원']) {
  add(`public:required-copy:${token}`, html.includes(token));
}

const envBulk = read('deploy/coolify.env.bulk.txt');
for (const key of [
  'NODE_ENV=production',
  'NV0_PLATFORM_TARGET=commercial',
  'NV0_ADMIN_AUTH_MODE=account_rbac',
  'NV0_PERSISTENCE_MODE=postgres_primary',
  'NV0_SESSION_STORE=redis',
  'NV0_RATE_LIMIT_STORE=redis',
  'NV0_LOCK_PROVIDER=redis',
  'NV0_STORAGE_MODE=s3',
  'NV0_PAYMENT_PROVIDER=portone_v2',
  'NV0_PORTONE_WEBHOOK_VERIFY_MODE=strict',
  'NV0_RUN_PREFLIGHT=true'
]) add(`coolify-bulk:${key}`, envBulk.includes(key));

for (const forbidden of ['NV0_PAYMENT_PROVIDER=demo', 'NV0_ADMIN_KEY=', 'NV0_PERSISTENCE_MODE=json', 'NV0_SCAN_PROVIDER=builtin', 'NV0_STORAGE_MODE=local_fs']) {
  add(`coolify-bulk:no-forbidden:${forbidden}`, !envBulk.includes(forbidden));
}

const entrypoint = read('deploy/entrypoint.sh');
add('entrypoint:runs-preflight', entrypoint.includes('node scripts/preflight.mjs'));
add('entrypoint:exec-server', entrypoint.includes('exec node server/index.mjs'));

const report = {
  generatedAt: new Date().toISOString(),
  ok: checks.every(item => item.ok),
  phase: 'phase118-production-100-launch-gated',
  total: checks.length,
  passed: checks.filter(item => item.ok).length,
  failed: checks.filter(item => !item.ok).length,
  checks
};
const out = path.join(docsDir, 'PHASE118_PRODUCTION_100_GATE_20260428.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, report: 'docs/PHASE118_PRODUCTION_100_GATE_20260428.json' }, null, 2));
if (!report.ok) process.exit(1);

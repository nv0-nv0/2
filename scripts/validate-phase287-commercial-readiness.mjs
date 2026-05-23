import fs from 'node:fs';
import path from 'node:path';
import { runPhase287CommercialAudit, buildCommercialReadinessStatus, PHASE287_COMMERCIAL_READINESS_VERSION } from '../server/core/commercial-readiness-287.mjs';

const ROOT = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}
function walk(dir = '.', out = []) {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const rel = path.posix.join(dir === '.' ? '' : dir.replace(/\\/g, '/'), entry.name);
    if (entry.isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}

const files = walk('.');
const packageJson = JSON.parse(read('package.json'));
const publicRoutes = read('server/routes/public.mjs');
const adminRoutes = read('server/routes/admin.mjs');
const index = read('server/index.mjs');
const envExample = read('.env.example');
const moduleSource = read('server/core/commercial-readiness-287.mjs');

const routes = [];
if (publicRoutes.includes('/api/public/commercial-readiness')) routes.push('/api/public/commercial-readiness');
if (adminRoutes.includes('/api/admin/commercial-readiness/audit')) routes.push('/api/admin/commercial-readiness/audit');

const packageAudit = runPhase287CommercialAudit({ files, packageJson, routes, envExample });
const defaultStatus = buildCommercialReadinessStatus({}, {
  NV0_SUPPORT_EMAIL: 'ct@nv0.kr',
  NV0_PRIVACY_OFFICER_EMAIL: 'privacy@nv0.kr',
  NV0_REFUND_REQUEST_WINDOW_DAYS: '7',
  NV0_DATA_RETENTION_DAYS: '90',
  NV0_PORTONE_WEBHOOK_VERIFY_MODE: 'strict',
  NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT: 'false',
  NV0_CTA_AUTOPUBLISH_INTERVAL_MS: '1200000',
  NV0_RUN_PREFLIGHT: 'true'
});
const liveEnvStatus = buildCommercialReadinessStatus({}, {
  NV0_SUPPORT_EMAIL: 'ct@nv0.kr',
  NV0_PRIVACY_OFFICER_EMAIL: 'privacy@nv0.kr',
  NV0_REFUND_REQUEST_WINDOW_DAYS: '7',
  NV0_DATA_RETENTION_DAYS: '90',
  NV0_LEGAL_REVIEW_APPROVED: 'true',
  NV0_POLICY_VERSION: 'phase287-test',
  NV0_PAYMENT_PROVIDER: 'portone_v2',
  NV0_PAYMENT_LIVE_READY: 'true',
  NV0_COMMERCIAL_LAUNCH_READY: 'true',
  NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT: 'false',
  NV0_PORTONE_API_BASE_URL: 'https://api.portone.io',
  NV0_PORTONE_API_SECRET: 'live_secret_placeholder_for_validation',
  NV0_PORTONE_STORE_ID: 'store_live_placeholder',
  NV0_PORTONE_CHANNEL_KEY: 'channel_live_placeholder',
  NV0_PORTONE_WEBHOOK_SECRET: 'webhook_live_placeholder',
  NV0_PORTONE_WEBHOOK_VERIFY_MODE: 'strict',
  NV0_PAYMENT_IDEMPOTENCY_TTL_MS: '86400000',
  NV0_PERSISTENCE_MODE: 'postgres_primary',
  NV0_DATABASE_URL: 'postgres://nv0:strong@postgres:5432/nv0',
  NV0_REDIS_URL: 'redis://redis:6379/0',
  NV0_STORAGE_MODE: 's3',
  NV0_S3_BUCKET: 'nv0-production',
  NV0_AUTO_BACKUP_ENABLED: 'true',
  NV0_BACKUP_ENCRYPTION_SECRET: 'very-long-backup-secret',
  NV0_SECURE_RECORDS_KEY: 'very-long-secure-records-key',
  NV0_OPERATOR_ALERT_EMAIL: 'ops@nv0.kr',
  NV0_AUDIT_LOG_RETENTION_COUNT: '1000',
  NV0_CTA_AUTOPUBLISH_INTERVAL_MS: '1200000',
  NV0_RUN_PREFLIGHT: 'true'
});

const checks = [
  {
    key: 'moduleExists',
    weight: 10,
    pass: exists('server/core/commercial-readiness-287.mjs') && moduleSource.includes(PHASE287_COMMERCIAL_READINESS_VERSION),
    message: '상용 법무/결제/운영 게이트 모듈'
  },
  {
    key: 'legalGate',
    weight: 10,
    pass: moduleSource.includes('NV0_LEGAL_REVIEW_APPROVED') && envExample.includes('NV0_LEGAL_REVIEW_APPROVED=false'),
    message: '법무 검토 승인 게이트'
  },
  {
    key: 'paymentGate',
    weight: 12,
    pass: moduleSource.includes('NV0_PAYMENT_LIVE_READY') && envExample.includes('NV0_PAYMENT_LIVE_READY=false') && envExample.includes('NV0_PORTONE_WEBHOOK_VERIFY_MODE=strict'),
    message: '결제 실환경 승인/웹훅 strict 게이트'
  },
  {
    key: 'opsGate',
    weight: 12,
    pass: moduleSource.includes('NV0_BACKUP_RESTORE_DRILL_APPROVED') || envExample.includes('NV0_BACKUP_RESTORE_DRILL_APPROVED=false'),
    message: '운영 백업/복구 리허설 게이트'
  },
  {
    key: 'publicPolicyPages',
    weight: 10,
    pass: ['apps/public/privacy/index.html','apps/public/terms/index.html','apps/public/refund/index.html','apps/public/business-info/index.html'].every(exists),
    message: '공개 정책 페이지'
  },
  {
    key: 'officialReferences',
    weight: 8,
    pass: moduleSource.includes('전자상거래 등에서의 소비자보호에 관한 법률') && moduleSource.includes('개인정보 보호법') && moduleSource.includes('전자금융거래법'),
    message: '공식 법령 기준 매트릭스'
  },
  {
    key: 'routes',
    weight: 10,
    pass: routes.includes('/api/public/commercial-readiness') && routes.includes('/api/admin/commercial-readiness/audit'),
    message: '공개/관리자 상용 준비 API'
  },
  {
    key: 'safeDefaultBlocksLive',
    weight: 8,
    pass: defaultStatus.status === 'package-ready-env-review-required' && defaultStatus.commercialReady === false,
    message: '기본 환경은 실결제/상용 출시 차단'
  },
  {
    key: 'liveEnvCanPass',
    weight: 8,
    pass: liveEnvStatus.commercialReady === true && liveEnvStatus.payment.status === 'ready' && liveEnvStatus.ops.status === 'ready',
    message: '실환경 승인값 입력 시 상용 통과 가능'
  },
  {
    key: 'docs',
    weight: 6,
    pass: exists('docs/PHASE287_COMMERCIAL_READINESS_REPORT.md') && exists('docs/LEGAL_PAYMENT_OPS_CHECKLIST.md') && exists('docs/COMMERCIAL_LAUNCH_RUNBOOK.md'),
    message: '법무/결제/운영 납품 문서'
  },
  {
    key: 'scripts',
    weight: 6,
    pass: packageJson.scripts?.['validate:phase287'] === 'node scripts/validate-phase287-commercial-readiness.mjs' && packageJson.scripts?.['phase287:final']?.includes('phase286:final'),
    message: 'phase287 최종 게이트'
  }
];

const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
const failed = checks.filter((item) => !item.pass);
const result = {
  ok: failed.length === 0 && score === 100 && packageAudit.ok,
  phase: 'phase287',
  version: PHASE287_COMMERCIAL_READINESS_VERSION,
  score,
  total: 100,
  packageAudit,
  defaultStatus: {
    status: defaultStatus.status,
    commercialReady: defaultStatus.commercialReady,
    packageScore: defaultStatus.packageScore,
    environmentScore: defaultStatus.environmentScore
  },
  liveEnvStatus: {
    status: liveEnvStatus.status,
    commercialReady: liveEnvStatus.commercialReady,
    packageScore: liveEnvStatus.packageScore,
    environmentScore: liveEnvStatus.environmentScore
  },
  checks,
  failed,
  report: 'docs/current/PHASE287_COMMERCIAL_READINESS_AUDIT.json'
};

fs.mkdirSync(path.join(ROOT, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(ROOT, result.report), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);

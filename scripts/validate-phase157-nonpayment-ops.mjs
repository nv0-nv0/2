import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const server = read('server/index.mjs');
const diagnosticsHtml = read('apps/admin/diagnostics/index.html');
const diagnosticsJs = read('apps/admin/diagnostics/app.js');
const preflight = read('scripts/preflight.mjs');
const packageJson = JSON.parse(read('package.json'));
const checks = [];
function add(key, ok, detail = '') { checks.push({ key, ok: Boolean(ok), detail }); }

const normalizeExternalBlock = /function normalizeExternalScanPayload[\s\S]*?async function runExternalScan/.exec(server)?.[0] || '';
const processEmailBlock = /async function processEmailOutbox[\s\S]*?function cleanupIdempotencyKeys/.exec(server)?.[0] || '';

add('smtp:node-native-adapter-imports', server.includes("import net from 'node:net'") && server.includes("import tls from 'node:tls'"));
add('smtp:url-parser-present', server.includes('function parseSmtpUrl') && server.includes('smtp://') && server.includes('smtps://'));
add('smtp:live-send-present', server.includes('async function sendSmtpMail') && server.includes('smtp_live') && server.includes('SMTP message body'));
add('smtp:dry-run-non-destructive', processEmailBlock.includes("item.deliveryMode = 'dry_run_preview'") && !/if \(dryRun\) \{\s*markEmailAttempt/.test(processEmailBlock));
add('smtp:retry-path-preserved', processEmailBlock.includes('markEmailAttempt(item, { ok: false') && server.includes('EMAIL_MAX_RETRY_COUNT'));
add('external-scan:undefined-fetched-bug-removed', normalizeExternalBlock.includes('payload?.scannedPages') && !normalizeExternalBlock.includes('fetched.pages'));
add('external-scan:fallback-still-supported', server.includes("fallback.provider = 'builtin_fallback'") && server.includes('SCAN_PROVIDER_FALLBACK'));
add('launch-gate:portone-excluded-until-enabled', server.includes("if (COMMERCIAL_LAUNCH_READY && PAYMENT_PROVIDER === 'portone_v2')") && server.includes("PAYMENT_PROVIDER !== 'portone_v2' || PORTONE_WEBHOOK_VERIFY_MODE === 'strict'"));
add('launch-gate:mailorder-excluded-until-launch', server.includes("if (COMMERCIAL_LAUNCH_READY) mustNotBePlaceholder.push('NV0_MAIL_ORDER_REGISTRATION_NUMBER')"));
add('diagnostics:readiness-api-expanded', server.includes('readiness: buildReleaseReadiness(db)') && server.includes('emailOutbox: {') && server.includes('recentOperationalEvents'));
add('diagnostics:admin-actions-added', diagnosticsHtml.includes('selfTestBtn') && diagnosticsHtml.includes('emailDryRunBtn') && diagnosticsHtml.includes('emailLiveBtn'));
add('diagnostics:admin-js-actions-wired', diagnosticsJs.includes('/api/admin/ops/self-test') && diagnosticsJs.includes('/api/admin/email-outbox/process') && diagnosticsJs.includes('dryRun: false'));
add('preflight:smtp-url-validation', preflight.includes('function validateSmtpUrl') && preflight.includes('NV0_SMTP_URL must start with smtp:// or smtps://'));
for (const rel of ['deploy/env.commercial.template','deploy/coolify.env.bulk.txt','deploy/coolify.env.example','deploy/env.production.template','deploy/env.production.nv0.kr.example']) {
  add(`env:${rel}:email-from`, read(rel).includes('NV0_EMAIL_FROM=ct@nv0.kr'));
}
add('package:phase157-script', packageJson.scripts?.['validate:phase157'] === 'node scripts/validate-phase157-nonpayment-ops.mjs');

const failures = checks.filter(item => !item.ok);
const report = {
  ok: failures.length === 0,
  phase: 'PHASE157_NONPAYMENT_OPS_COMPLETION',
  scope: 'PortOne 결제 연결과 통신판매업 신고번호를 제외한 운영 연결성·진단 안정성·관리자 UX 보강 검증',
  checkedAt: new Date().toISOString(),
  passed: checks.length - failures.length,
  failed: failures.length,
  checks,
  failures
};
const out = path.join(root, 'docs', 'PHASE157_NONPAYMENT_OPS_COMPLETION_VALIDATION_20260502.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2));
if (!report.ok) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(report, null, 2));

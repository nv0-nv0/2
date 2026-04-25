import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => readFileSync(path.join(root, rel), 'utf8');
const exists = rel => existsSync(path.join(root, rel));
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });

const pkg = JSON.parse(read('package.json'));
const server = read('server/index.mjs');
const checkout = read('apps/public/checkout/index.html') + '\n' + read('apps/public/checkout/app.js');
const privacy = read('apps/public/privacy/index.html');
const refund = read('apps/public/refund/index.html');
const business = read('apps/public/business-info/index.html');
const e2e = read('tests/e2e.mjs');
const env = read('.env.example');

add('phase40 version marker', pkg.version.includes('phase40') || pkg.version.includes('phase41') || pkg.version.includes('phase42') || pkg.version.includes('phase43'));
add('final review script exists', pkg.scripts['final:review'] && (pkg.scripts['final:review'].includes('validate:phase40') || pkg.scripts['final:review'].includes('run-final-review.mjs')));
add('delivery consent required server-side', server.includes('!body.deliveryConsent') && server.includes('디지털 산출물 제공'));
add('delivery consent visible at checkout', checkout.includes('deliveryConsent') && checkout.includes('청약철회가 제한'));
add('delivery consent regression test', e2e.includes('deliveryConsent') && e2e.includes('checkout-session'));
add('checkout tests include all mandatory consents', ['privacyConsent','termsConsent','refundConsent','deliveryConsent'].every(k => e2e.includes(k))); 
add('personal data minimization no buyer name field', !checkout.includes('buyerName') && !checkout.includes('registerName') && !checkout.includes('registerCompany'));
add('legal pages present', ['apps/public/terms/index.html','apps/public/privacy/index.html','apps/public/refund/index.html','apps/public/business-info/index.html'].every(exists));
add('privacy page contains retention and rights', privacy.includes('보유') && privacy.includes('파기') && privacy.includes('권리'));
add('refund page preserves statutory rights', refund.includes('표시·광고 또는 계약 내용과 다르게 제공') && refund.includes('관계 법령상 권리'));
add('business info requires mail order disclosure', business.includes('통신판매업') && server.includes('mailOrderRegistrationNumber'));
add('robots and sitemap endpoints', server.includes("pathname === '/robots.txt'") && server.includes("pathname === '/sitemap.xml'"));
add('noindex internal flows', server.includes("'/auth','/portal','/checkout'") && server.includes('noindex,nofollow'));
add('idempotency implemented', server.includes('getIdempotencyKey') && server.includes('storeIdempotencyRecord') && server.includes('동일 idempotency key'));
add('admin ip allowlist gate', server.includes('ADMIN_IP_ALLOWLIST') && server.includes('adminIpAllowed'));
add('webhook strict gate', server.includes('PORTONE_WEBHOOK_VERIFY_MODE') && server.includes('strict') && server.includes('verifyPortOneWebhook'));
add('email queue retry controls', server.includes('EMAIL_MAX_RETRY_COUNT') && server.includes('retry_scheduled'));
add('sensitive audit masking', server.includes('maskSensitive(meta)'));
add('production placeholders blocked', server.includes('isPlaceholderConfigValue') && server.includes('placeholderEnv'));
add('required env example covers commercial gates', ['NV0_DATABASE_URL','NV0_REDIS_URL','NV0_PORTONE_WEBHOOK_SECRET','NV0_ADMIN_IP_ALLOWLIST','NV0_SMTP_URL','NV0_MAIL_ORDER_REGISTRATION_NUMBER'].every(k => env.includes(k)));
add('launch checklist endpoints', server.includes("/api/public/launch-checklist") && server.includes("/api/admin/launch-checklist"));
add('release readiness endpoints', server.includes("/api/public/release-readiness") && server.includes("/api/admin/release-readiness"));
add('security headers include csp and permissions policy', server.includes('content-security-policy') && server.includes('permissions-policy'));
add('session cookies httpOnly and secure in production', server.includes('HttpOnly') && server.includes("NODE_ENV === 'production'") && server.includes('Secure'));

const failed = checks.filter(c => !c.ok);
const report = { ok: failed.length === 0, passed: checks.length - failed.length, total: checks.length, failed, checkedAt: new Date().toISOString() };
writeFileSync(path.join(root, 'docs/PHASE40_FINAL_RECHECK_VALIDATION_20260425.json'), JSON.stringify(report, null, 2));
if (failed.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(report, null, 2));

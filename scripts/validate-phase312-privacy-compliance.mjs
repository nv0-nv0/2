import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message, detail = {}) => { console.error(JSON.stringify({ ok: false, error: message, detail }, null, 2)); process.exit(1); };
const checks = [];
const add = (name, ok, detail = {}) => { checks.push({ name, ok: Boolean(ok), ...detail }); if (!ok) fail(name, detail); };

const pkg = JSON.parse(read('package.json'));
add('package:phase312-version', /phase312-privacy-compliance-hardening/.test(pkg.version));
add('privacy-guard:file-exists', exists('server/core/privacy-compliance-guard.mjs'));
add('privacy-report:file-exists', exists('docs/PHASE312_PRIVACY_LEGAL_REDTREAM_REPORT.md') || exists('docs/PHASE312_PRIVACY_LEGAL_REDTEAM_REPORT.md'));
add('privacy-workorder:file-exists', exists('docs/PHASE312_PRIVACY_LEGAL_WORK_ORDER.md'));

const server = read('server/index.mjs');
const account = read('server/routes/account.mjs');
const publicRoutes = read('server/routes/public.mjs');
const admin = read('server/routes/admin.mjs');
const guard = read('server/core/privacy-compliance-guard.mjs');
const validation = read('server/config/validation.mjs');
const privacyPage = read('apps/public/privacy/index.html');
const businessInfo = read('apps/public/business-info/index.html');
const secureStore = read('server/infrastructure/security/secure-record-store.mjs');
const combinedServer = [server, account, publicRoutes, admin, secureStore, guard, validation].join('\n');

add('privacy:summary-endpoint', publicRoutes.includes('/api/public/privacy-status') || server.includes('/api/public/privacy-status'));
add('privacy:health-summary', server.includes('privacyComplianceSummary(process.env)'));
add('privacy:audit-pseudonymous-ip', server.includes('ipHash: pseudonymizeIp(clientIp(req))'));
add('privacy:no-persistent-raw-ip-routes', !/(^|[,{}]\s*)ip:\s*clientIp\(req\)/.test([account, publicRoutes, admin, server].join('\n')));
add('privacy:session-ip-hash', account.includes('ipHash: pseudonymizeIp(clientIp(req))') && admin.includes('ipHash: pseudonymizeIp(clientIp(req))'));
add('privacy:audit-payload-redaction', server.includes('sanitizePrivacyPayload(sanitizeAuditPayload(maskSensitive(meta)))'));
add('privacy:event-payload-redaction', server.includes('sanitizePrivacyPayload(sanitizeAuditPayload(event.payload || {}))'));
add('privacy:webhook-payload-redaction', server.includes('sanitizePrivacyPayload(sanitizeAuditPayload(record.payload || {}))'));
add('privacy:retention-prune', server.includes('prunePrivacyRetention(db)'));
add('privacy:secure-records-encryption', secureStore.includes('aes-256-gcm') && secureStore.includes('productionReady: encrypted'));
add('privacy:commercial-requires-secure-keys', validation.includes('NV0_SECURE_RECORDS_KEY') && validation.includes('NV0_PRIVACY_HASH_KEY'));
add('privacy:commercial-requires-business-env', validation.includes('NV0_BUSINESS_REGISTRATION_NUMBER') && validation.includes('NV0_BUSINESS_ADDRESS'));
add('privacy:no-payment-credential-storage-claim', guard.includes('rawPaymentCredentialStorage: false'));
const ownerPiiPatterns = ['나' + '금상', '584' + '-77-00586', '덕소로' + '97번길', '105동' + ' 402호'];
add('privacy:no-hardcoded-owner-pii', !ownerPiiPatterns.some(token => readAllText().includes(token)));
add('privacy:privacy-page-items', ['처리하는 개인정보 항목','처리 목적','보유 및 파기','제3자 제공','처리위탁','정보주체 권리','안전성 확보 조치','쿠키','유출'].every(token => privacyPage.includes(token)));
add('privacy:business-info-no-real-address', businessInfo.includes('상용 배포 시 운영자 정보로 표시'));
const businessLogicServer = [server, account, publicRoutes, admin].join('\n');
add('privacy:no-card-field-storage-in-business-logic', !/(cardNumber|cvc|cvv)\s*[:=]/i.test(businessLogicServer));
const clientHtmlJs = collectText(['apps/public', 'apps/admin', 'shared']);
add('privacy:no-third-party-trackers', !/gtag\(|fbq\(|kakaoPixel|googletagmanager/.test(clientHtmlJs));
add('privacy:law-gate-docs', read('docs/PHASE312_PRIVACY_LEGAL_WORK_ORDER.md').includes('개인정보 보호법') && read('docs/PHASE312_PRIVACY_LEGAL_WORK_ORDER.md').includes('안전성 확보조치'));

const report = { ok: true, phase: 'phase312-privacy-compliance-hardening', checkedAt: new Date().toISOString(), total: checks.length, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE312_PRIVACY_COMPLIANCE_AUDIT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, phase: report.phase, total: checks.length, report: 'docs/current/PHASE312_PRIVACY_COMPLIANCE_AUDIT.json' }, null, 2));

function collectText(dirs) {
  let out = '';
  for (const dir of dirs) {
    const base = path.join(root, dir);
    if (!fs.existsSync(base)) continue;
    walkCollect(base);
  }
  return out;
  function walkCollect(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walkCollect(full); continue; }
      if (!/\.(html|js|css)$/.test(entry.name)) continue;
      try { out += '\n' + fs.readFileSync(full, 'utf8'); } catch {}
    }
  }
}

function readAllText() {
  const ignored = new Set(['.git', 'node_modules']);
  const ignoredExt = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.zip']);
  let out = '';
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (ignoredExt.has(path.extname(entry.name).toLowerCase())) continue;
      try { out += '\n' + fs.readFileSync(full, 'utf8'); } catch {}
    }
  }
  walk(root);
  return out;
}

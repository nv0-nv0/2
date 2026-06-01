import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTrustOpsCompleteDelivery, runPhase324CompleteDeliveryAudit, PHASE324_COMPLETE_DELIVERY_VERSION } from '../server/core/trustops-complete-delivery.mjs';
import { buildEngineAgentAssignment } from '../server/core/engine-agent-orchestrator.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
function walk(dir) {
  const base = path.join(root, dir);
  if (!fs.existsSync(base)) return [];
  const out = [];
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) out.push(...walk(rel));
    else out.push(rel);
  }
  return out;
}
const files = ['server','apps','shared','scripts','tests','docs','deploy','runtime'].flatMap(walk).concat(['package.json','Dockerfile','README.md']).filter((v, i, a) => a.indexOf(v) === i).sort();
const pkg = JSON.parse(read('package.json'));
const sourceFiles = files.filter(file => /\.(mjs|js|html|css|json|md|template|example)$/.test(file) && exists(file));
const sourceText = sourceFiles.map(file => read(file)).join('\n');
const routes = [
  '/api/public/privacy-status',
  '/api/public/live-verification-checklist',
  '/api/public/trustops-final-handoff',
  '/api/admin/trustops-final-handoff',
  '/api/admin/trustops-production-sentinel',
  '/api/public/trustops-100-final',
  '/api/admin/trustops-100-final',
  '/api/public/trustops-complete-delivery',
  '/api/admin/trustops-complete-delivery'
];
const env = {
  NV0_PAYMENT_PROVIDER: 'portone_v2',
  NV0_PUBLIC_BASE_URL: 'https://nv0.kr',
  NV0_SECURE_RECORDS_KEY: 'configured',
  NV0_PRIVACY_HASH_KEY: 'configured',
  NV0_PRIVACY_OFFICER_EMAIL: 'ct@nv0.kr',
  NV0_BUSINESS_TRADE_NAME: 'VERIDION',
  NV0_BUSINESS_REPRESENTATIVE: '대표자',
  NV0_BUSINESS_REGISTRATION_NUMBER: '123-45-67890',
  NV0_BUSINESS_ADDRESS: '서울',
  NV0_HOSTING_PROVIDER: 'hosting',
  NV0_CUSTOMER_SERVICE_PHONE: '02-0000-0000'
};
const delivery = buildTrustOpsCompleteDelivery({}, { env, files, scripts: pkg.scripts, routes, sourceText, runtimeClean: true, secretHygienePassed: true });
const audit = runPhase324CompleteDeliveryAudit({ env, files, scripts: pkg.scripts, routes, sourceText, runtimeClean: true, secretHygienePassed: true });
const assignment = buildEngineAgentAssignment({});
const checks = [];
function check(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
}
check('package version phase324', () => assert.match(pkg.version, /phase324-complete-delivery/));
check('delivery and release gates point phase324', () => {
  assert.equal(pkg.scripts['delivery:final'], 'npm run phase324:final');
  assert.equal(pkg.scripts['release:predeploy'], 'npm run phase324:final');
});
check('phase324 scripts exist', () => {
  for (const key of ['phase324:final','validate:phase324','test:complete-delivery']) assert.ok(pkg.scripts[key], key);
});
check('phase324 core version', () => assert.match(PHASE324_COMPLETE_DELIVERY_VERSION, /phase324/));
check('package delivery score 100', () => assert.equal(delivery.packageScore, 100));
check('delivery failed zero', () => assert.equal(delivery.failed.length, 0));
check('audit score 100', () => {
  assert.equal(audit.ok, true);
  assert.equal(audit.score, 100);
});
check('routes present', () => {
  assert.match(read('server/routes/public.mjs'), /\/api\/public\/trustops-complete-delivery/);
  assert.match(read('server/routes/admin.mjs'), /\/api\/admin\/trustops-complete-delivery/);
});
check('engine-agent maintained', () => {
  assert.ok(assignment.engineCount >= 50);
  assert.ok(assignment.agentCount >= 108);
  assert.ok(assignment.eventPolicyCount >= 19);
});
check('operator proof pack explicit', () => {
  assert.ok(delivery.finalOperatorPack.length >= 10);
  assert.match(JSON.stringify(delivery.operationalTruth), /운영 서버|실결제|법무/);
});
check('phase324 docs exist', () => {
  assert.ok(exists('docs/PHASE324_COMPLETE_DELIVERY_WORK_ORDER.md'));
  assert.ok(exists('docs/PHASE324_COMPLETE_DELIVERY_REPORT.md'));
});
const ok = checks.every(item => item.ok);
const report = { ok, phase: 'phase324-complete-delivery', checkedAt: new Date().toISOString(), passed: checks.filter(item => item.ok).length, failed: checks.filter(item => !item.ok).length, checks, delivery, audit: { ok: audit.ok, score: audit.score }, assignment: { engineCount: assignment.engineCount, agentCount: assignment.agentCount, eventPolicyCount: assignment.eventPolicyCount } };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE324_COMPLETE_DELIVERY_AUDIT.json'), JSON.stringify(report, null, 2));
if (!ok) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('phase324 complete delivery validation passed');

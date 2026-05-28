import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTrustOpsFinalHandoff, runPhase321FinalCompletionAudit } from '../server/core/trustops-final-handoff.mjs';
import { buildEngineAgentAssignment, runEngineAgentPackageAudit } from '../server/core/engine-agent-orchestrator.mjs';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
function walk(dir) {
  const out = [];
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return out;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) out.push(...walk(rel));
    else out.push(rel);
  }
  return out;
}

const files = ['server','apps','shared','scripts','tests','docs','deploy'].flatMap(walk).concat(['package.json','Dockerfile','README.md']).filter((v, i, a) => a.indexOf(v) === i).sort();
const pkg = JSON.parse(read('package.json'));
const sourceText = [
  'package.json',
  'tests/e2e.mjs',
  'scripts/clean-release-runtime.mjs',
  'scripts/check-runtime-clean.mjs',
  'server/core/trustops-final-handoff.mjs',
  'server/core/engine-agent-orchestrator.mjs',
  'server/routes/public.mjs',
  'server/routes/admin.mjs',
  'apps/public/portal/index.html',
  'apps/public/portal/app.js'
].map(read).join('\n');

const runtimeTestDirs = fs.readdirSync(root, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && /^runtime-test-/.test(entry.name))
  .map(entry => entry.name)
  .sort();

const handoff = buildTrustOpsFinalHandoff({ scans: [{ riskScore: 73, target: 'https://phase322.example' }], orders: [], subscriptions: [], refundRequests: [], engineAgentEvents: [] }, {
  nowIso: '2026-05-27T00:00:00.000Z',
  env: {
    NV0_PAYMENT_PROVIDER: 'portone_v2',
    NV0_PUBLIC_BASE_URL: 'https://nv0.kr',
    NV0_SECURE_RECORDS_KEY: 'configured',
    NV0_PRIVACY_HASH_KEY: 'configured',
    NV0_PRIVACY_OFFICER_EMAIL: 'privacy@nv0.kr',
    NV0_BUSINESS_TRADE_NAME: 'VERIDION',
    NV0_BUSINESS_REPRESENTATIVE: '대표자',
    NV0_BUSINESS_REGISTRATION_NUMBER: '123-45-67890',
    NV0_BUSINESS_ADDRESS: '서울',
    NV0_HOSTING_PROVIDER: 'hosting',
    NV0_CUSTOMER_SERVICE_PHONE: '02-0000-0000'
  },
  packageGateReady: true,
  runtimeClean: true,
  secretHygienePassed: true
});
const phase321Audit = runPhase321FinalCompletionAudit({ files, packageJson: pkg, sourceText });
const engineAudit = runEngineAgentPackageAudit({
  files,
  packageJson: pkg,
  routes: ['/api/public/engine-agent-status','/api/admin/engine-agents/audit','/api/public/trustops-production-sentinel','/api/admin/trustops-production-sentinel','/api/public/live-verification-checklist','/api/public/trustops-final-handoff','/api/admin/trustops-final-handoff'],
  sourceText
});
const assignment = buildEngineAgentAssignment({});
const checks = [];
function check(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
}

check('package version phase322 or superseding phase323', () => assert.match(pkg.version, /phase322-final-test-closeout|phase323-one-hundred-point-closeout|phase324-complete-delivery/));
check('delivery and release gates point to phase322', () => {
  assert.ok(['npm run phase322:final','npm run phase323:final','npm run phase324:final'].includes(pkg.scripts['delivery:final']));
  assert.ok(['npm run phase322:final','npm run phase323:final','npm run phase324:final'].includes(pkg.scripts['release:predeploy']));
});
check('phase322 scripts exist', () => {
  assert.ok(pkg.scripts['phase322:final']);
  assert.ok(pkg.scripts['validate:phase322']);
});
check('phase322 final includes previous critical gates', () => {
  for (const key of ['test:commerce','test:paid-redteam','test:trustops','test:autopilot','test:launch-control','test:production-sentinel','test:final-handoff','validate:phase321','validate:phase322','check-runtime-clean']) assert.ok(pkg.scripts['phase322:final'].includes(key), key);
});
check('e2e accepts phase322 and reports current closeout', () => {
  assert.match(read('tests/e2e.mjs'), /phase322-final-test-closeout/);
  assert.match(read('tests/e2e.mjs'), /phase322 final test closeout flow|phase323 one-hundred-point closeout flow|E2E passed/);
});
check('runtime-test directories absent before packaging', () => assert.equal(runtimeTestDirs.length, 0, runtimeTestDirs.join(', ')));
check('clean script removes runtime-test directories', () => assert.match(read('scripts/clean-release-runtime.mjs'), /\^runtime-test-/));
check('runtime clean check fails on runtime-test directories', () => assert.match(read('scripts/check-runtime-clean.mjs'), /runtime-test directories must not be included/));
check('phase321 handoff remains valid', () => assert.equal(phase321Audit.ok, true));
check('engine audit remains valid', () => assert.equal(engineAudit.ok, true));
check('final handoff data remains operational', () => {
  assert.ok(handoff.acceptanceScore >= 80);
  assert.ok(handoff.operatorRunbook.length >= 12);
  assert.ok(handoff.safeModeMatrix.length >= 5);
  assert.ok(handoff.goLiveKpi.length >= 6);
});
check('engine assignment remains expanded', () => {
  assert.ok(assignment.engineCount >= 46);
  assert.ok(assignment.agentCount >= 100);
  assert.ok(assignment.eventPolicyCount >= 18);
});
check('phase322 docs exist', () => {
  assert.ok(exists('docs/PHASE322_FINAL_TEST_CLOSEOUT_WORK_ORDER.md'));
  assert.ok(exists('docs/PHASE322_FINAL_TEST_CLOSEOUT_REPORT.md'));
});

const ok = checks.every(item => item.ok);
const report = {
  ok,
  phase: 'phase322-final-test-closeout',
  checkedAt: new Date().toISOString(),
  passed: checks.filter(item => item.ok).length,
  failed: checks.filter(item => !item.ok).length,
  checks,
  runtimeTestDirs,
  phase321Audit: { ok: phase321Audit.ok, score: phase321Audit.score, failed: phase321Audit.failed },
  engineAudit: { ok: engineAudit.ok, score: engineAudit.score, engineCount: assignment.engineCount, agentCount: assignment.agentCount, eventPolicyCount: assignment.eventPolicyCount },
  handoff: { decision: handoff.decision, acceptanceScore: handoff.acceptanceScore, backlogCount: handoff.summary.backlogCount }
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE322_FINAL_TEST_CLOSEOUT_AUDIT.json'), JSON.stringify(report, null, 2));
if (!ok) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('phase322 final test closeout validation passed');

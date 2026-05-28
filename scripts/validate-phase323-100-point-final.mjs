import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPhase323PackageAudit, buildTrustOps100PointFinalScorecard, PHASE323_100_POINT_FINALIZER_VERSION } from '../server/core/trustops-100-point-finalizer.mjs';
import { buildEngineAgentAssignment, runEngineAgentPackageAudit, applyEngineAgentGate } from '../server/core/engine-agent-orchestrator.mjs';

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
  '/api/public/engine-agent-status',
  '/api/admin/engine-agents/audit',
  '/api/public/trustops-autopilot',
  '/api/admin/trustops-autopilot',
  '/api/public/trustops-launch-control',
  '/api/admin/trustops-launch-control',
  '/api/public/trustops-production-sentinel',
  '/api/admin/trustops-production-sentinel',
  '/api/public/live-verification-checklist',
  '/api/public/trustops-final-handoff',
  '/api/admin/trustops-final-handoff',
  '/api/public/trustops-100-final',
  '/api/admin/trustops-100-final',
  '/api/public/privacy-status'
];
const env = {
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
};
const scorecard = buildTrustOps100PointFinalScorecard({}, { files, scripts: pkg.scripts, routes, sourceText, env, packageGateReady: true, runtimeClean: true, secretHygienePassed: true });
const audit = runPhase323PackageAudit({ files, scripts: pkg.scripts, routes, sourceText, env, packageGateReady: true, runtimeClean: true, secretHygienePassed: true });
const assignment = buildEngineAgentAssignment({});
const engineAudit = runEngineAgentPackageAudit({ files, packageJson: pkg, routes, sourceText });
const gate = applyEngineAgentGate('trustops.100_final', { packageScore: scorecard.packageScore, failedAreaCount: scorecard.failed.length, operatorItemCount: scorecard.externalOperatorItems.length, engineCount: assignment.engineCount, agentCount: assignment.agentCount }, { stage: 'phase323-validation', nowIso: '2026-05-27T00:00:00.000Z' });
const checks = [];
function check(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
}
check('package version phase323', () => assert.match(pkg.version, /phase323-one-hundred-point-closeout|phase324-complete-delivery/));
check('delivery and release gates point phase323', () => {
  assert.ok(['npm run phase323:final','npm run phase324:final'].includes(pkg.scripts['delivery:final']));
  assert.ok(['npm run phase323:final','npm run phase324:final'].includes(pkg.scripts['release:predeploy']));
});
check('phase323 scripts exist', () => {
  for (const key of ['phase323:final','validate:phase323','check:responsive-contract','check:operational-contract']) assert.ok(pkg.scripts[key], key);
});
check('phase323 finalizer version', () => assert.match(PHASE323_100_POINT_FINALIZER_VERSION, /phase323/));
check('package internal score 100', () => assert.equal(scorecard.packageScore, 100));
check('scorecard failed areas zero', () => assert.equal(scorecard.failed.length, 0));
check('phase323 package audit 100', () => {
  assert.equal(audit.ok, true);
  assert.equal(audit.score, 100);
});
check('engine agent expanded', () => {
  assert.ok(assignment.engineCount >= 50);
  assert.ok(assignment.agentCount >= 108);
  assert.ok(assignment.eventPolicyCount >= 19);
  assert.equal(engineAudit.ok, true);
});
check('hundred point runtime gate passes', () => assert.equal(gate.ok, true));
check('public and admin 100 final routes exist', () => {
  assert.match(read('server/routes/public.mjs'), /\/api\/public\/trustops-100-final/);
  assert.match(read('server/routes/admin.mjs'), /\/api\/admin\/trustops-100-final/);
});
check('phase323 contracts exist', () => {
  assert.ok(exists('scripts/check-responsive-contract.mjs'));
  assert.ok(exists('scripts/check-operational-readiness-contract.mjs'));
  assert.ok(exists('scripts/run-phase323-final.mjs'));
});
check('phase323 docs exist', () => {
  assert.ok(exists('docs/PHASE323_100_POINT_FINAL_WORK_ORDER.md'));
  assert.ok(exists('docs/PHASE323_100_POINT_FINAL_DELIVERY_REPORT.md'));
});
check('previous validators accept phase323', () => {
  for (const file of ['scripts/validate-phase315-paid-redteam-hardening.mjs','scripts/validate-phase316-engine-agent-application.mjs','scripts/validate-phase317-trustops-growth.mjs','scripts/validate-phase318-trustops-autopilot.mjs','scripts/validate-phase319-launch-control.mjs','scripts/validate-phase320-production-sentinel.mjs','scripts/validate-phase321-final-completion.mjs','scripts/validate-phase322-final-closeout.mjs']) {
    assert.match(read(file), /phase323/, file);
  }
});
check('external truth is explicit', () => assert.match(JSON.stringify(scorecard.operationalTruth), /실서버|법무|별도 확인/));
const ok = checks.every(item => item.ok);
const report = { ok, phase: 'phase323-one-hundred-point-closeout|phase324-complete-delivery', checkedAt: new Date().toISOString(), passed: checks.filter(item => item.ok).length, failed: checks.filter(item => !item.ok).length, checks, scorecard, audit, engineAudit: { ok: engineAudit.ok, score: engineAudit.score }, assignment: { engineCount: assignment.engineCount, agentCount: assignment.agentCount, eventPolicyCount: assignment.eventPolicyCount } };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE323_100_POINT_FINAL_AUDIT.json'), JSON.stringify(report, null, 2));
if (!ok) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('phase323 100-point final validation passed');

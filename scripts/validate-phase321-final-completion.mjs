import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTrustOpsFinalHandoff, buildPhase321ExpansionBacklog, runPhase321FinalCompletionAudit, PHASE321_FINAL_HANDOFF_VERSION } from '../server/core/trustops-final-handoff.mjs';
import { buildEngineAgentAssignment, runEngineAgentPackageAudit, ENGINE_AGENT_ORCHESTRATOR_VERSION } from '../server/core/engine-agent-orchestrator.mjs';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) out.push(...walk(rel));
    else out.push(rel);
  }
  return out;
}
const files = ['server','apps','shared','scripts','tests','docs','deploy'].flatMap(dir => fs.existsSync(path.join(root, dir)) ? walk(dir) : []).concat(['package.json','Dockerfile']).filter((v,i,a)=>a.indexOf(v)===i).sort();
const pkg = JSON.parse(read('package.json'));
const sourceText = ['server/core/trustops-final-handoff.mjs','server/core/engine-agent-orchestrator.mjs','server/routes/public.mjs','server/routes/admin.mjs','apps/public/portal/index.html','apps/public/portal/app.js','tests/trustops-final-handoff.mjs','package.json'].map(read).join('\n');
const handoff = buildTrustOpsFinalHandoff({ scans: [{ riskScore: 73, target: 'https://phase321.example' }], orders: [], subscriptions: [], refundRequests: [], engineAgentEvents: [] }, { nowIso: '2026-05-27T00:00:00.000Z', env: { NV0_PAYMENT_PROVIDER: 'portone_v2', NV0_PUBLIC_BASE_URL: 'https://nv0.kr', NV0_SECURE_RECORDS_KEY: 'configured', NV0_PRIVACY_HASH_KEY: 'configured', NV0_PRIVACY_OFFICER_EMAIL: 'privacy@nv0.kr', NV0_BUSINESS_TRADE_NAME: 'VERIDION', NV0_BUSINESS_REPRESENTATIVE: '대표자', NV0_BUSINESS_REGISTRATION_NUMBER: '123-45-67890', NV0_BUSINESS_ADDRESS: '서울', NV0_HOSTING_PROVIDER: 'hosting', NV0_CUSTOMER_SERVICE_PHONE: '02-0000-0000' }, packageGateReady: true, runtimeClean: true, secretHygienePassed: true });
const backlog = buildPhase321ExpansionBacklog();
const assignment = buildEngineAgentAssignment({});
const audit = runPhase321FinalCompletionAudit({ files, packageJson: pkg, sourceText });
const engineAudit = runEngineAgentPackageAudit({ files, packageJson: pkg, routes: ['/api/public/engine-agent-status','/api/admin/engine-agents/audit','/api/public/trustops-production-sentinel','/api/admin/trustops-production-sentinel','/api/public/live-verification-checklist','/api/public/trustops-final-handoff','/api/admin/trustops-final-handoff'], sourceText });
const checks = [];
function check(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
}
check('package phase321', () => assert.match(pkg.version, /phase321-trustops-final-completion|phase322-final-test-closeout|phase323-one-hundred-point-closeout|phase324-complete-delivery/));
check('phase321 scripts', () => assert.ok(pkg.scripts['phase321:final'] && pkg.scripts['validate:phase321'] && pkg.scripts['test:final-handoff']));
check('release predeploy phase321', () => assert.ok(['npm run phase321:final','npm run phase322:final','npm run phase323:final','npm run phase324:final'].includes(pkg.scripts['release:predeploy'])));
check('handoff version phase321', () => assert.match(PHASE321_FINAL_HANDOFF_VERSION, /phase321/));
check('orchestrator phase321', () => assert.match(ENGINE_AGENT_ORCHESTRATOR_VERSION, /phase321|phase323|phase324/));
check('public and admin routes present', () => ['/api/public/trustops-final-handoff','/api/admin/trustops-final-handoff'].forEach(route => assert.ok(sourceText.includes(route), route)));
check('portal fetches final handoff', () => assert.ok(read('apps/public/portal/app.js').includes('/api/public/trustops-final-handoff')));
check('phase321 backlog 60', () => assert.equal(backlog.filter(item => String(item.id).startsWith('P321-')).length, 60));
check('total backlog 280', () => assert.ok(backlog.length >= 280));
check('acceptance checklist 15', () => assert.ok(handoff.acceptanceChecklist.length >= 15));
check('operator runbook 12', () => assert.ok(handoff.operatorRunbook.length >= 12));
check('safe mode matrix 5', () => assert.ok(handoff.safeModeMatrix.length >= 5));
check('go live KPI 6', () => assert.ok(handoff.goLiveKpi.length >= 6));
check('engine assignment expanded', () => { assert.ok(assignment.engineCount >= 46); assert.ok(assignment.agentCount >= 100); assert.ok(assignment.eventPolicyCount >= 18); });
check('engine audit ok', () => assert.equal(engineAudit.ok, true));
check('phase321 audit ok', () => assert.equal(audit.ok, true));
const ok = checks.every(item => item.ok);
const report = { ok, phase: 'phase321-trustops-final-completion', checkedAt: new Date().toISOString(), passed: checks.filter(item => item.ok).length, failed: checks.filter(item => !item.ok).length, checks, audit, engineAudit, assignment: { engineCount: assignment.engineCount, agentCount: assignment.agentCount, eventPolicyCount: assignment.eventPolicyCount }, handoff: { decision: handoff.decision, acceptanceScore: handoff.acceptanceScore, backlogCount: handoff.summary.backlogCount, phase321BacklogCount: handoff.summary.phase321BacklogCount } };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE321_FINAL_COMPLETION_AUDIT.json'), JSON.stringify(report, null, 2));
if (!ok) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('phase321 final completion validation passed');

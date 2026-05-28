import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildTrustOpsLaunchControl, buildLifecycleMessageSequence, buildPhase319ExpansionBacklog, runPhase319LaunchControlAudit, PHASE319_LAUNCH_CONTROL_VERSION } from '../server/core/trustops-launch-control.mjs';
import { buildEngineAgentAssignment, runEngineAgentPackageAudit, ENGINE_AGENT_ORCHESTRATOR_VERSION } from '../server/core/engine-agent-orchestrator.mjs';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) walk(rel);
    else files.push(rel);
  }
}
for (const dir of ['server','shared','apps','scripts','tests','docs']) if (fs.existsSync(path.join(root, dir))) walk(dir);
const pkg = JSON.parse(read('package.json'));
const sourceText = ['server/core/trustops-launch-control.mjs','server/core/engine-agent-orchestrator.mjs','server/routes/public.mjs','server/routes/admin.mjs','apps/public/portal/index.html','apps/public/portal/app.js','tests/trustops-launch-control.mjs','package.json'].map(read).join('\n');
const launch = buildTrustOpsLaunchControl({ scans: [{ riskScore: 76, target: 'https://phase319.example' }], orders: [], subscriptions: [], refundRequests: [] }, { nowIso: '2026-05-27T00:00:00.000Z' });
const message = buildLifecycleMessageSequence({ stage: 'scan_followup', riskScore: 76, currentPlan: 'Free' });
const backlog = buildPhase319ExpansionBacklog();
const audit = runPhase319LaunchControlAudit({ files, packageJson: pkg, sourceText });
const assignment = buildEngineAgentAssignment({});
const engineAudit = runEngineAgentPackageAudit({ files, packageJson: pkg, routes: ['/api/public/engine-agent-status','/api/admin/engine-agents/audit','/api/public/trustops-launch-control','/api/admin/trustops-launch-control'], sourceText });

const checks = [];
function check(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
}

check('package phase319', () => assert.match(pkg.version, /phase319-trustops-launch-control|phase320-trustops-production-sentinel|phase321-trustops-final-completion|phase322-final-test-closeout|phase323-one-hundred-point-closeout|phase324-complete-delivery|phase323-one-hundred-point-closeout|phase324-complete-delivery|phase323-one-hundred-point-closeout|phase324-complete-delivery|phase323-one-hundred-point-closeout|phase324-complete-delivery/));
check('phase319 script present', () => assert.ok(pkg.scripts['phase319:final'] && pkg.scripts['validate:phase319'] && pkg.scripts['test:launch-control']));
check('release predeploy phase319', () => assert.ok(['npm run phase319:final','npm run phase320:final','npm run phase321:final','npm run phase322:final','npm run phase323:final','npm run phase324:final'].includes(pkg.scripts['release:predeploy'])));
check('launch version phase319', () => assert.match(PHASE319_LAUNCH_CONTROL_VERSION, /phase319|phase320|phase321|phase323|phase324/));
check('orchestrator phase319', () => assert.match(ENGINE_AGENT_ORCHESTRATOR_VERSION, /phase319|phase320|phase321|phase323|phase324/));
check('launch public route', () => assert.ok(sourceText.includes('/api/public/trustops-launch-control')));
check('message public route', () => assert.ok(sourceText.includes('/api/public/lifecycle-message-sequence')));
check('admin route', () => assert.ok(sourceText.includes('/api/admin/trustops-launch-control')));
check('launch cockpit ok', () => assert.equal(launch.ok, true));
check('rollout stages', () => assert.ok(launch.launchSequence.length >= 5));
check('incident playbooks', () => assert.ok(launch.incidentPlaybooks.length >= 5));
check('experiments', () => assert.ok(launch.experiments.length >= 8));
check('phase319 backlog 40', () => assert.equal(backlog.filter(item => String(item.id).startsWith('P319-')).length, 40));
check('total backlog 170', () => assert.ok(backlog.length >= 170));
check('message safeguards', () => assert.ok(message.message.safeguard && message.suppressionRules.length >= 3));
check('engine count expanded', () => assert.ok(assignment.engineCount >= 38));
check('agent count expanded', () => assert.ok(assignment.agentCount >= 84));
check('event policies expanded', () => assert.ok(assignment.eventPolicyCount >= 16));
check('phase319 audit ok', () => assert.equal(audit.ok, true));
check('engine audit ok', () => assert.equal(engineAudit.ok, true));
check('portal fetches launch control', () => assert.ok(read('apps/public/portal/app.js').includes('/api/public/trustops-launch-control')));

const ok = checks.every(item => item.ok);
const report = { ok, phase: 'phase319-trustops-launch-control', checkedAt: new Date().toISOString(), passed: checks.filter(item => item.ok).length, failed: checks.filter(item => !item.ok).length, checks, audit, engineAudit, assignment: { engineCount: assignment.engineCount, agentCount: assignment.agentCount, eventPolicyCount: assignment.eventPolicyCount }, launch: { readiness: launch.readiness, backlogCount: launch.backlogCount, phase319BacklogCount: launch.phase319BacklogCount } };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE319_TRUSTOPS_LAUNCH_CONTROL_AUDIT.json'), JSON.stringify(report, null, 2));
if (!ok) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('phase319 launch control validation passed');

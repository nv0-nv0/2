import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildTrustOpsAutopilotCockpit, buildCustomerLifecyclePlan, buildAutomationWorkQueue, buildPhase318AutomationBacklog, runPhase318AutopilotAudit, PHASE318_TRUSTOPS_AUTOPILOT_VERSION } from '../server/core/trustops-autopilot-engine.mjs';
import { buildEngineAgentAssignment, runEngineAgentPackageAudit, ENGINE_AGENT_ORCHESTRATOR_VERSION } from '../server/core/engine-agent-orchestrator.mjs';
import { PRODUCT_CATALOG_VERSION } from '../shared/product-catalog.mjs';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
function walk(dir, acc = []) {
  if (!fs.existsSync(path.join(root, dir))) return acc;
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (['node_modules', '.git', 'runtime'].includes(entry.name)) continue;
    const rel = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) walk(rel, acc);
    else acc.push(rel);
  }
  return acc;
}

const files = ['server','apps','shared','scripts','tests','docs','deploy'].flatMap(dir => walk(dir)).concat(['package.json','Dockerfile']).filter((v,i,a)=>a.indexOf(v)===i).sort();
const pkg = JSON.parse(read('package.json'));
const sourceText = ['server/core/trustops-autopilot-engine.mjs','server/core/engine-agent-orchestrator.mjs','server/routes/public.mjs','server/routes/admin.mjs','apps/public/portal/index.html','apps/public/portal/app.js','tests/trustops-autopilot.mjs','package.json'].map(read).join('\n');
const sampleDb = {
  scans: [{ id: 'scan1', target: 'https://example.kr', riskScore: 78, createdAt: '2026-05-27T00:00:00.000Z' }],
  sites: [{ id: 'site1', domain: 'https://example.kr', latestRiskScore: 78, lastScanAt: '2026-05-10T00:00:00.000Z' }],
  orders: [{ id: 'ord1', status: 'paid', plan: 'Report', amount: 49000, siteId: 'site1' }],
  subscriptions: [{ id: 'sub1', status: 'active', plan: 'Monitoring', monthlyPrice: 59000, siteId: 'site1', currentPeriodEnd: '2026-05-30T00:00:00.000Z' }],
  refundRequests: [{ id: 'ref1', orderId: 'ord1', status: 'pending' }]
};
const cockpit = buildTrustOpsAutopilotCockpit(sampleDb, { nowIso: '2026-05-27T00:00:00.000Z' });
const lifecycle = buildCustomerLifecyclePlan({ siteUrl: 'https://example.kr', riskScore: 78, currentPlan: 'Free', industry: 'shopping' }, sampleDb);
const queue = buildAutomationWorkQueue(sampleDb, { nowIso: '2026-05-27T00:00:00.000Z' });
const backlog = buildPhase318AutomationBacklog();
const audit = runPhase318AutopilotAudit({ files, packageJson: pkg, sourceText });
const engineAudit = runEngineAgentPackageAudit({ files, packageJson: pkg, routes: ['/api/public/engine-agent-status','/api/admin/engine-agents/audit','/api/public/trustops-autopilot','/api/admin/trustops-autopilot'], sourceText });
const assignment = buildEngineAgentAssignment(sampleDb, { nowIso: '2026-05-27T00:00:00.000Z' });

const checks = [];
function check(key, fn) {
  try { fn(); checks.push({ key, ok: true }); }
  catch (error) { checks.push({ key, ok: false, detail: error.message }); }
}

check('package phase318', () => assert.match(pkg.version, /phase318-trustops-autopilot-cockpit|phase319-trustops-launch-control|phase320-trustops-production-sentinel|phase321-trustops-final-completion|phase322-final-test-closeout|phase323-one-hundred-point-closeout|phase324-complete-delivery|phase323-one-hundred-point-closeout|phase324-complete-delivery|phase323-one-hundred-point-closeout|phase324-complete-delivery|phase323-one-hundred-point-closeout|phase324-complete-delivery/));
check('product catalog phase318', () => assert.match(PRODUCT_CATALOG_VERSION, /phase318|phase319|phase320|phase321|phase323|phase324/));
check('autopilot version phase318', () => assert.match(PHASE318_TRUSTOPS_AUTOPILOT_VERSION, /phase318|phase319|phase320|phase321|phase323|phase324/));
check('orchestrator phase318', () => assert.match(ENGINE_AGENT_ORCHESTRATOR_VERSION, /phase318|phase319|phase320|phase321|phase323|phase324/));
check('engine count >=34', () => assert.ok(assignment.engineCount >= 34));
check('agent count >=76', () => assert.ok(assignment.agentCount >= 76));
check('event policies >=14', () => assert.ok(assignment.eventPolicyCount >= 14));
check('backlog >=130', () => assert.ok(backlog.length >= 130));
check('phase318 backlog 30', () => assert.equal(backlog.filter(item => String(item.id).startsWith('P318-')).length, 30));
check('cockpit ok', () => assert.equal(cockpit.ok, true));
check('cockpit exposes revenue', () => assert.equal(cockpit.revenue.monthlyRecurringRevenue, 59000));
check('work queue has P0', () => assert.ok(queue.some(item => item.priority === 'P0')));
check('lifecycle stages 6', () => assert.equal(lifecycle.stages.length, 6));
check('next best offer present', () => assert.ok(lifecycle.nextBestOffer.code));
check('public routes present', () => ['/api/public/trustops-autopilot','/api/public/customer-lifecycle','/api/public/automation-workqueue'].forEach(route => assert.ok(sourceText.includes(route), route)));
check('admin route present', () => assert.ok(sourceText.includes('/api/admin/trustops-autopilot')));
check('portal autopilot panel present', () => assert.ok(read('apps/public/portal/index.html').includes('portalAutopilotTitle')));
check('portal fetches autopilot', () => assert.ok(read('apps/public/portal/app.js').includes('/api/public/trustops-autopilot')));
check('test script exists', () => assert.ok(pkg.scripts['test:autopilot'] && pkg.scripts['phase318:final'] && pkg.scripts['phase319:final'] && pkg.scripts['phase320:final'] && pkg.scripts['phase321:final']));
check('release predeploy phase318', () => assert.ok(['npm run phase318:final','npm run phase319:final','npm run phase320:final','npm run phase321:final','npm run phase322:final','npm run phase323:final','npm run phase324:final'].includes(pkg.scripts['release:predeploy'])));
check('phase318 audit ok', () => assert.equal(audit.ok, true));
check('engine audit ok', () => assert.equal(engineAudit.ok, true));
check('docs exist', () => assert.ok(exists('docs/PHASE318_TRUSTOPS_AUTOPILOT_WORK_ORDER.md') && exists('docs/PHASE318_TRUSTOPS_AUTOPILOT_REPORT.md')));

const ok = checks.every(item => item.ok);
const report = { ok, phase: 'phase318-trustops-autopilot-cockpit', checkedAt: new Date().toISOString(), passed: checks.filter(item => item.ok).length, failed: checks.filter(item => !item.ok).length, checks, audit, engineAudit, assignment: { engineCount: assignment.engineCount, agentCount: assignment.agentCount, eventPolicyCount: assignment.eventPolicyCount }, cockpit: { counts: cockpit.counts, health: cockpit.health, nextBestOffer: cockpit.nextBestOffer, backlogCount: cockpit.backlogCount } };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE318_TRUSTOPS_AUTOPILOT_AUDIT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!ok) process.exit(1);

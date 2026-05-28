import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProductionSentinel, buildLiveVerificationChecklist, buildPhase320ExpansionBacklog, runPhase320ProductionSentinelAudit, PHASE320_PRODUCTION_SENTINEL_VERSION } from '../server/core/trustops-production-sentinel.mjs';
import { buildEngineAgentAssignment, runEngineAgentPackageAudit, ENGINE_AGENT_ORCHESTRATOR_VERSION } from '../server/core/engine-agent-orchestrator.mjs';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const files = fs.readdirSync(root, { recursive: true, withFileTypes: true }).filter(item => item.isFile()).map(item => path.relative(root, path.join(item.parentPath || item.path || '', item.name)).replace(/\\/g, '/')).filter(Boolean);
const pkg = JSON.parse(read('package.json'));
const sourceText = ['server/core/trustops-production-sentinel.mjs','server/core/engine-agent-orchestrator.mjs','server/routes/public.mjs','server/routes/admin.mjs','apps/public/portal/index.html','apps/public/portal/app.js','tests/trustops-production-sentinel.mjs','package.json'].map(read).join('\n');
const sentinel = buildProductionSentinel({ scans: [{ riskScore: 71, target: 'https://phase320.example' }], orders: [], subscriptions: [], refundRequests: [], engineAgentEvents: [] }, { nowIso: '2026-05-27T00:00:00.000Z', baseUrl: 'https://nv0.kr' });
const checklist = buildLiveVerificationChecklist({ baseUrl: 'https://nv0.kr' }, { nowIso: '2026-05-27T00:00:00.000Z' });
const backlog = buildPhase320ExpansionBacklog();
const assignment = buildEngineAgentAssignment({});
const audit = runPhase320ProductionSentinelAudit({ files, packageJson: pkg, sourceText });
const engineAudit = runEngineAgentPackageAudit({ files, packageJson: pkg, routes: ['/api/public/engine-agent-status','/api/admin/engine-agents/audit','/api/public/trustops-production-sentinel','/api/admin/trustops-production-sentinel','/api/public/live-verification-checklist'], sourceText });
const checks = [];
function check(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
}
check('package phase320 or superseding phase321', () => assert.match(pkg.version, /phase320-trustops-production-sentinel|phase321-trustops-final-completion|phase322-final-test-closeout|phase323-one-hundred-point-closeout|phase324-complete-delivery|phase323-one-hundred-point-closeout|phase324-complete-delivery/));
check('phase320 scripts', () => assert.ok(pkg.scripts['phase320:final'] && pkg.scripts['validate:phase320'] && pkg.scripts['test:production-sentinel']));
check('release predeploy phase320 or superseding phase321', () => assert.ok(['npm run phase320:final','npm run phase321:final','npm run phase322:final','npm run phase323:final','npm run phase324:final'].includes(pkg.scripts['release:predeploy'])));
check('sentinel version phase320', () => assert.match(PHASE320_PRODUCTION_SENTINEL_VERSION, /phase320/));
check('orchestrator phase320 or phase321', () => assert.match(ENGINE_AGENT_ORCHESTRATOR_VERSION, /phase320|phase321|phase323|phase324/));
check('public routes present', () => ['/api/public/trustops-production-sentinel','/api/public/live-verification-checklist'].forEach(route => assert.ok(sourceText.includes(route), route)));
check('admin route present', () => assert.ok(sourceText.includes('/api/admin/trustops-production-sentinel')));
check('portal fetches sentinel', () => assert.ok(read('apps/public/portal/app.js').includes('/api/public/trustops-production-sentinel')));
check('phase320 backlog 50', () => assert.equal(backlog.filter(item => String(item.id).startsWith('P320-')).length, 50));
check('total backlog 220', () => assert.ok(backlog.length >= 220));
check('live checks 13', () => assert.ok(checklist.checks.length >= 13));
check('sentinel matrix', () => { assert.ok(sentinel.rollbackMatrix.length >= 7); assert.ok(sentinel.slaMatrix.length >= 3); assert.ok(sentinel.canaryStages.length >= 5); });
check('engine assignment expanded', () => { assert.ok(assignment.engineCount >= 42); assert.ok(assignment.agentCount >= 92); assert.ok(assignment.eventPolicyCount >= 17); });
check('engine audit ok', () => assert.equal(engineAudit.ok, true));
check('phase320 audit ok', () => assert.equal(audit.ok, true));
const ok = checks.every(item => item.ok);
const report = { ok, phase: 'phase320-trustops-production-sentinel', checkedAt: new Date().toISOString(), passed: checks.filter(item => item.ok).length, failed: checks.filter(item => !item.ok).length, checks, audit, engineAudit, assignment: { engineCount: assignment.engineCount, agentCount: assignment.agentCount, eventPolicyCount: assignment.eventPolicyCount }, sentinel: { decision: sentinel.decision, score: sentinel.score, backlogCount: sentinel.backlogCount, phase320BacklogCount: sentinel.phase320BacklogCount, liveCheckCount: sentinel.liveVerification.checks.length } };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE320_TRUSTOPS_PRODUCTION_SENTINEL_AUDIT.json'), JSON.stringify(report, null, 2));
if (!ok) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('phase320 production sentinel validation passed');

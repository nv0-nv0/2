import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildEngineAgentAssignment, buildEngineAgentRuntimeStatus, applyEngineAgentGate, runEngineAgentPackageAudit, ENGINE_AGENT_ORCHESTRATOR_VERSION } from '../server/core/engine-agent-orchestrator.mjs';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
function walk(dir, acc = []) {
  if (!fs.existsSync(path.join(root, dir))) return acc;
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (['node_modules','.git','runtime'].includes(entry.name)) continue;
    const rel = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) walk(rel, acc);
    else acc.push(rel);
  }
  return acc;
}
const files = ['server','apps','shared','scripts','tests','docs','deploy'].flatMap(dir => walk(dir)).concat(['package.json','Dockerfile']).filter((v,i,a)=>a.indexOf(v)===i).sort();
const pkg = JSON.parse(read('package.json'));
const sourceText = ['server/core/engine-agent-orchestrator.mjs','server/routes/public.mjs','server/routes/payment.mjs','server/routes/admin.mjs','tests/e2e.mjs','scripts/test-all.mjs','package.json'].map(read).join('\n');
const assignment = buildEngineAgentAssignment({ scans: [{}], boards: [{}], orders: [{}], paymentSessions: [{}], engineAgentEvents: [] }, { nowIso: '2026-05-27T00:00:00.000Z' });
const status = buildEngineAgentRuntimeStatus({ engineAgentEvents: [] }, { nowIso: '2026-05-27T00:00:00.000Z' });
const audit = runEngineAgentPackageAudit({ files, packageJson: pkg, routes: ['/api/public/engine-agent-status','/api/admin/engine-agents/audit'], sourceText });

const checks = [];
function check(key, fn) {
  try { fn(); checks.push({ key, ok: true }); }
  catch (error) { checks.push({ key, ok: false, detail: error.message }); }
}

check('package phase316 or superseding phase317', () => assert.match(pkg.version, /phase316-engine-agent-total-application|phase317-trustops-growth-automation|phase318-trustops-autopilot-cockpit|phase319-trustops-launch-control|phase320-trustops-production-sentinel|phase321-trustops-final-completion|phase322-final-test-closeout|phase323-one-hundred-point-closeout|phase324-complete-delivery|phase323-one-hundred-point-closeout|phase324-complete-delivery|phase323-one-hundred-point-closeout|phase324-complete-delivery|phase323-one-hundred-point-closeout|phase324-complete-delivery|phase323-one-hundred-point-closeout|phase324-complete-delivery/));
check('orchestrator version phase316 or phase317', () => assert.match(ENGINE_AGENT_ORCHESTRATOR_VERSION, /phase31[6789]|phase320|phase321|phase323|phase324/));
check('engine count >=24', () => assert.ok(assignment.engineCount >= 24));
check('agent count >=55', () => assert.ok(assignment.agentCount >= 55));
check('event policy count >=7', () => assert.ok(assignment.eventPolicyCount >= 7));
check('assignment ok', () => assert.equal(assignment.ok, true));
check('runtime status applied', () => assert.equal(status.status, 'applied'));
check('audit score 100', () => assert.ok(audit.score >= 100));
check('audit ok', () => assert.equal(audit.ok, true));
check('public route uses diagnose gate', () => assert.match(read('server/routes/public.mjs'), /applyEngineAgentGate\('diagnosis\.completed'/));
check('public route uses board gate', () => assert.match(read('server/routes/public.mjs'), /applyEngineAgentGate\('board\.render'/));
check('payment route uses checkout gate', () => assert.match(read('server/routes/payment.mjs'), /applyEngineAgentGate\('checkout\.session\.create'/));
check('payment route uses payment gate', () => assert.match(read('server/routes/payment.mjs'), /applyEngineAgentGate\('payment\.complete'/));
check('payment route uses download gate', () => assert.match(read('server/routes/payment.mjs'), /applyEngineAgentGate\('fulfillment\.download'/));
check('payment route uses refund gate', () => assert.match(read('server/routes/payment.mjs'), /applyEngineAgentGate\('refund\.request'/));
check('append engine events in public', () => assert.match(read('server/routes/public.mjs'), /appendEngineAgentEvent\(db, diagnosisAgentGate\)/));
check('append engine events in payment', () => assert.match(read('server/routes/payment.mjs'), /appendEngineAgentEvent\(db, checkoutAgentGate\)/));
check('checkout gate requires idempotency', () => assert.equal(applyEngineAgentGate('checkout.session.create', { amount: 49000, domain: 'example.com', buyerEmail: 'a@b.com', privacyConsent: true, termsConsent: true, refundConsent: true, deliveryConsent: true, idempotencyKey: '' }).ok, false));
check('checkout gate passes full payload', () => assert.equal(applyEngineAgentGate('checkout.session.create', { amount: 49000, domain: 'example.com', buyerEmail: 'a@b.com', privacyConsent: true, termsConsent: true, refundConsent: true, deliveryConsent: true, idempotencyKey: 'abc' }).ok, true));
check('board gate rejects broken glyph', () => assert.equal(applyEngineAgentGate('board.render', { postCount: 1, intervalMinutes: 20, sample: '깨진 ▤ 도형' }).ok, false));
check('diagnosis gate keeps locked result', () => assert.equal(applyEngineAgentGate('diagnosis.completed', { target: 'https://example.com', requestId: 'scan_1', siteId: 'site_1', locked: true }).ok, true));
check('docs work order exists', () => assert.ok(exists('docs/PHASE316_ENGINE_AGENT_APPLICATION_WORK_ORDER.md')));
check('docs report exists', () => assert.ok(exists('docs/PHASE316_ENGINE_AGENT_APPLICATION_REPORT.md')));
check('release predeploy latest', () => assert.ok(['npm run phase316:final','npm run phase317:final','npm run phase318:final','npm run phase319:final','npm run phase320:final','npm run phase321:final','npm run phase322:final','npm run phase323:final','npm run phase324:final'].includes(pkg.scripts['release:predeploy'])));

const ok = checks.every(item => item.ok);
const report = { ok, phase: 'phase316-compatible-phase317-trustops-growth', checkedAt: new Date().toISOString(), passed: checks.filter(item => item.ok).length, failed: checks.filter(item => !item.ok).length, checks, assignment: { engineCount: assignment.engineCount, agentCount: assignment.agentCount, eventPolicyCount: assignment.eventPolicyCount }, audit };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE316_ENGINE_AGENT_APPLICATION_AUDIT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!ok) process.exit(1);

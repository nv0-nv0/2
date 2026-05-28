import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildPhase317ImprovementBacklog, buildTrustOpsGrowthBlueprint, buildFixGeneratorPayload, buildMonitoringPlan, buildRevenueOptimizationPlan, buildStructuredDataPackage, runPhase317GrowthAudit, PHASE317_TRUSTOPS_GROWTH_VERSION } from '../server/core/trustops-growth-engine.mjs';
import { buildCommercialOfferCatalog, PRODUCT_CATALOG_VERSION } from '../shared/product-catalog.mjs';
import { buildEngineAgentAssignment, runEngineAgentPackageAudit, ENGINE_AGENT_ORCHESTRATOR_VERSION } from '../server/core/engine-agent-orchestrator.mjs';

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
const sourceText = ['server/core/trustops-growth-engine.mjs','server/core/engine-agent-orchestrator.mjs','server/routes/public.mjs','shared/product-catalog.mjs','apps/public/plans/index.html','apps/public/portal/index.html','apps/public/portal/app.js','tests/trustops-growth.mjs','package.json'].map(read).join('\n');
const backlog = buildPhase317ImprovementBacklog();
const offers = buildCommercialOfferCatalog();
const blueprint = buildTrustOpsGrowthBlueprint({ siteUrl: 'https://example.kr', industry: 'shopping', offers });
const fixPack = buildFixGeneratorPayload({ brandName: '테스트몰', siteUrl: 'https://example.kr', industry: 'shopping', supportEmail: 'help@example.kr' });
const monitoring = buildMonitoringPlan({ siteUrl: 'https://example.kr', industry: 'shopping', cadence: 'weekly' });
const revenue = buildRevenueOptimizationPlan({ offers });
const structured = buildStructuredDataPackage({ name: 'VERIDION', url: 'https://nv0.kr' });
const growthAudit = runPhase317GrowthAudit({ files, packageJson: pkg, sourceText });
const engineAudit = runEngineAgentPackageAudit({ files, packageJson: pkg, routes: ['/api/public/engine-agent-status','/api/admin/engine-agents/audit'], sourceText });
const assignment = buildEngineAgentAssignment({}, { nowIso: '2026-05-27T00:00:00.000Z' });

const checks = [];
function check(key, fn) {
  try { fn(); checks.push({ key, ok: true }); }
  catch (error) { checks.push({ key, ok: false, detail: error.message }); }
}

check('package phase317', () => assert.match(pkg.version, /phase317-trustops-growth-automation|phase318-trustops-autopilot-cockpit|phase319-trustops-launch-control|phase320-trustops-production-sentinel|phase321-trustops-final-completion|phase322-final-test-closeout|phase323-one-hundred-point-closeout|phase324-complete-delivery|phase323-one-hundred-point-closeout|phase324-complete-delivery|phase323-one-hundred-point-closeout|phase324-complete-delivery|phase323-one-hundred-point-closeout|phase324-complete-delivery/));
check('product catalog phase317', () => assert.match(PRODUCT_CATALOG_VERSION, /phase31[789]|phase320|phase321|phase323|phase324/));
check('growth engine version phase317', () => assert.match(PHASE317_TRUSTOPS_GROWTH_VERSION, /phase31[789]|phase320|phase321|phase323|phase324/));
check('engine orchestrator phase317', () => assert.match(ENGINE_AGENT_ORCHESTRATOR_VERSION, /phase31[789]|phase320|phase321|phase323|phase324/));
check('engine count increased', () => assert.ok(assignment.engineCount >= 30));
check('agent count increased', () => assert.ok(assignment.agentCount >= 68));
check('event policy count increased', () => assert.ok(assignment.eventPolicyCount >= 12));
check('backlog 100', () => assert.equal(backlog.length, 100));
check('fix pack 5', () => assert.equal(fixPack.copyReadyCount, 5));
check('monitoring schedule 5', () => assert.equal(monitoring.schedule.length, 5));
check('revenue ladder 6', () => assert.ok(revenue.ladder.length >= 6));
check('structured jsonld', () => assert.equal(Boolean(structured.jsonLd && structured.faqJsonLd), true));
check('catalog includes growth products', () => assert.deepEqual(offers.map(item => item.code), ['Report','FixPack','Monitoring','Expert','Agency']));
check('blueprint exposes trustops', () => assert.equal(blueprint.positioning, 'TrustOps AI Platform'));
check('routes inserted', () => ['/api/public/trustops-blueprint','/api/public/fix-generator','/api/public/monitoring-plan','/api/public/revenue-optimization','/api/public/industry-templates','/api/public/structured-data-package'].forEach(route => assert.ok(sourceText.includes(route), route)));
check('portal exposes trustops panel', () => assert.ok(read('apps/public/portal/index.html').includes('portalTrustOpsTitle')));
check('plans expose growth products', () => ['FixPack','Monitoring','Agency'].forEach(code => assert.ok(read('apps/public/plans/index.html').includes(`plan=${code}`), code)));
check('test script exists', () => assert.ok(pkg.scripts['test:trustops'] && pkg.scripts['phase317:final']));
check('release predeploy phase317', () => assert.ok(['npm run phase317:final','npm run phase318:final','npm run phase319:final','npm run phase320:final','npm run phase321:final','npm run phase322:final','npm run phase323:final','npm run phase324:final'].includes(pkg.scripts['release:predeploy'])));
check('growth audit ok', () => assert.equal(growthAudit.ok, true));
check('engine audit ok', () => assert.equal(engineAudit.ok, true));
check('docs exist', () => assert.ok(exists('docs/PHASE317_TRUSTOPS_GROWTH_AUTOMATION_WORK_ORDER.md') && exists('docs/PHASE317_TRUSTOPS_GROWTH_AUTOMATION_REPORT.md')));

const ok = checks.every(item => item.ok);
const report = { ok, phase: 'phase317-trustops-growth-automation|phase318-trustops-autopilot-cockpit|phase319-trustops-launch-control|phase320-trustops-production-sentinel|phase320-trustops-production-sentinel', checkedAt: new Date().toISOString(), passed: checks.filter(item => item.ok).length, failed: checks.filter(item => !item.ok).length, checks, growthAudit, engineAudit, assignment: { engineCount: assignment.engineCount, agentCount: assignment.agentCount, eventPolicyCount: assignment.eventPolicyCount }, blueprint: { positioning: blueprint.positioning, improvementBacklogCount: blueprint.improvementBacklogCount } };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE317_TRUSTOPS_GROWTH_AUTOMATION_AUDIT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!ok) process.exit(1);

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildFinalDeliveryOperationalMatrix, FINAL_DELIVERY_AGENT_REGISTRY, FINAL_DELIVERY_ENGINE_VERSION } from '../server/core/final-delivery-ops-engine.mjs';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const pkg = JSON.parse(read('package.json'));
const scripts = pkg.scripts || {};
const checks = [];
function add(key, pass, weight, message) { checks.push({ key, pass, weight, message }); }
function hasScript(name) { return Boolean(scripts[name]); }

const opsRoute = read('server/routes/ops.mjs');
const portalCss = read('shared/portal-phase283-dashboard.css');
const adoptedCss = read('shared/veridion-adopted-ui.css');
const productSuite = read('server/core/product-agent-suite.mjs');
const finalEngine = read('server/core/final-delivery-ops-engine.mjs');
const finalDoc = read('docs/PHASE299_FINAL_DELIVERY_REPORT.md');
const matrix = buildFinalDeliveryOperationalMatrix(process.env);

add('packageVersion', (/phase299-final-delivery|phase302-final-handoff|phase303-live-evidence-handoff|phase304-remaining-stage-closeout|phase305-integrity-closeout|phase307-professional-polish|phase308-full-test-closeout/.test(pkg.version)), 8, 'phase299+ package version line remains compatible with later closeout phases');
add('finalScripts', ['phase299:final','delivery:final','validate:phase299','ops:production-matrix','verify:prod','monitoring:rollback','restore:drill'].every(hasScript), 12, 'final delivery scripts wired');
add('opsPortoneInjection', /PORTONE_CLIENT/.test(opsRoute) && /PORTONE_CLIENT\.configSummary/.test(opsRoute), 8, 'ops diagnostics can summarize PortOne without runtime reference error');
add('legacyQualityGates', ['check-ast-placeholder-guard.mjs','check-content-completeness.mjs','check-data-integrity.mjs','check-full-commercial-flow.mjs','check-handoff-docs.mjs'].every(file => exists(`scripts/${file}`)), 10, 'previously external quality gates are included');
add('monitoringRollbackGate', exists('docs/PHASE106_MONITORING_AND_AUTO_ROLLBACK_RUNBOOK_20260426_KO.md') && hasScript('monitoring:rollback'), 8, 'monitoring and rollback gate restored');
add('finalOpsEngine', /FINAL_DELIVERY_ENGINE_VERSION/.test(finalEngine) && (FINAL_DELIVERY_ENGINE_VERSION.includes('phase299') || FINAL_DELIVERY_ENGINE_VERSION.includes('phase302') || FINAL_DELIVERY_ENGINE_VERSION.includes('phase303') || FINAL_DELIVERY_ENGINE_VERSION.includes('phase304') || FINAL_DELIVERY_ENGINE_VERSION.includes('phase305')) && FINAL_DELIVERY_AGENT_REGISTRY.length >= 10, 12, 'final delivery engine and agents exist');
add('liveOpsItemsPackaged', matrix.items.length >= 12 && matrix.packageReadyCount >= 12, 12, 'live-only operation items are packaged as a matrix');
add('insightCadenceStillLocked', /20 \* 60 \* 1000/.test(productSuite) && /korean-proofreading-agent/.test(productSuite) && /special-character-guard-agent/.test(productSuite), 10, '20-minute insight cadence and copy guards preserved');
add('buttonVisibilityStillLocked', /min-height:44px/.test(portalCss) && /focus-visible/.test(portalCss) && /overflow-wrap:anywhere/.test(portalCss) && /\.btn\.primary/.test(adoptedCss), 8, 'button visibility and no-overlap CSS hardening preserved');
add('handoffDocs', exists('docs/FINAL_HANDOFF_INDEX_20260423_KO.md') && /phase299:final/.test(finalDoc), 6, 'handoff and final report documented');
add('auditOutputs', exists('docs/LOCAL_ACCEPTANCE_SUMMARY_20260423.json') && exists('docs/PHASE104_CONTENT_COMPLETION_REPORT_20260426_KO.md'), 6, 'legacy audit artifacts retained');

const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
const failed = checks.filter((item) => !item.pass);
const report = {
  ok: failed.length === 0 && score === 100,
  phase: 'phase299',
  score,
  total: 100,
  engineVersion: FINAL_DELIVERY_ENGINE_VERSION,
  checks,
  failed,
  operationalMatrixSummary: {
    packageReadyCount: matrix.packageReadyCount,
    liveVerifiedCount: matrix.liveVerifiedCount,
    liveRequiredCount: matrix.liveRequiredCount,
    finalJudgement: matrix.finalJudgement
  }
};
fs.mkdirSync(path.join(ROOT, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/current/PHASE299_FINAL_DELIVERY_AUDIT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
assert.equal(report.ok, true, `phase299 final validation failed: ${failed.map(item => item.key).join(', ')}`);

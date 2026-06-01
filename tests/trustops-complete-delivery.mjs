import assert from 'node:assert/strict';
import { buildTrustOpsCompleteDelivery, runPhase324CompleteDeliveryAudit, PHASE324_COMPLETE_DELIVERY_VERSION } from '../server/core/trustops-complete-delivery.mjs';
import { buildEngineAgentAssignment } from '../server/core/engine-agent-orchestrator.mjs';

const env = {
  NV0_PUBLIC_BASE_URL: 'https://nv0.kr',
  NV0_PAYMENT_PROVIDER: 'portone_v2',
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
const files = [
  'server/index.mjs','server/routes/public.mjs','server/routes/admin.mjs','server/core/paid-service-operating-model.mjs','server/core/privacy-compliance-guard.mjs','server/core/product-agent-suite.mjs','server/core/trustops-growth-engine.mjs','server/core/trustops-autopilot-engine.mjs','server/core/trustops-launch-control.mjs','server/core/trustops-production-sentinel.mjs','server/core/trustops-final-handoff.mjs','server/core/trustops-complete-delivery.mjs','apps/public/board/app.js','apps/public/privacy/index.html','apps/public/terms/index.html','apps/public/refund/index.html','apps/public/business-info/index.html','shared/veridion-clean-v311.css','scripts/verify-security.mjs','scripts/check-release-secret-hygiene.mjs','scripts/check-accessibility-basics.mjs','scripts/check-performance-budget.mjs','scripts/check-runtime-clean.mjs','scripts/backup-runtime.mjs','scripts/restore-drill.mjs','scripts/check-live-public.mjs','scripts/clean-release-runtime.mjs','scripts/check-responsive-contract.mjs','runtime/data/db.seed.json','docs/PHASE323_100_POINT_FINAL_DELIVERY_REPORT.md','docs/PHASE323_100_POINT_FINAL_WORK_ORDER.md','docs/PHASE324_COMPLETE_DELIVERY_REPORT.md'
];
const scripts = {
  'test:e2e': 'node tests/e2e.mjs',
  'test:commerce': 'node tests/portone-provider.mjs && node tests/provider-adapters.mjs && node tests/portone-events.mjs',
  'test:paid-redteam': 'node tests/paid-service-redteam.mjs',
  'test:final-handoff': 'node tests/trustops-final-handoff.mjs',
  'delivery:final': 'npm run phase324:final',
  'release:predeploy': 'npm run phase324:final'
};
const sourceText = 'checkout.session.create fulfillment.download 20분 intervalMinutes cost-quality';
const delivery = buildTrustOpsCompleteDelivery({}, { env, files, scripts, routes: ['/api/public/privacy-status','/api/public/live-verification-checklist','/api/admin/trustops-final-handoff','/api/admin/trustops-production-sentinel','/api/public/trustops-100-final','/api/public/trustops-complete-delivery'], sourceText, runtimeClean: true, secretHygienePassed: true });
assert.match(PHASE324_COMPLETE_DELIVERY_VERSION, /phase324/);
assert.equal(delivery.ok, true);
assert.equal(delivery.packageScore, 100);
assert.equal(delivery.failed.length, 0);
assert.equal(delivery.linkedScores.phase323PackageScore, 100);
assert.ok(delivery.finalOperatorPack.length >= 10);
assert.equal(delivery.operationalTruth.liveServerScore, null);
const audit = runPhase324CompleteDeliveryAudit({ env, files, scripts, routes: ['/api/public/privacy-status','/api/public/live-verification-checklist','/api/admin/trustops-final-handoff','/api/admin/trustops-production-sentinel','/api/public/trustops-100-final','/api/public/trustops-complete-delivery'], sourceText, runtimeClean: true, secretHygienePassed: true });
assert.equal(audit.ok, true);
assert.equal(audit.score, 100);
const assignment = buildEngineAgentAssignment({});
assert.ok(assignment.engineCount >= 50);
assert.ok(assignment.agentCount >= 108);
console.log('phase324 trustops complete delivery integration ok');

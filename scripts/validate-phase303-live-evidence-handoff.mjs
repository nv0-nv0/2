import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildFinalDeliveryOperationalMatrix, FINAL_DELIVERY_ENGINE_VERSION } from '../server/core/final-delivery-ops-engine.mjs';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const pkg = JSON.parse(read('package.json'));
const scripts = pkg.scripts || {};
const opsScript = read('scripts/ops-production-verification.mjs');
const engine = read('server/core/final-delivery-ops-engine.mjs');
const readme = read('README.md');
const deliveryReadme = read('DELIVERY_README.txt');
const phaseReport = exists('docs/PHASE303_LIVE_EVIDENCE_HANDOFF_REPORT.md') ? read('docs/PHASE303_LIVE_EVIDENCE_HANDOFF_REPORT.md') : '';

const checks = [];
function add(key, ok, weight, message = '') {
  checks.push({ key, ok: Boolean(ok), weight, message });
}

const defaultMatrix = buildFinalDeliveryOperationalMatrix(process.env);
const livePublicEvidenceMatrix = buildFinalDeliveryOperationalMatrix(process.env, { liveEvidence: { 'live-public-smoke': true } });
const livePublicItem = livePublicEvidenceMatrix.items.find(item => item.key === 'live-public-smoke');

add('phase303 version and final scripts', /phase303-live-evidence-handoff|phase304-remaining-stage-closeout|phase305-integrity-closeout/.test(pkg.version)
  && (scripts['delivery:final'] === 'npm run phase303:final' || scripts['delivery:final'] === 'npm run phase304:final' || scripts['delivery:final'] === 'npm run phase305:final')
  && (scripts['release:predeploy'] === 'npm run phase303:final' || scripts['release:predeploy'] === 'npm run phase304:final' || scripts['release:predeploy'] === 'npm run phase305:final')
  && scripts['phase303:final']?.includes('validate:phase303'), 12, 'final delivery now points to phase303');
add('postdeploy passes live mode through both commands', scripts['release:postdeploy']?.includes('NV0_VERIFY_MODE=live NV0_BASE_URL=https://www.nv0.kr npm run verify:prod')
  && scripts['release:postdeploy']?.includes('NV0_VERIFY_MODE=live npm run ops:production-matrix'), 12, 'postdeploy report can feed the operational matrix');
add('ops engine upgraded to phase303', (FINAL_DELIVERY_ENGINE_VERSION.includes('phase303') || FINAL_DELIVERY_ENGINE_VERSION.includes('phase304') || FINAL_DELIVERY_ENGINE_VERSION.includes('phase305'))
  && engine.includes("key: 'live-public-smoke'")
  && (defaultMatrix.phase === 'phase303' || defaultMatrix.phase === 'phase304' || defaultMatrix.phase === 'phase305'), 12, 'ops matrix includes post-deploy public smoke evidence item');
add('ops script ingests verify-prod live report', opsScript.includes('VERIFY_PROD_REPORT.json')
  && opsScript.includes('buildLiveEvidence')
  && opsScript.includes("'live-public-smoke'")
  && opsScript.includes('report?.mode === \'live\''), 14, 'ops matrix reads live verification output safely');
add('default package score remains honest', defaultMatrix.packageScore === 100
  && defaultMatrix.liveScore === 0
  && defaultMatrix.goLiveScore === 70
  && defaultMatrix.finalJudgement === 'package-delivery-ready-live-verification-required', 12, 'package validation still does not pretend live readiness');
add('single live public evidence increments only one item', livePublicEvidenceMatrix.liveVerifiedCount === 1
  && livePublicEvidenceMatrix.liveScore > 0
  && livePublicEvidenceMatrix.goLiveScore > 70
  && livePublicEvidenceMatrix.finalJudgement === 'package-delivery-ready-live-verification-required'
  && livePublicItem?.liveVerified === true, 14, 'successful live smoke is credited but not overstated');
add('previous phase validators remain forward compatible', read('scripts/validate-phase299-final-delivery.mjs').includes('phase303-live-evidence-handoff')
  && read('scripts/validate-phase300-production-readiness.mjs').includes('phase303-live-evidence-handoff')
  && read('scripts/validate-phase301-final-closeout.mjs').includes('phase303-live-evidence-handoff')
  && read('scripts/validate-phase302-final-handoff.mjs').includes('phase303-live-evidence-handoff') && read('scripts/validate-phase299-final-delivery.mjs').includes('phase304-remaining-stage-closeout|phase305-integrity-closeout') && read('scripts/validate-phase300-production-readiness.mjs').includes('phase304-remaining-stage-closeout|phase305-integrity-closeout') && read('scripts/validate-phase301-final-closeout.mjs').includes('phase304-remaining-stage-closeout|phase305-integrity-closeout') && read('scripts/validate-phase302-final-handoff.mjs').includes('phase304-remaining-stage-closeout|phase305-integrity-closeout'), 10, 'legacy gates can run inside phase303');
add('README visible product heading cleaned', readme.includes('# VERIDION Commercial Launch Build')
  && readme.includes('# VERIDION Cleanroom Rebuild Starter')
  && !readme.includes('# NV0 Commercial Launch Build')
  && !readme.includes('# NV0 Cleanroom Rebuild Starter'), 8, 'public package docs no longer start with the old product label');
add('phase303 report and delivery readme exist', phaseReport.includes('Phase303')
  && phaseReport.includes('live-public-smoke')
  && (deliveryReadme.includes('Phase303') || deliveryReadme.includes('Phase304'))
  && deliveryReadme.includes('Post-deploy live verification evidence'), 6, 'handoff docs describe the final correction');

const score = checks.reduce((sum, item) => sum + (item.ok ? item.weight : 0), 0);
const failed = checks.filter(item => !item.ok);
const payload = {
  ok: failed.length === 0 && score === 100,
  phase: 'phase303',
  score,
  total: 100,
  generatedAt: new Date().toISOString(),
  checks,
  failed,
  matrixSummary: {
    default: {
      packageScore: defaultMatrix.packageScore,
      liveScore: defaultMatrix.liveScore,
      goLiveScore: defaultMatrix.goLiveScore,
      liveVerifiedCount: defaultMatrix.liveVerifiedCount,
      liveRequiredCount: defaultMatrix.liveRequiredCount,
      finalJudgement: defaultMatrix.finalJudgement
    },
    withLivePublicSmokeEvidence: {
      packageScore: livePublicEvidenceMatrix.packageScore,
      liveScore: livePublicEvidenceMatrix.liveScore,
      goLiveScore: livePublicEvidenceMatrix.goLiveScore,
      liveVerifiedCount: livePublicEvidenceMatrix.liveVerifiedCount,
      liveRequiredCount: livePublicEvidenceMatrix.liveRequiredCount,
      finalJudgement: livePublicEvidenceMatrix.finalJudgement
    }
  }
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE303_LIVE_EVIDENCE_HANDOFF_AUDIT.json'), JSON.stringify(payload, null, 2) + '\n');
console.log(JSON.stringify(payload, null, 2));
assert.equal(payload.ok, true, `phase303 live evidence handoff failed: ${failed.map(item => item.key).join(', ')}`);

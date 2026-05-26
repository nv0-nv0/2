import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildFinalDeliveryOperationalMatrix, FINAL_DELIVERY_ENGINE_VERSION } from '../server/core/final-delivery-ops-engine.mjs';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const write = (rel, text) => fs.writeFileSync(path.join(root, rel), text);
const pkg = JSON.parse(read('package.json'));
const scripts = pkg.scripts || {};
const checks = [];
function add(key, ok, weight, message = '') {
  checks.push({ key, ok: Boolean(ok), weight, message });
}
function json(rel) {
  return JSON.parse(read(rel));
}
function backupFile(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return { existed: false, rel, text: '' };
  return { existed: true, rel, text: fs.readFileSync(abs, 'utf8') };
}
function restoreFile(snapshot) {
  const abs = path.join(root, snapshot.rel);
  if (!snapshot.existed) {
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
    return;
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, snapshot.text);
}
function runNode(script, env = {}) {
  execFileSync(process.execPath, [script], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: 'pipe'
  });
}

const defaultMatrix = buildFinalDeliveryOperationalMatrix(process.env);
let defaultInventory = exists('docs/current/PHASE304_REMAINING_STAGE_INVENTORY.json')
  ? json('docs/current/PHASE304_REMAINING_STAGE_INVENTORY.json')
  : null;

const snapshots = [
  backupFile('docs/current/VERIFY_PROD_REPORT.json'),
  backupFile('docs/current/PHASE304_REMAINING_STAGE_INVENTORY.json'),
  backupFile('docs/PHASE304_REMAINING_STAGE_INVENTORY.md')
];
let simulatedInventory = null;
try {
  fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
  write('docs/current/VERIFY_PROD_REPORT.json', JSON.stringify({
    ok: true,
    mode: 'live',
    baseUrl: 'https://www.nv0.kr',
    checks: Array.from({ length: 23 }, (_, index) => ({ path: `/phase305-simulated-${index}`, ok: true })),
    checkedAt: new Date().toISOString()
  }, null, 2) + '\n');
  runNode('scripts/generate-phase304-remaining-stage-inventory.mjs', { NV0_VERIFY_MODE: 'live' });
  simulatedInventory = json('docs/current/PHASE304_REMAINING_STAGE_INVENTORY.json');
} finally {
  snapshots.forEach(restoreFile);
  runNode('scripts/generate-phase304-remaining-stage-inventory.mjs');
  defaultInventory = json('docs/current/PHASE304_REMAINING_STAGE_INVENTORY.json');
}

const generator = read('scripts/generate-phase304-remaining-stage-inventory.mjs');
const ops = read('scripts/ops-production-verification.mjs');
const delivery = read('DELIVERY_README.txt');
const runAll = read('RUN_ALL_TESTS.sh');
const workOrder = read('docs/PHASE305_INTEGRITY_CLOSEOUT_WORK_ORDER.md');
const report = read('docs/PHASE305_FINAL_INTEGRITY_CLOSEOUT_REPORT.md');
const livePublicItem = simulatedInventory?.items?.find(item => item.key === 'live-public-smoke');

add('phase305 version and final scripts wired', /phase305-integrity-closeout/.test(pkg.version)
  && scripts['phase305:final'] === 'npm run phase304:final && npm run validate:phase305'
  && scripts['delivery:final'] === 'npm run phase305:final'
  && scripts['release:predeploy'] === 'npm run phase305:final'
  && runAll.includes('phase305:final'), 12, 'final entry points target phase305');
add('postdeploy propagates live mode into inventory generator', scripts['release:postdeploy']?.includes('NV0_VERIFY_MODE=live npm run generate:remaining-stage')
  && scripts['release:postdeploy']?.includes('NV0_VERIFY_MODE=live NV0_BASE_URL=https://www.nv0.kr npm run verify:prod'), 12, 'postdeploy keeps verify, matrix, and inventory in live mode');
add('remaining inventory generator reads verify-prod evidence', generator.includes('VERIFY_PROD_REPORT.json')
  && generator.includes('buildLiveEvidence')
  && generator.includes("'live-public-smoke'")
  && generator.includes('report?.mode === \'live\''), 14, 'generator safely ingests live public smoke proof');
add('ops matrix writes phase305 report while keeping legacy path', ops.includes('PHASE305_OPERATIONAL_MATRIX.json')
  && ops.includes('PHASE299_OPERATIONAL_MATRIX.json'), 8, 'operational report is phase-current and backward compatible');
add('ops engine phase305 with honest default scoring', FINAL_DELIVERY_ENGINE_VERSION.includes('phase305')
  && defaultMatrix.phase === 'phase305'
  && defaultMatrix.packageScore === 100
  && defaultMatrix.liveScore === 0
  && defaultMatrix.goLiveScore === 70
  && defaultMatrix.finalJudgement === 'package-delivery-ready-live-verification-required', 12, 'default local package validation remains non-live');
add('default inventory remains honest without live evidence', defaultInventory?.counts?.totalRemainingElements === 13
  && defaultInventory?.counts?.liveVerifiedCount === 0
  && defaultInventory?.counts?.liveActionRequiredCount === 13
  && defaultInventory?.summary?.finalJudgement === 'package-delivery-ready-live-verification-required', 12, 'normal package inventory still lists 13 live requirements');
add('simulated live public smoke updates inventory only by one item', simulatedInventory?.counts?.totalRemainingElements === 13
  && simulatedInventory?.counts?.liveVerifiedCount === 1
  && simulatedInventory?.counts?.liveActionRequiredCount === 12
  && livePublicItem?.liveVerified === true
  && livePublicItem?.status === 'live-verified'
  && simulatedInventory?.summary?.finalJudgement === 'package-delivery-ready-live-verification-required', 16, 'live public proof is credited but does not overstate go-live readiness');
add('phase305 docs explain correction and limits', delivery.includes('Phase305')
  && workOrder.includes('live 검증 결과')
  && report.includes('13 live signals')
  && report.includes('12 live items remain required'), 8, 'handoff docs explain the integrity fix');
add('previous phase gate still usable', scripts['phase304:final']?.includes('validate:phase304')
  && read('scripts/validate-phase304-remaining-stage-closeout.mjs').includes('phase304'), 6, 'previous closeout gate remains intact');

const score = checks.reduce((sum, item) => sum + (item.ok ? item.weight : 0), 0);
const failed = checks.filter(item => !item.ok);
const payload = {
  ok: failed.length === 0 && score === 100,
  phase: 'phase305',
  score,
  total: 100,
  generatedAt: new Date().toISOString(),
  checks,
  failed,
  defaultInventoryCounts: defaultInventory?.counts,
  simulatedLiveInventoryCounts: simulatedInventory?.counts,
  matrixSummary: {
    packageScore: defaultMatrix.packageScore,
    liveScore: defaultMatrix.liveScore,
    goLiveScore: defaultMatrix.goLiveScore,
    liveVerifiedCount: defaultMatrix.liveVerifiedCount,
    liveRequiredCount: defaultMatrix.liveRequiredCount,
    finalJudgement: defaultMatrix.finalJudgement
  }
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
write('docs/current/PHASE305_INTEGRITY_CLOSEOUT_AUDIT.json', JSON.stringify(payload, null, 2) + '\n');
console.log(JSON.stringify(payload, null, 2));
assert.equal(payload.ok, true, `phase305 integrity closeout failed: ${failed.map(item => item.key).join(', ')}`);

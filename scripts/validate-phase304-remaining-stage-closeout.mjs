import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildFinalDeliveryOperationalMatrix, FINAL_DELIVERY_ENGINE_VERSION, getExternalOperationItems } from '../server/core/final-delivery-ops-engine.mjs';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const pkg = JSON.parse(read('package.json'));
const scripts = pkg.scripts || {};
const matrix = buildFinalDeliveryOperationalMatrix(process.env);
const items = getExternalOperationItems();
const inventoryPath = 'docs/current/PHASE304_REMAINING_STAGE_INVENTORY.json';
if (!exists(inventoryPath)) {
  throw new Error('Missing Phase304 remaining stage inventory. Run npm run generate:remaining-stage first.');
}
const inventory = JSON.parse(read(inventoryPath));
const report = exists('docs/PHASE304_FINAL_CLOSEOUT_REPORT.md') ? read('docs/PHASE304_FINAL_CLOSEOUT_REPORT.md') : '';
const workOrder = exists('docs/PHASE304_REMAINING_STAGE_WORK_ORDER.md') ? read('docs/PHASE304_REMAINING_STAGE_WORK_ORDER.md') : '';
const inventoryMd = exists('docs/PHASE304_REMAINING_STAGE_INVENTORY.md') ? read('docs/PHASE304_REMAINING_STAGE_INVENTORY.md') : '';
const delivery = read('DELIVERY_README.txt');
const runAll = read('RUN_ALL_TESTS.sh');

const checks = [];
function add(key, ok, weight, message = '') {
  checks.push({ key, ok: Boolean(ok), weight, message });
}
add('phase304 version and scripts wired', /phase304-remaining-stage-closeout|phase305-integrity-closeout/.test(pkg.version)
  && scripts['phase304:final']?.includes('generate:remaining-stage')
  && scripts['phase304:final']?.includes('validate:phase304')
  && (scripts['delivery:final'] === 'npm run phase304:final' || scripts['delivery:final'] === 'npm run phase305:final')
  && (scripts['release:predeploy'] === 'npm run phase304:final' || scripts['release:predeploy'] === 'npm run phase305:final'), 12, 'final delivery now points to phase304');
add('ops engine phase304 and item export', (FINAL_DELIVERY_ENGINE_VERSION.includes('phase304') || FINAL_DELIVERY_ENGINE_VERSION.includes('phase305'))
  && (matrix.phase === 'phase304' || matrix.phase === 'phase305')
  && items.length === 13
  && matrix.items.length === 13, 12, 'ops engine exposes the full 13-item go-live checklist');
add('remaining stage inventory generated', inventory.ok === true
  && (inventory.phase === 'phase304' || inventory.phase === 'phase305')
  && inventory.counts.totalRemainingElements === 13
  && inventory.counts.packageActionCompletedCount === 13
  && inventory.counts.liveActionRequiredCount === 13, 14, 'machine-readable remaining inventory is complete');
add('inventory categories are fully counted', Object.keys(inventory.counts.categoryCounts || {}).length >= 10
  && inventory.counts.categoryCounts['visual-qa'] === 2
  && inventory.counts.categoryCounts.payment === 1
  && inventory.counts.categoryCounts.storage === 1
  && inventory.counts.categoryCounts.observability === 1, 10, 'category counts identify every remaining stage family');
add('work order documents all remaining stages', workOrder.includes('총 13개')
  && workOrder.includes('P0-01')
  && workOrder.includes('P0-13')
  && workOrder.includes('적용 완료')
  && workOrder.includes('실서버에서만 완료'), 12, 'work order separates package completion from live-only completion');
add('phase304 final report exists', report.includes('Phase304')
  && report.includes('13개')
  && report.includes('package-side')
  && report.includes('commercial-live-ready'), 10, 'final report explains closeout status and remaining live proof');
add('delivery readme and run all updated', (delivery.includes('Phase304') || delivery.includes('Phase305'))
  && delivery.includes('13')
  && (runAll.includes('phase304:final') || runAll.includes('phase305:final')), 10, 'handoff entry points point at phase304');
add('postdeploy refreshes remaining inventory', scripts['release:postdeploy']?.includes('generate:remaining-stage')
  && scripts['release:postdeploy']?.includes('NV0_VERIFY_MODE=live'), 8, 'postdeploy recomputes remaining counts after live verification');
add('previous phase compatibility retained', scripts['phase303:final']?.includes('validate:phase303')
  && read('scripts/validate-phase303-live-evidence-handoff.mjs').includes('phase304-remaining-stage-closeout|phase305-integrity-closeout')
  && read('scripts/validate-phase302-final-handoff.mjs').includes('phase304-remaining-stage-closeout|phase305-integrity-closeout'), 8, 'old gates remain usable inside phase304');
add('inventory markdown mirrors JSON count', inventoryMd.includes('Total remaining go-live elements: **13**')
  && inventoryMd.includes('| 13 | observability |'), 4, 'human-readable inventory mirrors JSON');

const score = checks.reduce((sum, item) => sum + (item.ok ? item.weight : 0), 0);
const failed = checks.filter(item => !item.ok);
const payload = {
  ok: failed.length === 0 && score === 100,
  phase: 'phase304',
  score,
  total: 100,
  generatedAt: new Date().toISOString(),
  checks,
  failed,
  counts: inventory.counts,
  matrixSummary: {
    packageScore: matrix.packageScore,
    liveScore: matrix.liveScore,
    goLiveScore: matrix.goLiveScore,
    liveVerifiedCount: matrix.liveVerifiedCount,
    liveRequiredCount: matrix.liveRequiredCount,
    finalJudgement: matrix.finalJudgement
  }
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE304_REMAINING_STAGE_CLOSEOUT_AUDIT.json'), JSON.stringify(payload, null, 2) + '\n');
console.log(JSON.stringify(payload, null, 2));
assert.equal(payload.ok, true, `phase304 remaining stage closeout failed: ${failed.map(item => item.key).join(', ')}`);

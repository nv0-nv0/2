import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildFinalDeliveryOperationalMatrix, FINAL_DELIVERY_ENGINE_VERSION } from '../server/core/final-delivery-ops-engine.mjs';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const pkg = JSON.parse(read('package.json'));
const scripts = pkg.scripts || {};
const checks = [];
function add(key, ok, weight, message = '') { checks.push({ key, ok: Boolean(ok), weight, message }); }

const ciEnv = read('deploy/env.production.nv0.kr.ci-check.env');
const secretAudit = exists('docs/current/PHASE302_SECRET_HYGIENE_AUDIT.json') ? JSON.parse(read('docs/current/PHASE302_SECRET_HYGIENE_AUDIT.json')) : { ok: false };
const matrix = buildFinalDeliveryOperationalMatrix(process.env);
const report = exists('docs/PHASE302_FINAL_HANDOFF_REPORT.md') ? read('docs/PHASE302_FINAL_HANDOFF_REPORT.md') : '';
const adminGate = read('apps/admin/gate/index.html');
const accountRoute = read('server/routes/account.mjs');
const publicRoute = read('server/routes/public.mjs');

add('phase302 version and delivery gate', /phase302-final-handoff|phase303-live-evidence-handoff|phase304-remaining-stage-closeout|phase305-integrity-closeout/.test(pkg.version) && (scripts['delivery:final'] === 'npm run phase302:final' || scripts['delivery:final'] === 'npm run phase303:final' || scripts['delivery:final'] === 'npm run phase304:final' || scripts['delivery:final'] === 'npm run phase305:final') && (scripts['release:predeploy'] === 'npm run phase302:final' || scripts['release:predeploy'] === 'npm run phase303:final' || scripts['release:predeploy'] === 'npm run phase304:final' || scripts['release:predeploy'] === 'npm run phase305:final'), 12, 'final delivery now points to phase302');
add('release secret hygiene gate wired and passed', scripts['check:release-secret-hygiene']?.includes('check-release-secret-hygiene.mjs') && secretAudit.ok === true, 14, 'release secret scanner blocks live-looking keys');
add('ci storage dummy key is non-live-shaped', ciEnv.includes('CICHECKSTORAGEACCESSIDPHASE302') && !/\bA[KS]IA[0-9A-Z]{16}\b/.test(ciEnv), 10, 'CI env no longer resembles real AWS access keys');
add('ops matrix uses honest go-live scoring', (FINAL_DELIVERY_ENGINE_VERSION.includes('phase302') || FINAL_DELIVERY_ENGINE_VERSION.includes('phase303') || FINAL_DELIVERY_ENGINE_VERSION.includes('phase304') || FINAL_DELIVERY_ENGINE_VERSION.includes('phase305')) && matrix.packageScore === 100 && matrix.liveScore === 0 && matrix.goLiveScore === 70 && matrix.finalJudgement === 'package-delivery-ready-live-verification-required', 16, 'package score and go-live score are separated');
add('postdeploy command requires live verification', scripts['release:postdeploy']?.includes('NV0_BASE_URL=https://www.nv0.kr') && scripts['release:postdeploy']?.includes('verify:prod'), 10, 'postdeploy script cannot be mistaken for local package validation');
add('admin/user-facing brand cleanup', adminGate.includes('VERIDION Admin') && accountRoute.includes('[VERIDION]') && publicRoute.includes('[VERIDION]'), 10, 'visible admin and email subject branding no longer says NV0');
add('canonical price lock still retained', read('shared/product-catalog.mjs').includes('Report: 49000') && read('shared/product-catalog.mjs').includes('Expert: 149000') && read('scripts/verify-prod.mjs').includes('₩49,000') && read('scripts/verify-prod.mjs').includes('₩149,000'), 10, 'pricing remains locked to 49,000/149,000');
add('runtime release remains clean', JSON.stringify(JSON.parse(read('runtime/data/db.json'))) === JSON.stringify(JSON.parse(read('runtime/data/db.seed.json'))) && JSON.parse(read('runtime/data/sessions.json')).length === 0, 8, 'runtime db equals seed and sessions empty');
add('phase302 report exists', report.includes('Phase302') && report.includes('go-live score') && report.includes('release:postdeploy'), 10, 'final handoff report documents changes and deployment gates');

const score = checks.reduce((sum, item) => sum + (item.ok ? item.weight : 0), 0);
const failed = checks.filter(item => !item.ok);
const payload = { ok: failed.length === 0 && score === 100, phase: 'phase302', score, total: 100, generatedAt: new Date().toISOString(), checks, failed, matrixSummary: { packageScore: matrix.packageScore, liveScore: matrix.liveScore, goLiveScore: matrix.goLiveScore, finalJudgement: matrix.finalJudgement } };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE302_FINAL_HANDOFF_AUDIT.json'), JSON.stringify(payload, null, 2) + '\n');
console.log(JSON.stringify(payload, null, 2));
assert.equal(payload.ok, true, `phase302 final handoff failed: ${failed.map(item => item.key).join(', ')}`);

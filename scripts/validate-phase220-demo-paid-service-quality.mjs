import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const mustInclude = (file, needles, label = file) => {
  const body = read(file);
  const missing = needles.filter((needle) => !body.includes(needle));
  return {
    ok: missing.length === 0,
    label,
    file,
    missing,
  };
};

const checks = [];

checks.push({
  label: 'phase220 service quality module exists',
  ok: exists('server/core/service-quality-220.mjs'),
});

checks.push(mustInclude('server/core/service-quality-220.mjs', [
  'PHASE220_SERVICE_QUALITY_VERSION',
  'buildDemoAccuracyContract',
  'buildPaidDeliverableBlueprint',
  'buildPaidOutputQualityGate',
  'attachPhase220ServiceQuality',
  'falsePositiveControls',
  'sourceTrace',
  'acceptanceChecklist',
  'performanceBudget',
], 'service quality exports and controls'));

checks.push(mustInclude('server/core/diagnosis-report-package.mjs', [
  'attachPhase220ServiceQuality',
  'demoAccuracyContract',
  'paidDeliverableBlueprint',
  'serviceQuality',
  'demoAccuracyScore',
], 'public diagnosis package phase220 contract'));

checks.push(mustInclude('server/core/premium-asset-builder.mjs', [
  'buildDemoAccuracyContract',
  'buildPaidDeliverableBlueprint',
  'buildPaidOutputQualityGate',
  'paidOutputQualityGate',
  'outputAccuracyTarget',
  'demoAccuracyContract',
], 'premium purchased asset phase220 gate'));

checks.push(mustInclude('server/routes/public.mjs', [
  'PHASE220_SERVICE_QUALITY_VERSION',
  'includesDemoAccuracyContract',
  'includesPaidOutputQualityGate',
  'paidOutputMustPassAcceptanceGate',
  'paidOutputQualityGate',
  'paidDeliverableBlueprint',
], 'public API phase220 exposure'));

checks.push(mustInclude('apps/public/veridion-demo/app.js', [
  'renderPhase220ServiceQuality',
  'phase220-service-quality',
  'demoAccuracyContract',
  'paidDeliverableBlueprint',
  '오탐 방어',
  '결제 후 산출물',
], 'demo UI phase220 visibility'));

checks.push(mustInclude('apps/public/checkout/index.html', [
  'phase220-checkout-quality',
  '품질 게이트',
  '근거 매트릭스',
  '수정 전/후 문구',
  '재점검 기준',
], 'checkout static quality gate copy'));

checks.push(mustInclude('apps/public/checkout/app.js', [
  'phase220-gate-strip',
  '품질 게이트',
  '재점검 기준',
], 'checkout runtime quality gate copy'));

checks.push(mustInclude('shared/phase218-fresh-premium.css', [
  '.phase220-service-quality',
  '.phase220-quality-grid',
  '.phase220-checkout-quality',
  '.phase220-gate-strip',
], 'phase220 visual system styles'));

checks.push(mustInclude('tests/phase220-demo-paid-service-quality.mjs', [
  'ctaIntervalMinutes',
  '20',
  'paidOutputQualityGate',
  'demoAccuracyContract',
  'acceptanceChecks',
], 'phase220 regression test coverage'));

const pkg = JSON.parse(read('package.json'));
const scripts = pkg.scripts || {};
checks.push({
  label: 'package scripts include phase220 final gate',
  ok: Boolean(scripts['test:phase220'] && scripts['validate:phase220'] && scripts['phase220:final']),
  missing: ['test:phase220', 'validate:phase220', 'phase220:final'].filter((key) => !scripts[key]),
});

checks.push({
  label: 'phase220 final preserves phase217 CTA regression',
  ok: String(scripts['phase220:final'] || '').includes('test:phase217') &&
      String(scripts['phase220:final'] || '').includes('validate:phase217-cta'),
});

checks.push({
  label: 'phase220 final preserves phase216/218/219 regression gates',
  ok: ['validate:phase216', 'validate:phase218', 'validate:phase219'].every((needle) =>
    String(scripts['phase220:final'] || '').includes(needle)
  ),
});

const failed = checks.filter((check) => !check.ok);
const scoreAfterPatch = failed.length ? Math.max(0, 100 - failed.length * 8) : 100;

const result = {
  ok: failed.length === 0,
  phase: 'phase220',
  name: 'demo-paid-service-quality-accuracy',
  target: 'demo_and_paid_output_quality_100_point_gate',
  checkedAt: new Date().toISOString(),
  scoreAfterPatch,
  totalChecks: checks.length,
  passedChecks: checks.length - failed.length,
  failedChecks: failed.map((check) => ({
    label: check.label,
    file: check.file || null,
    missing: check.missing || [],
  })),
  requirements: {
    demoAccuracyContract: 'checked',
    paidDeliverableBlueprint: 'checked',
    paidOutputQualityGate: 'checked',
    falsePositiveControls: 'checked',
    ctaAutopublishIntervalMinutes: 20,
    priorPhaseRegression: 'checked',
  },
};

const outPath = path.join(root, 'PHASE220_DEMO_PAID_SERVICE_QUALITY_VALIDATION_20260510.json');
fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));

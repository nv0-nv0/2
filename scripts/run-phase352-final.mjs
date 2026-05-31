import { spawnSync } from 'node:child_process';

const steps = [
  'check:phase352-inventory',
  'check:unique-remediation-matrix',
  'check:diagnosis-single-canonical',
  'check:product-catalog-ssot',
  'check:global-nav-contract',
  'check:contextual-cta-contract',
  'check:legacy-token-global',
  'check:calculated-contrast',
  'check:route-alias-contract',
  'check:insight-fallback',
  'check:sample-label-contract',
  'check:live-build-fingerprint',
  'check:live-package-diff',
  'check:secret-hygiene',
  'check:release-package'
];

for (const step of steps) {
  console.log(`\n== ${step} ==`);
  const result = spawnSync('npm', ['run', step], { stdio: 'inherit', shell: true });
  if (result.status !== 0) process.exit(result.status || 1);
}

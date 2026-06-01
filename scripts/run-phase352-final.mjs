import { spawnSync } from 'node:child_process';

function runStep(step) {
  if (process.platform === 'win32') {
    return spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm.cmd', 'run', step], { stdio: 'inherit' });
  }
  return spawnSync('npm', ['run', step], { stdio: 'inherit' });
}

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
  'check:public-page-bootstrap',
  'check:runtime-optimizer-safety',
  'check:phase352-runner-portability',
  'check:experience-orchestrator-contract',
  'check:business-profile-alignment',
  'check:secret-hygiene',
  'check:release-package'
];

for (const step of steps) {
  console.log(`\n== ${step} ==`);
  const result = runStep(step);
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

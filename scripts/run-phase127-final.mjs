import { spawnSync } from 'node:child_process';

const steps = [
  ['node', ['scripts/check-source-syntax.mjs']],
  ['node', ['scripts/test-all.mjs']],
  ['node', ['tests/e2e.mjs']],
  ['node', ['scripts/validate-phase123-commercial-core-v61.mjs']],
  ['node', ['tests/routes-smoke.mjs']],
  ['node', ['scripts/check-links.mjs', '--summary']],
  ['node', ['scripts/validate-phase124-full-reaudit.mjs']],
  ['node', ['scripts/validate-phase125-demo-result-fullwidth.mjs']],
  ['node', ['scripts/validate-phase127-cta-board-standard.mjs']]
];

for (const [cmd, args] of steps) {
  const label = `${cmd} ${args.join(' ')}`;
  console.log(`\n[phase127] ${label}`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', timeout: 90000 });
  if (result.error) {
    console.error(`[phase127] failed: ${label}`);
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[phase127] non-zero exit: ${label}`);
    process.exit(result.status || 1);
  }
}
console.log('\n[phase127] OK: CTA board publishing standard validation complete');

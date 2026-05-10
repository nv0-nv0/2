import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['scripts/validate-phase225-agentic-global-100.mjs'], { stdio: 'inherit' });
process.exit(result.status ?? 1);

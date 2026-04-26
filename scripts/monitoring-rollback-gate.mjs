import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const docsDir = path.join(root, 'docs');
const checks = [];
function add(name, ok, details = '') { checks.push({ name, ok, details }); }

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const server = fs.existsSync(path.join(root, 'server/index.mjs')) ? fs.readFileSync(path.join(root, 'server/index.mjs'), 'utf8') : '';
const rollbackDoc = path.join(docsDir, 'PHASE106_MONITORING_AND_AUTO_ROLLBACK_RUNBOOK_20260426_KO.md');

add('health endpoint available', /\/health|healthcheck|verify-prod/i.test(server), 'server exposes health or production verification surface');
add('verify prod script available', Boolean(packageJson.scripts['verify:prod']), 'verify:prod script exists');
add('runtime backup script available', Boolean(packageJson.scripts['backup:runtime']), 'backup:runtime script exists');
add('restore latest script available', Boolean(packageJson.scripts['restore:latest']), 'restore:latest script exists');
add('rollback runbook present', fs.existsSync(rollbackDoc), 'phase106 rollback runbook written');

const ok = checks.every(c => c.ok);
const report = { generatedAt: new Date().toISOString(), ok, checks, rollbackTriggers: ['health check failure', '5xx spike', 'core flow failure', 'completeness gate failure', 'runtime data integrity failure'] };
fs.writeFileSync(path.join(docsDir, 'PHASE106_MONITORING_ROLLBACK_VALIDATION_20260426.json'), JSON.stringify(report, null, 2));
if (!ok) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, report: 'docs/PHASE106_MONITORING_ROLLBACK_VALIDATION_20260426.json' }, null, 2));

// PHASE107_FORCE_EXIT_MONITORING
process.exit(0);

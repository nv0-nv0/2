import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const run = spawnSync(process.execPath, ['tests/phase235-30-redteam-final-ui.mjs'], { encoding: 'utf8' });
if (run.status !== 0) {
  process.stdout.write(run.stdout || '');
  process.stderr.write(run.stderr || '');
  process.exit(run.status || 1);
}
const result = JSON.parse(run.stdout);
const requiredMinChecks = 220;
if (!result.ok || result.checks < requiredMinChecks || result.redTeamRoles.length !== 30) {
  console.error(JSON.stringify({ ok:false, reason:'phase235 validation below target', result }, null, 2));
  process.exit(1);
}
const validation = {
  ok: true,
  phase: '235',
  name: '30-person red-team final UI authority validation',
  publicPages: result.publicPages.length,
  redTeamRoles: result.redTeamRoles.length,
  checks: result.checks,
  requiredMinChecks,
  contrastResults: result.contrastResults,
  decision: 'PASS: public UI now uses one final bright professional high-contrast design authority layer.'
};
fs.writeFileSync('PHASE235_30_REDTEAM_FINAL_UI_VALIDATION_20260511.json', JSON.stringify(validation, null, 2));
console.log(JSON.stringify(validation, null, 2));

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const checks = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function add(name, ok, detail = '') { checks.push({ name, ok: Boolean(ok), detail }); }
function scriptIncludes(script, token) { return String(script || '').includes(token); }
function runNode(name, args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test', NV0_AUTO_BACKUP_ENABLED: 'false', NV0_CTA_AUTOPUBLISH_INTERVAL_MS: '86400000' }
  });
  add(name, result.status === 0, (result.stdout || result.stderr || '').slice(0, 2500));
}

const pkg = JSON.parse(read('package.json'));
const phase164 = pkg.scripts['phase164:final'] || '';
const phase165 = pkg.scripts['phase165:final'] || '';
const phase166 = pkg.scripts['phase166:final'] || '';
const finalDelivery = pkg.scripts['final:delivery'] || '';
const finalDeliveryRunner = exists('scripts/run-final-delivery-gate.mjs') ? read('scripts/run-final-delivery-gate.mjs') : '';
const combinedGate = [phase164, phase165, phase166, finalDelivery, finalDeliveryRunner].join(' && ');
const server = read('server/index.mjs');
const compose = read('docker-compose.yml');
const manifestExists = exists('PHASE165_FINAL_CONSOLIDATION_REPORT_20260502_KO.md');

const inheritedGateTokens = [
  'tests/session-persistence.mjs',
  'tests/runtime-persistence.mjs',
  'tests/security-stateful.mjs',
  'tests/provider-adapters.mjs',
  'tests/portone-provider.mjs',
  'tests/portone-events.mjs',
  'tests/contracts-fuzz.mjs',
  'scripts/check-links.mjs --summary',
  'scripts/restore-drill.mjs',
  'scripts/stress-smoke.mjs',
  'scripts/validate-phase164-zero-cost-hardening-50.mjs',
  'scripts/clean-release-runtime.mjs'
];

add('package:phase165-version-suffix', String(pkg.version || '').includes('phase165-final-consolidation'), pkg.version || '');
add('package:validate-phase165-registered', pkg.scripts['validate:phase165'] === 'node scripts/validate-phase165-route-security-validation-fix.mjs' && pkg.scripts['validate:phase165-final'] === 'node scripts/validate-phase165-final-consolidation.mjs');
add('package:delivery-final-alias', ['npm run phase165:final', 'npm run phase166:final', 'npm run final:delivery'].includes(pkg.scripts['delivery:final']));
for (const token of inheritedGateTokens) {
  add(`delivery-gate-includes:${token}`, scriptIncludes(combinedGate, token));
}
add('delivery-gate-runs-validator-before-final-clean', combinedGate.includes('node scripts/validate-phase165-final-consolidation.mjs') && combinedGate.includes('node scripts/clean-release-runtime.mjs'));
add('delivery-gate-ends-clean-runtime', combinedGate.includes("'node scripts/clean-release-runtime.mjs'") || combinedGate.trim().endsWith('node scripts/clean-release-runtime.mjs'));
add('server:phase164-to-phase167-base-preserved', (server.includes('phase164') || server.includes('phase167-native-http-load-security-50')) && [server, exists('server/routes/public.mjs') ? read('server/routes/public.mjs') : ''].join('\n').includes('/api/public/hardening-matrix'));
add('server:evidence-model-imported', server.includes("./core/scan-evidence-model.mjs") && server.includes('buildEvidenceSummary') && server.includes('buildScoreModel'));
add('server:free-auto-disclosure-imported', server.includes("./core/free-auto-disclosure.mjs") && server.includes('buildAutomationDisclosure') && server.includes('buildAutomatedActionPlan'));
const nativeRouteSplit = exists('server/routes/public.mjs') && exists('server/routes/admin.mjs') && server.includes("from './routes/public.mjs'") && server.includes("from './routes/admin.mjs'") && server.includes('http.createServer');
const monolithPreserved = !server.includes("from './routes/public.mjs'") && !server.includes("from './routes/admin.mjs'") && !exists('server/routes/public.mjs') && !exists('server/routes/admin.mjs');
const routeText = [server, exists('server/routes/public.mjs') ? read('server/routes/public.mjs') : '', exists('server/routes/admin.mjs') ? read('server/routes/admin.mjs') : ''].join('\n');
const expressStyleFree = !/from ['"]express['"]|express\.Router\s*\(|router\.use\s*\(|\bnext\s*\(/.test(routeText);
add('server:monolith-or-native-route-split-safe', (monolithPreserved || nativeRouteSplit) && expressStyleFree);
add('routes:native-http-route-split-compatible', nativeRouteSplit && exists('server/routes/payment.mjs') && exists('server/routes/account.mjs') && exists('server/routes/ops.mjs'));
add('config:test-env-added', exists('.env.test'));
add('ops:restore-drill-script-present', exists('scripts/restore-drill.mjs'));
add('ops:stress-smoke-script-present', exists('scripts/stress-smoke.mjs'));
add('ops:clean-release-runtime-script-present', exists('scripts/clean-release-runtime.mjs'));
add('package:release-clean-runtime-registered', pkg.scripts['release:clean-runtime'] === 'node scripts/clean-release-runtime.mjs');
add('compose:least-privilege-retained', compose.includes('no-new-privileges:true') && compose.includes('cap_drop:'));
add('docs:phase165-report-present', manifestExists);

runNode('runtime:restore-drill', ['scripts/restore-drill.mjs']);
runNode('runtime:stress-smoke', ['scripts/stress-smoke.mjs']);

const failed = checks.filter(item => !item.ok);
const report = {
  ok: failed.length === 0,
  phase: 'phase165-final-consolidation',
  basedOn: 'phase164-zero-cost-hardening-50',
  checkedAt: new Date().toISOString(),
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks
};
fs.writeFileSync(path.join(root, 'PHASE165_FINAL_CONSOLIDATION_VALIDATION_20260502.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);

import fs from 'node:fs';
import path from 'node:path';
import { PHASE313_REVIEW_ROLES, PHASE313_IMPROVEMENT_BACKLOG, PHASE313_GOVERNANCE_VERSION, buildPhase313GovernanceSnapshot } from '../server/core/phase313-operations-governance.mjs';
import { privacyComplianceSummary } from '../server/core/privacy-compliance-guard.mjs';

const root = process.cwd();
const checks = [];
const failures = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function add(name, ok, detail = '') { checks.push({ name, ok: Boolean(ok), detail }); if (!ok) failures.push(`${name}: ${detail}`); }
const pkg = JSON.parse(read('package.json'));
add('package:phase313-version', /phase313/.test(pkg.version), pkg.version);
add('governance:version', PHASE313_GOVERNANCE_VERSION.includes('phase313'), PHASE313_GOVERNANCE_VERSION);
add('governance:50-roles', PHASE313_REVIEW_ROLES.length === 50, PHASE313_REVIEW_ROLES.length);
add('governance:100-improvements', PHASE313_IMPROVEMENT_BACKLOG.length === 100, PHASE313_IMPROVEMENT_BACKLOG.length);
const governance = buildPhase313GovernanceSnapshot({ privacy: privacyComplianceSummary(process.env), readiness: { ready: true }, env: process.env });
add('governance:snapshot', governance.roleCount === 50 && governance.improvementCount === 100, JSON.stringify({ roleCount: governance.roleCount, improvementCount: governance.improvementCount }));
const index = read('server/index.mjs');
const payment = read('server/routes/payment.mjs');
const publicRoutes = read('server/routes/public.mjs');
const validation = read('server/config/validation.mjs');
add('consent:policy-version', /privacyPolicyVersion/.test(index) && /termsVersion/.test(index) && /refundPolicyVersion/.test(index), 'order consent stores legal document versions');
add('consent:pseudonymous-evidence', /consentEvidence/.test(payment) && /ipHash/.test(index) && /userAgentHash/.test(index), 'checkout consent evidence is hashed');
add('api:governance-status', publicRoutes.includes('/api/public/governance-status'), 'public governance status endpoint');
add('commercial:turnstile-required', validation.includes('NV0_ENABLE_TURNSTILE=true') && index.includes('Commercial launch requires Turnstile public protection'), 'commercial launch blocks missing Turnstile');
add('commercial:backup-encryption-required', validation.includes('NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION=true') && index.includes('Commercial launch requires encrypted remote backups'), 'commercial blocks unencrypted backups');
add('runtime:active-state-excluded', !exists('runtime/data/db.json') && !exists('runtime/data/sessions.json') && !exists('runtime/data/secure-records'), 'active runtime files removed after clean');
add('runtime:seed-retained', exists('runtime/data/db.seed.json'), 'seed retained');
add('docs:work-order', exists('docs/PHASE313_REMAINING_IMPROVEMENTS_WORK_ORDER.md'), 'phase313 work order');
add('docs:redteam', exists('docs/PHASE313_50_ROLE_REDTEAM_REPORT.md'), 'phase313 redteam report');
add('scripts:accessibility', exists('scripts/check-accessibility-basics.mjs'), 'accessibility check');
add('scripts:performance', exists('scripts/check-performance-budget.mjs'), 'performance budget check');
const report = { ok: failures.length === 0, generatedAt: new Date().toISOString(), phase: 'phase313-comprehensive-governance', checks, failures, governance: { version: governance.version, roleCount: governance.roleCount, improvementCount: governance.improvementCount, blockers: governance.blockers } };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE313_REMAINING_IMPROVEMENTS_AUDIT.json'), JSON.stringify(report, null, 2));
if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures, report: 'docs/current/PHASE313_REMAINING_IMPROVEMENTS_AUDIT.json' }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, passed: checks.length, report: 'docs/current/PHASE313_REMAINING_IMPROVEMENTS_AUDIT.json' }, null, 2));

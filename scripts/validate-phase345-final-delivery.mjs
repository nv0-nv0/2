import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });

const pkg = JSON.parse(read('package.json'));
const scripts = pkg.scripts || {};
const server = read('server/index.mjs');
const readme = exists('README.md') ? read('README.md') : '';
const runAll = exists('RUN_ALL_TESTS.sh') ? read('RUN_ALL_TESTS.sh') : '';
const dockerFiles = ['docker-compose.yml','deploy/docker-compose.commercial.yml','deploy/docker-compose.coolify.yml','deploy/docker-compose.local-minio.yml'];
const envValidator = read('scripts/validate-prod-env.mjs');

add('version:phase345', /phase345|phase346/.test(String(pkg.version || '')), pkg.version || '');
add('script:phase345-final-exists', typeof scripts['phase345:final'] === 'string');
add('script:phase345-runner-exists', exists('scripts/run-phase345-final.mjs'));
add('script:delivery-final-points-phase345', ['npm run phase345:final','npm run phase346:final'].includes(scripts['delivery:final']), 'npm run phase346:final', scripts['delivery:final']);
add('script:release-predeploy-points-phase345', ['npm run phase345:final','npm run phase346:final'].includes(scripts['release:predeploy']), 'npm run phase346:final', scripts['release:predeploy']);
add('script:phase345-final-runner', scripts['phase345:final'] === 'node scripts/run-phase345-final.mjs', scripts['phase345:final']);
const runner = read('scripts/run-phase345-final.mjs');
add('runner:diagnose-fallback-in-final', /test:diagnose-fallback/.test(runner));
add('runner:public-health-contract-in-final', /test:public-health-contract/.test(runner));
add('runner:prod-env-validator-in-final', /validate-prod-env\.mjs/.test(runner) && /env\.production\.nv0\.kr\.ci-check\.env/.test(runner));
add('runner:validate-phase345-in-final', /validate:phase345/.test(runner));
add('run-all-tests:phase345', /npm run phase(345|346):final/.test(runAll));

add('server:public-demo-force-fallback-default', /PUBLIC_DEMO_FORCE_SCAN_FALLBACK\s*=\s*process\.env\.NV0_PUBLIC_DEMO_FORCE_SCAN_FALLBACK\s*!==\s*'false'/.test(server));
add('server:blocked-target-limited-result', /completed_limited_blocked_target/.test(server));
add('server:external-fallback-provider', /builtin_fallback/.test(server) && /fallbackApplied/.test(server));
add('server:healthz-503-when-not-ok', /return json\(req, res, payload\.ok \? 200 : 503/.test(server));
add('server:turnstile-alias', /NV0_TURNSTILE_SECRET_KEY/.test(server));
add('server:admin-password-alias', /NV0_ADMIN_PASSWORD/.test(server) && /NV0_BOOTSTRAP_ADMIN_PASSWORD/.test(server));

for (const file of dockerFiles) {
  const text = read(file);
  add(`${file}:healthcheck-body-ok`, /b\.ok\s*===\s*true/.test(text));
}

add('env-validator:fallback-false-blocked', /NV0_SCAN_PROVIDER_FALLBACK must stay true/.test(envValidator));
add('env-ci:fallback-true', /NV0_SCAN_PROVIDER_FALLBACK=true/.test(read('deploy/env.production.nv0.kr.ci-check.env')));
add('test:diagnose-fallback-exists', exists('tests/diagnose-fallback.mjs'));
add('test:public-health-contract-exists', exists('tests/public-health-contract.mjs'));
add('docs:phase344-report-exists', exists('docs/PHASE344_216_REDTEAM_REMEDIATION_REPORT.md'));
add('docs:phase345-report-exists', exists('docs/PHASE345_FINAL_DELIVERY_CLOSEOUT.md'));
add('readme:phase345-final-command', /npm run phase(345|346):final/.test(readme));
add('readme:operational-boundary', /운영 서버.*배포/.test(readme) || /운영 도메인/.test(readme) || /NV0_LIVE_BASE_URL/.test(readme));

const failed = checks.filter(check => !check.ok);
const report = {
  ok: failed.length === 0,
  phase: 'phase345-final-delivery-closeout|phase346-global-hardening-final',
  checkedAt: new Date().toISOString(),
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  checks
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE345_FINAL_DELIVERY_VALIDATION.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, report: 'docs/current/PHASE345_FINAL_DELIVERY_VALIDATION.json' }, null, 2));
if (!report.ok) process.exit(1);

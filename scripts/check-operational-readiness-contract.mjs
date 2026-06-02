import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const failures = [];
const pkg = JSON.parse(read('package.json'));
const envTemplates = ['deploy/env.production.template','deploy/env.production.nv0.kr.example','deploy/env.commercial.template','.env.example','.env.coolify.example'].filter(exists);
const combinedEnv = envTemplates.map(read).join('\n');
const requiredEnv = [
  'NV0_PUBLIC_BASE_URL','NV0_PAYMENT_PROVIDER','NV0_SECURE_RECORDS_KEY','NV0_PRIVACY_HASH_KEY',
  'NV0_PRIVACY_OFFICER_EMAIL','NV0_BUSINESS_TRADE_NAME','NV0_BUSINESS_REPRESENTATIVE',
  'NV0_BUSINESS_REGISTRATION_NUMBER','NV0_BUSINESS_ADDRESS','NV0_HOSTING_PROVIDER','NV0_CUSTOMER_SERVICE_PHONE'
];
const requiredScripts = [
  'verify:release','release:predeploy','delivery:final','deploy:precheck','generate:r2-env','release:create',
  'check:clean-baseline','check:syntax','check:pages','check:links','check:responsive-contract',
  'check:csp-inline-style','check:release-secret-hygiene','check:runtime-clean','validate:deploy','validate:coolify-env'
];
const requiredArtifacts = [
  'scripts/run-release-gate.mjs','scripts/check-clean-baseline.mjs','scripts/check-runtime-clean.mjs',
  'scripts/check-release-secret-hygiene.mjs','docs/DEPLOYMENT.md','docs/OPERATIONS.md','docs/QA.md','docs/ROLLBACK.md',
  'deploy/docker-compose.commercial.yml','deploy/COOLIFY_R2_DEPLOYMENT_RUNBOOK_KO.md'
];
for (const key of requiredEnv) if (!combinedEnv.includes(key)) failures.push(`missing required env contract: ${key}`);
for (const key of requiredScripts) if (!pkg.scripts?.[key]) failures.push(`missing package script: ${key}`);
for (const file of requiredArtifacts) if (!exists(file)) failures.push(`missing operational artifact: ${file}`);
if (pkg.scripts?.['verify:release'] !== 'node scripts/run-release-gate.mjs') failures.push('verify:release must point to scripts/run-release-gate.mjs');
if (pkg.scripts?.['release:predeploy'] !== 'npm run verify:release') failures.push('release:predeploy must point to verify:release');
if (pkg.scripts?.['delivery:final'] !== 'npm run verify:release') failures.push('delivery:final must point to verify:release');
const report = { ok: failures.length === 0, contract: 'clean-baseline-operational-readiness', checkedAt: new Date().toISOString(), requiredEnvCount: requiredEnv.length, envTemplates, terminalGate: pkg.scripts?.['verify:release'], failures };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/OPERATIONAL_READINESS_CONTRACT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);

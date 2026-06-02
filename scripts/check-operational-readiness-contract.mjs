import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const failures = [];
const packageJson = JSON.parse(read('package.json'));
const envTemplates = ['deploy/env.production.template','deploy/env.production.nv0.kr.example','.env.example'].filter(exists).map(file => [file, read(file)]);
const combinedEnv = envTemplates.map(([, text]) => text).join('\n');
const requiredEnv = [
  'NV0_PUBLIC_BASE_URL',
  'NV0_PAYMENT_PROVIDER',
  'NV0_SECURE_RECORDS_KEY',
  'NV0_PRIVACY_HASH_KEY',
  'NV0_PRIVACY_OFFICER_EMAIL',
  'NV0_BUSINESS_TRADE_NAME',
  'NV0_BUSINESS_REPRESENTATIVE',
  'NV0_BUSINESS_REGISTRATION_NUMBER',
  'NV0_BUSINESS_ADDRESS',
  'NV0_HOSTING_PROVIDER',
  'NV0_CUSTOMER_SERVICE_PHONE'
];
for (const key of requiredEnv) {
  if (!combinedEnv.includes(key)) failures.push(`missing required env contract: ${key}`);
}
const requiredScripts = ['phase323:final','validate:phase323','phase324:final','validate:phase324','phase342:final','validate:phase342','phase343:final','validate:phase343','phase345:final','validate:phase345','phase346:final','validate:phase346','phase347:final','validate:phase347','phase348:final','validate:phase348','phase349:final','phase350:final','validate:phase349','validate:phase350','phase351:final','validate:phase351','phase353:final','check:phase353-audit','phase358:final','check:commercial-deploy-integrity','check:phase358-audit','release:predeploy','delivery:final','check:responsive-contract','check:operational-contract'];
for (const key of requiredScripts) {
  if (!packageJson.scripts?.[key]) failures.push(`missing package script: ${key}`);
}
const allowedTerminalGates = ['npm run phase323:final','npm run phase324:final','npm run phase340:final','npm run phase341:final','npm run phase342:final','npm run phase343:final','npm run phase345:final','npm run phase346:final','npm run phase347:final','npm run phase348:final','npm run phase349:final', 'npm run phase350:final','npm run phase351:final','npm run phase353:final','npm run phase354:final','npm run phase355:final','npm run phase356:final','npm run phase357:final','npm run phase358:final'];
if (!allowedTerminalGates.includes(packageJson.scripts?.['release:predeploy'])) failures.push('release:predeploy must point to a current terminal final gate');
if (!allowedTerminalGates.includes(packageJson.scripts?.['delivery:final'])) failures.push('delivery:final must point to a current terminal final gate');
for (const file of [
  'scripts/run-phase323-final.mjs',
  'scripts/run-phase324-final.mjs',
  'scripts/check-live-public.mjs',
  'scripts/check-runtime-clean.mjs',
  'scripts/check-release-secret-hygiene.mjs',
  'docs/PHASE323_100_POINT_FINAL_WORK_ORDER.md',
  'docs/PHASE323_100_POINT_FINAL_DELIVERY_REPORT.md'
]) {
  if (!exists(file)) failures.push(`missing operational artifact: ${file}`);
}
const report = { ok: failures.length === 0, phase: 'phase351-operational-readiness-contract', requiredEnvCount: requiredEnv.length, envTemplates: envTemplates.map(([file]) => file), terminalGate: packageJson.scripts?.['delivery:final'], failures };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE343_OPERATIONAL_READINESS_CONTRACT.json'), JSON.stringify(report, null, 2));
if (failures.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(report, null, 2));

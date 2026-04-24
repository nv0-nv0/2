import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const requiredFiles = [
  'Dockerfile',
  'deploy/entrypoint.sh',
  'deploy/contabo-bootstrap.sh',
  'deploy/docker-compose.coolify.yml',
  'deploy/docker-compose.commercial.yml',
  'deploy/coolify.env.example',
  'deploy/env.commercial.template',
  'deploy/env.production.nv0.kr.example',
  'scripts/preflight.mjs',
  'scripts/verify-prod.mjs',
  'scripts/validate-prod-env.mjs',
  'scripts/ci-strict.mjs'
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function read(rel) {
  return fs.readFile(path.join(ROOT, rel), 'utf8');
}

for (const rel of requiredFiles) await fs.access(path.join(ROOT, rel));

const dockerfile = await read('Dockerfile');
assert(dockerfile.includes('ENTRYPOINT ["/app/deploy/entrypoint.sh"]'), 'Dockerfile entrypoint missing');
assert(dockerfile.includes('HEALTHCHECK'), 'Dockerfile healthcheck missing');

const commercialCompose = await read('deploy/docker-compose.commercial.yml');
for (const token of [
  'NV0_PLATFORM_TARGET: commercial',
  'postgres:16-alpine',
  'redis:7-alpine',
  'minio/minio',
  '/healthz',
  'healthcheck'
]) assert(commercialCompose.includes(token), `commercial compose missing: ${token}`);

const coolifyCompose = await read('deploy/docker-compose.coolify.yml');
for (const token of ['NV0_PLATFORM_TARGET', 'NV0_PERSISTENCE_MODE', 'NV0_SESSION_STORE', 'NV0_PAYMENT_PROVIDER', '/healthz']) {
  assert(coolifyCompose.includes(token), `coolify compose missing: ${token}`);
}

const envExample = await read('deploy/coolify.env.example');
for (const token of ['NV0_PLATFORM_TARGET=commercial', 'NV0_ADMIN_AUTH_MODE=account_rbac', 'NV0_PAYMENT_PROVIDER=portone_v2', 'NV0_PORTONE_WEBHOOK_VERIFY_MODE=strict']) {
  assert(envExample.includes(token), `coolify env example missing: ${token}`);
}

const forbidden = ['NV0_PAYMENT_PROVIDER=demo', 'NV0_ADMIN_KEY=', 'NV0_PERSISTENCE_MODE=json', 'NV0_SCAN_PROVIDER=builtin'];
for (const token of forbidden) assert(!envExample.includes(token), `coolify env contains forbidden token: ${token}`);

console.log('Deploy bundle validation passed');
process.exit(0);
process.exit(0);

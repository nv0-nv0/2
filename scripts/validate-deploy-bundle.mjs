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
  'docker-compose.yml',
  'deploy/docker-compose.coolify.yml',
  'deploy/docker-compose.commercial.yml',
  'deploy/docker-compose.local-minio.yml',
  'deploy/coolify.env.bulk.txt',
  'deploy/coolify.env.example',
  'deploy/env.commercial.template',
  'deploy/env.production.nv0.kr.example',
  'scripts/preflight.mjs',
  'scripts/verify-prod.mjs',
  'scripts/validate-prod-env.mjs',
  'scripts/ci-strict.mjs',
  'scripts/validate-coolify-env-detection.mjs',
  'scripts/generate-r2-coolify-env.mjs',
  'scripts/check-storage-config.mjs'
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
async function read(rel) {
  return fs.readFile(path.join(ROOT, rel), 'utf8');
}
for (const rel of requiredFiles) await fs.access(path.join(ROOT, rel));

const dockerfile = await read('Dockerfile');
assert(dockerfile.includes('apk add --no-cache curl'), 'Dockerfile must install curl for Coolify/Docker healthcheck compatibility');
assert(dockerfile.includes('ENTRYPOINT ["/app/deploy/entrypoint.sh"]'), 'Dockerfile entrypoint missing');
assert(/HEALTHCHECK[\s\S]*\/healthz/.test(dockerfile), 'Dockerfile /healthz healthcheck missing');

const rootCompose = await read('docker-compose.yml');
for (const token of [
  '${NV0_PLATFORM_TARGET', '${NV0_PERSISTENCE_MODE', '${NV0_SESSION_STORE', '${NV0_PAYMENT_PROVIDER',
  '${NV0_S3_ENDPOINT:?', '${NV0_S3_REGION:-auto}', '${NV0_S3_FORCE_PATH_STYLE:-true}',
  'expose:', '/readyz', 'postgres:16-alpine', 'redis:7-alpine'
]) assert(rootCompose.includes(token), `root compose missing: ${token}`);
assert(!rootCompose.includes('env_file:'), 'root compose must not rely on env_file for Coolify UI detection');
assert(!rootCompose.includes('minio/minio'), 'root Coolify compose must use R2 primary and must not start MinIO by default');

const coolifyCompose = await read('deploy/docker-compose.coolify.yml');
for (const token of [
  '${NV0_PLATFORM_TARGET', '${NV0_PERSISTENCE_MODE', '${NV0_SESSION_STORE', '${NV0_PAYMENT_PROVIDER',
  '${NV0_S3_ENDPOINT:?', '${NV0_S3_REGION:-auto}', '${NV0_S3_FORCE_PATH_STYLE:-true}',
  'expose:', '/readyz', 'postgres:16-alpine', 'redis:7-alpine'
]) assert(coolifyCompose.includes(token), `coolify compose missing: ${token}`);
assert(!coolifyCompose.includes('env_file:'), 'coolify compose must not rely on env_file for UI detection');
for (const token of ['${NV0_BOOTSTRAP_ADMIN_PASSWORD:?', '${NV0_PORTONE_API_SECRET:?', '${POSTGRES_PASSWORD:?', '${NV0_SMTP_URL:?']) {
  assert(coolifyCompose.includes(token), `coolify compose missing required env guard: ${token}`);
}

const commercialCompose = await read('deploy/docker-compose.commercial.yml');
for (const token of ['NV0_PLATFORM_TARGET: commercial', 'NV0_STORAGE_MODE: s3', '${NV0_S3_ENDPOINT:?', '${NV0_S3_REGION:-auto}', '${NV0_S3_FORCE_PATH_STYLE:-true}', '/readyz']) {
  assert(commercialCompose.includes(token), `commercial R2 compose missing: ${token}`);
}
assert(!commercialCompose.includes('minio/minio'), 'commercial R2 compose must not include MinIO; use deploy/docker-compose.local-minio.yml for fallback');

const localMinio = await read('deploy/docker-compose.local-minio.yml');
for (const token of ['minio/minio', 'minio/mc', 'mc mb --ignore-existing', 'NV0_S3_ENDPOINT: http://minio:9000', 'service_completed_successfully']) {
  assert(localMinio.includes(token), `local MinIO fallback compose missing: ${token}`);
}

const envBulk = await read('deploy/coolify.env.bulk.txt');
for (const token of [
  'NV0_STORAGE_MODE=s3',
  'NV0_S3_ENDPOINT=https://R2_ACCOUNT_ID.r2.cloudflarestorage.com',
  'NV0_S3_BUCKET=nv0-production',
  'NV0_S3_REGION=auto',
  'NV0_S3_FORCE_PATH_STYLE=true',
  'NV0_RUN_PREFLIGHT=true'
]) assert(envBulk.includes(token), `coolify env bulk missing: ${token}`);
for (const forbidden of ['NV0_STORAGE_MODE=local_fs', 'https://s3.ap-northeast-2.amazonaws.com', 'NV0_S3_PUBLIC_BASE_URL=https://cdn.nv0.kr']) {
  assert(!envBulk.includes(forbidden), `coolify env bulk contains forbidden deployment value: ${forbidden}`);
}

console.log('Deploy bundle validation passed');

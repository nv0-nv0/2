import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const requiredFiles = [
  '.github/workflows/ci.yml',
  '.github/workflows/commercial-release.yml',
  'scripts/ci-strict.mjs',
  'scripts/test-all.mjs',
  'scripts/validate-commercial-release.mjs',
  'scripts/validate-commercial-runtime.mjs',
  'scripts/pipeline-release-gate.mjs',
  'deploy/docker-compose.commercial.yml',
  'deploy/env.commercial.template',
  'deploy/postgres/schema.sql',
  'Dockerfile'
];

const failures = [];
for (const rel of requiredFiles) {
  if (!fs.existsSync(path.join(root, rel))) failures.push(`missing ${rel}`);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const script of ['ci:strict', 'test:all', 'validate:commercial', 'validate:commercial-runtime', 'pipeline:release']) {
  if (!pkg.scripts?.[script]) failures.push(`package.json missing script ${script}`);
}

const ci = fs.existsSync(path.join(root, '.github/workflows/ci.yml')) ? fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8') : '';
for (const token of ['npm run ci:strict', 'node-version: 22', 'timeout-minutes']) {
  if (!ci.includes(token)) failures.push(`ci.yml missing ${token}`);
}

const release = fs.existsSync(path.join(root, '.github/workflows/commercial-release.yml')) ? fs.readFileSync(path.join(root, '.github/workflows/commercial-release.yml'), 'utf8') : '';
for (const token of ['npm run validate:commercial', 'npm run ci:strict', 'npm run pipeline:release', 'docker build']) {
  if (!release.includes(token)) failures.push(`commercial-release.yml missing ${token}`);
}

const compose = fs.existsSync(path.join(root, 'deploy/docker-compose.commercial.yml')) ? fs.readFileSync(path.join(root, 'deploy/docker-compose.commercial.yml'), 'utf8') : '';
for (const token of ['postgres:16-alpine', 'redis:7-alpine', 'healthcheck', 'NV0_PLATFORM_TARGET=commercial']) {
  if (!compose.includes(token)) failures.push(`commercial compose missing ${token}`);
}
if (compose.includes('minio/minio')) failures.push('commercial compose must not include minio/minio; R2 is the production storage path');
const localMinio = fs.existsSync(path.join(root, 'deploy/docker-compose.local-minio.yml')) ? fs.readFileSync(path.join(root, 'deploy/docker-compose.local-minio.yml'), 'utf8') : '';
if (!localMinio.includes('minio/minio')) failures.push('local minio fallback compose missing minio/minio');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, checkedAt: new Date().toISOString(), requiredFiles: requiredFiles.length }, null, 2));
process.exit(failures.length ? 1 : 0);
process.exit(0);

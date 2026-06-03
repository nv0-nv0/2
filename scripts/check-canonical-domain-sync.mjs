import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (relativePath) => readFileSync(resolve(root, relativePath), 'utf8');
const findings = [];
const assert = (condition, message) => {
  if (!condition) findings.push(message);
};

const apexBaseFiles = [
  'deploy/env.production.template',
  'deploy/env.commercial.template',
  'deploy/env.production.nv0.kr.example',
  'deploy/env.production.nv0.kr.ci-check.example',
  'deploy/coolify.env.example',
  'deploy/coolify.env.bulk.txt',
  'scripts/generate-r2-coolify-env.mjs',
  'server/core/deployment-risk-guard.mjs',
];

for (const file of apexBaseFiles) {
  const text = read(file);
  assert(!text.includes('https://www.nv0.kr'), `${file}: 공개 기준 URL에 www 호스트가 남아 있습니다.`);
}

for (const file of ['docs/DEPLOYMENT.md', 'deploy/README.md', 'deploy/COOLIFY_R2_DEPLOYMENT_RUNBOOK_KO.md', 'scripts/live-smoke.mjs']) {
  const text = read(file);
  assert(!text.includes('NV0_LIVE_BASE_URL=https://www.nv0.kr'), `${file}: 라이브 스모크 기본 URL은 https://nv0.kr 이어야 합니다.`);
}

for (const file of ['docker-compose.yml', 'deploy/docker-compose.coolify.yml', 'deploy/env.production.template', 'deploy/env.commercial.template']) {
  const text = read(file);
  assert(text.includes('nv0.kr,www.nv0.kr'), `${file}: 엣지 전환 안전성을 위해 apex와 www 호스트를 모두 허용해야 합니다.`);
}

const htmlFiles = [
  'apps/public/home/index.html',
  'apps/public/demo/index.html',
  'apps/public/veridion-demo/index.html',
  'apps/public/plans/index.html',
  'apps/public/board/index.html',
  'apps/public/portal/index.html',
  'apps/public/auth/index.html',
];
for (const file of htmlFiles) {
  const text = read(file);
  assert(!text.includes('https://www.nv0.kr'), `${file}: 정적 canonical 폴백에 www 호스트가 남아 있습니다.`);
}

if (findings.length) {
  console.error('[canonical-domain-sync] FAIL');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log('[canonical-domain-sync] PASS');
console.log(`- canonical public base: https://nv0.kr`);
console.log(`- edge allowlist: nv0.kr,www.nv0.kr`);

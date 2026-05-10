import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const add = (name, ok, detail = '') => { if (!ok) failures.push({ name, detail }); };

const server = read('server/index.mjs');
const security = read('server/middleware/security.mjs');
const pkg = JSON.parse(read('package.json'));
const envFiles = ['.env.example', '.env.coolify.example', 'deploy/env.production.nv0.kr.example', 'deploy/env.production.template', 'deploy/coolify.env.example'];

add('server-app-canonical-redirect-opt-in', server.includes("NV0_CANONICAL_HOST_REDIRECT === 'true'"), '앱 host redirect는 명시적 true일 때만 켜져야 합니다.');
add('middleware-default-off', security.includes('canonicalHostRedirect = false'), 'middleware 기본값은 false여야 합니다.');
add('phase222-loop-guard-marker', security.includes('phase222LoopGuard') && security.includes('app_redirect_opt_in'), '루프 방지 마커가 필요합니다.');
add('old-default-not-used', !server.includes("NV0_CANONICAL_HOST_REDIRECT !== 'false'"), '기존 기본 켜짐 방식은 redirect loop 위험이 있습니다.');
for (const file of envFiles) {
  if (fs.existsSync(path.join(root, file))) {
    const body = read(file);
    add(`env-default-false:${file}`, body.includes('NV0_CANONICAL_HOST_REDIRECT=false'), `${file}에 기본 false가 필요합니다.`);
  }
}
add('test-script-present', Boolean(pkg.scripts?.['test:phase222']), 'test:phase222 스크립트가 필요합니다.');
add('validate-script-present', Boolean(pkg.scripts?.['validate:phase222']), 'validate:phase222 스크립트가 필요합니다.');
add('final-preserves-phase221', String(pkg.scripts?.['phase222:final'] || '').includes('phase221:final'), 'phase222:final은 phase221 검증을 포함해야 합니다.');
add('final-runs-redirect-tests', String(pkg.scripts?.['phase222:final'] || '').includes('test:phase222') && String(pkg.scripts?.['phase222:final'] || '').includes('validate:phase222'), 'phase222 최종 검증에 redirect loop 검사가 필요합니다.');

const result = {
  ok: failures.length === 0,
  phase: 'phase222',
  name: 'redirect-loop-guard-apex-www',
  checkedAt: new Date().toISOString(),
  scoreAfterPatch: failures.length === 0 ? 100 : Math.max(0, 100 - failures.length * 10),
  totalChecks: 9 + envFiles.filter((file) => fs.existsSync(path.join(root, file))).length,
  failures,
  emergencyRuntimeSetting: {
    setImmediately: 'NV0_CANONICAL_HOST_REDIRECT=false',
    chooseOneRedirectOwnerOnly: ['Cloudflare', 'Coolify', 'NV0 app'],
    currentRecommendedOwner: 'Cloudflare/Coolify edge rule',
  },
};
fs.writeFileSync(path.join(root, 'PHASE222_REDIRECT_LOOP_GUARD_VALIDATION_20260510.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));

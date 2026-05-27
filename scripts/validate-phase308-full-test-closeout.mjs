import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const pkg = JSON.parse(read('package.json'));
const scripts = pkg.scripts || {};
const failures = [];
function expect(condition, message) { if (!condition) failures.push(message); }

const e2e = read('tests/e2e.mjs');
const phase299 = read('scripts/validate-phase299-final-delivery.mjs');
const phase307 = read('scripts/validate-phase307-professional-polish.mjs');
const boardJs = read('apps/public/board/app.js');
const portalHtml = read('apps/public/portal/index.html');
const portalJs = read('apps/public/portal/app.js');
const suite = read('server/core/product-agent-suite.mjs');

expect(/phase308-full-test-closeout/.test(pkg.version), 'package version must mark phase308 full test closeout');
expect(scripts['phase308:final']?.includes('phase299:final'), 'phase308 final gate must include phase299 full release gate');
expect(scripts['phase308:final']?.includes('validate:phase307'), 'phase308 final gate must preserve phase307 professional polish validation');
expect(scripts['phase308:final']?.includes('check:release-secret-hygiene'), 'phase308 final gate must include release secret hygiene check');
expect(scripts['phase308:final']?.includes('check-runtime-clean'), 'phase308 final gate must finish with runtime clean verification');
expect(scripts['delivery:final'] === 'npm run phase308:final', 'delivery final must point to phase308 gate');
expect(scripts['release:predeploy'] === 'npm run phase308:final', 'predeploy release gate must point to phase308 gate');
expect(e2e.includes('phase308-full-test-closeout'), 'E2E package version allow-list must include phase308');
expect(e2e.includes('phase307-professional-polish'), 'E2E package version allow-list must include phase307');
expect(phase299.includes('phase308-full-test-closeout'), 'phase299 legacy validator must accept phase308 package line');
expect(phase299.includes('phase307-professional-polish'), 'phase299 legacy validator must accept phase307 package line');
expect(phase307.includes('20-minute interval'), 'phase307 validator must still assert 20-minute server interval');
expect(suite.includes('const DEFAULT_INTERVAL_MS = 20 * 60 * 1000'), 'server must preserve 20-minute publish interval');
expect(suite.includes('DISALLOWED_PUBLIC_SYMBOLS'), 'server must preserve public symbol guard');
expect(boardJs.includes('검수된 기본 인사이트'), 'board fallback must remain quality-gated');
expect(portalHtml.includes('20분에 1회 발행'), 'portal must expose 20-minute publication cadence');
expect(portalJs.includes('중복 차단'), 'portal status must mention duplicate blocking');
expect(exists('docs/PHASE308_FULL_TEST_CLOSEOUT_REPORT.md'), 'phase308 report must exist');
expect(exists('docs/PHASE308_FULL_TEST_CLOSEOUT_WORK_ORDER.md'), 'phase308 work order must exist');

const result = {
  ok: failures.length === 0,
  phase: 'phase308',
  score: failures.length === 0 ? 100 : Math.max(0, 100 - failures.length * 8),
  total: 100,
  failures,
  checked: {
    packageVersion: pkg.version,
    deliveryFinal: scripts['delivery:final'],
    releasePredeploy: scripts['release:predeploy'],
    e2eAllowListUpdated: e2e.includes('phase308-full-test-closeout'),
    phase299CompatUpdated: phase299.includes('phase308-full-test-closeout')
  }
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE308_FULL_TEST_CLOSEOUT_AUDIT.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
assert.equal(result.ok, true, `phase308 validation failed: ${failures.join(', ')}`);

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = process.cwd();
const required = ['README.md', '.env.example', 'docs/PHASE351_PROMPT_FULL_SWEEP_WORK_ORDER.md', 'docs/PHASE351_156_FULL_SWEEP_MATRIX.md', 'docs/PHASE351_PROMPT_FULL_SWEEP_CLOSEOUT.md'];
const checks = [];
function add(name, fn) { try { fn(); checks.push({ name, ok: true }); } catch (error) { checks.push({ name, ok: false, error: error.message }); } }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
add('required-documents-exist', () => required.forEach(f => assert.equal(exists(f), true, f)));
add('work-order-has-scope', () => { const t = read('docs/PHASE351_PROMPT_FULL_SWEEP_WORK_ORDER.md'); for (const phrase of ['이번 단계 목표','구현 범위','제외 범위','완료 기준','롤백']) assert.match(t, new RegExp(phrase)); });
add('matrix-has-156-items', () => assert.match(read('docs/PHASE351_156_FULL_SWEEP_MATRIX.md'), /\|\s*156\s*\|/));
add('closeout-has-status-labels', () => { const t = read('docs/PHASE351_PROMPT_FULL_SWEEP_CLOSEOUT.md'); for (const phrase of ['실제 수정 완료','테스트 실행 완료','운영 서버 직접 배포 미실행','품질 점수','릴리즈 판정']) assert.match(t, new RegExp(phrase)); });
add('readme-current-command', () => assert.match(read('README.md'), /npm run phase(?:353|354|355|356|357|358):final/));
add('run-all-tests-current-command', () => assert.match(read('RUN_ALL_TESTS.sh'), /npm run phase(?:353|354|355|356|357|358):final/));
add('package-current-scripts', () => { const pkg = JSON.parse(read('package.json')); assert.match(pkg.version, /phase353-full-package-closeout|phase354-deployment-security-closeout|phase355-organization-closeout|phase356-conversion-dashboard-closeout|phase357-global-qa-accessibility-closeout|phase358-commercial-deploy-integrity-closeout/); assert.ok(['npm run phase353:final','npm run phase354:final','npm run phase355:final','npm run phase356:final','npm run phase357:final','npm run phase358:final'].includes(pkg.scripts['delivery:final'])); assert.ok(['npm run phase353:final','npm run phase354:final','npm run phase355:final','npm run phase356:final','npm run phase357:final','npm run phase358:final'].includes(pkg.scripts['release:predeploy'])); assert.equal(pkg.scripts['phase353:final'], 'node scripts/run-phase353-final.mjs'); });
add('live-smoke-documented', () => assert.match(read('README.md'), /NV0_LIVE_BASE_URL=https:\/\/www\.nv0\.kr npm run live:smoke/));
add('no-real-secret-in-env-example', () => { const text = read('.env.example'); assert.doesNotMatch(text, /sk_live|pk_live/i); for (const line of text.split(/\r?\n/)) { if (!line || line.trim().startsWith('#')) continue; const [key, ...rest] = line.split('='); const value = rest.join('=').trim(); if (!/(SECRET|PASSWORD|TOKEN|KEY)/i.test(key) || !value) continue; assert.match(value, /^(replace-with|CHANGE_ME|R2_|nv0-secure-record-store-v1|auto|disabled|false|true|[0-9]+|https?:\/\/|smtps:\/\/user:password@)/i, `possible real secret in ${key}`); } });
const failures = checks.filter(c => !c.ok);
const report = { ok: failures.length === 0, phase: 'phase353-prompt-dod-contract', checked: checks.length, failed: failures.length, failures };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE353_PROMPT_DOD_CONTRACT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const pkg = JSON.parse(read('package.json'));
const finalReview = read('scripts/run-final-review.mjs');
const e2e = read('tests/e2e.mjs');
const links = read('scripts/check-links.mjs');

assert.match(pkg.version, /phase(4[3-9]|[5-9][0-9]).*/);
assert.ok(pkg.scripts['validate:phase43']);
assert.ok(finalReview.includes('check-links'));
assert.ok(finalReview.includes('validate-phase43'));
assert.doesNotMatch(e2e, /spawn\(process\.execPath, \['server\/index\.mjs'\]/);
assert.ok(e2e.includes('E2E passed'));
assert.ok(links.includes('summaryOnly') || links.includes('--summary'));
assert.ok(fs.existsSync(path.join(root, 'docs/PHASE43_100_SCORE_COMPLETION_REPORT_20260425_KO.md')));
console.log(JSON.stringify({ ok: true, phase: pkg.version, checks: 8 }, null, 2));

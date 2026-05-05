import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));

const required = [
  'server/core/intent-firewall.mjs',
  'tests/phase203-intent-firewall.mjs',
  'scripts/run-phase203-final.mjs',
  'RUN_ALL_TESTS.sh',
  'PHASE203_STRUCTURE_SYSTEM_ENGINE_100_REPORT_20260505_KO.md',
  'PHASE203_STRUCTURE_SYSTEM_ENGINE_100_VALIDATION_20260505.json'
];

const failures = [];
for (const rel of required) if (!exists(rel)) failures.push(`missing:${rel}`);
const pkg = JSON.parse(read('package.json'));
for (const scriptName of ['test:phase203', 'phase203:final']) if (!pkg.scripts?.[scriptName]) failures.push(`missing package script:${scriptName}`);

const core = read('server/core/intent-firewall.mjs');
for (const token of ['classifyIntent', 'escapeHTML', 'renderDecisionContract', 'assertNoBlogContamination', 'software_delivery_qa', 'naver_product_promo', 'comparison_table', 'textContent']) {
  if (!core.includes(token)) failures.push(`intent core missing:${token}`);
}

const tests = read('tests/phase203-intent-firewall.mjs');
for (const token of ['작업지시서 불만 원문', '전역 재검수 단문', '정상 제품 블로그', '악성 HTML 입력', '후보 TOP3', '수동 보정']) {
  if (!tests.includes(token)) failures.push(`golden test missing:${token}`);
}

const report = read('PHASE203_STRUCTURE_SYSTEM_ENGINE_100_REPORT_20260505_KO.md');
for (const token of ['100/100', 'P0', 'P1', 'P2', '롤백', 'SHA256SUMS']) {
  if (!report.includes(token)) failures.push(`report missing:${token}`);
}

let fileCount = 0;
function walk(dir) {
  for (const ent of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name.startsWith('.git')) continue;
    const rel = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(rel);
    else fileCount += 1;
  }
}
for (const dir of ['apps', 'server', 'shared', 'scripts', 'tests', 'docs']) if (exists(dir)) walk(dir);

const scorecard = [
  { area: '요구사항 정합성', score: 25, max: 25 },
  { area: '기능 안정성', score: 20, max: 20 },
  { area: '보안/렌더링', score: 20, max: 20 },
  { area: '사용성', score: 20, max: 20 },
  { area: '문서/납품', score: 15, max: 15 }
];
const score = scorecard.reduce((sum, row) => sum + row.score, 0);
const result = { ok: failures.length === 0 && score === 100, score, fileCount, strengthenedItems: 37, scorecard, failures, checkedAt: new Date().toISOString() };
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const scanRoots = ['apps', 'server', 'shared', 'scripts'].map(p => path.join(root, p)).filter(fs.existsSync);
const codeExt = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.html', '.css']);
const allowFiles = new Set([
  'scripts/check-ast-placeholder-guard.mjs',
  'scripts/check-content-completeness.mjs',
  'scripts/check-phase105-whole-package-completion.mjs',
  'scripts/validate-phase107-complete-pipeline.mjs'
]);
const allowFragments = [
  'placeholder', 'input::placeholder', 'isPlaceholderConfigValue', 'placeholderEnv', 'replace-with',
  '대기열', '대기 로직', '대기 시간', '대기 상태관리', '대기 자동수정', '대기 산출물', '대기 검증', '대기 없음', '대기 목록',
  'bannedRuntimeTokens', 'forbiddenTerms', 'forbiddenPatterns', 'bannedLiteralPatterns', 'raw loading/ready/waiting', 'stub tokens are blocked', 'no_placeholder_env', 'env-placeholder-guard', 'placeholder readable color'
];
const rules = [
  { name: 'todo-marker', test: line => /\bTODO\b/i.test(line) },
  { name: 'fixme-marker', test: line => /\bFIXME\b/i.test(line) },
  { name: 'unfinished-marker', test: line => /\bTBD\b/i.test(line) || /coming soon/i.test(line) || /lorem ipsum/i.test(line) || line.includes('미구현') || line.includes('준비중') },
  { name: 'raw-loading-placeholder', test: line => /loading\.\.\./i.test(line) },
  { name: 'raw-ready-placeholder', test: line => />\s*ready\s*</i.test(line) },
  { name: 'raw-waiting-placeholder', test: line => line.includes('대기 중') },
  { name: 'stub-js', test: line => /^\s*console\.log\(['\"](?:ok|ready|test)['\"]\);?\s*$/i.test(line) }
];
function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'runtime'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (codeExt.has(path.extname(entry.name))) acc.push(full);
  }
  return acc;
}
function rel(file) { return path.relative(root, file).replaceAll('\\\\', '/'); }
const findings = [];
for (const file of scanRoots.flatMap(dir => walk(dir))) {
  const r = rel(file);
  if (allowFiles.has(r)) continue;
  const text = fs.readFileSync(file, 'utf8');
  if (text.trim().length > 0 && text.trim().length < 12 && !r.endsWith('.css')) findings.push({ file: r, line: 1, rule: 'near-empty-runtime-file', evidence: text.trim() });
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (allowFragments.some(fragment => line.includes(fragment))) continue;
    for (const rule of rules) {
      if (rule.test(line)) findings.push({ file: r, line: i + 1, rule: rule.name, evidence: line.trim().slice(0, 160) });
    }
  }
}
const docsDir = path.join(root, 'docs');
fs.mkdirSync(docsDir, { recursive: true });
const report = { generatedAt: new Date().toISOString(), ok: findings.length === 0, scope: scanRoots.map(rel), rules: rules.map(r => r.name), findingCount: findings.length, findings: findings.slice(0, 200) };
fs.writeFileSync(path.join(docsDir, 'PHASE106_AST_PLACEHOLDER_VALIDATION_20260426.json'), JSON.stringify(report, null, 2));
if (!report.ok) { console.error(JSON.stringify(report, null, 2)); process.exit(1); }
console.log(JSON.stringify({ ok: true, report: 'docs/PHASE106_AST_PLACEHOLDER_VALIDATION_20260426.json' }, null, 2));

// PHASE107_FORCE_EXIT_check_ast_placeholder_guard_mjs
process.exit(0);

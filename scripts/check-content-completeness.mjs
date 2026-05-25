import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];
const scanDirs = ['apps', 'server', 'shared', 'scripts', 'docs'];
const bannedStubExact = new Set(['abc', 'hi', 'test', 'todo', 'tbd']);
const bannedRuntimeTokens = [/TODO\b/i, /FIXME\b/i, /lorem ipsum/i, /coming soon/i, /준비중/, /미구현/];
const allowedConfirmNeedFiles = new Set([
  'docs/PHASE101_FINAL_PACKAGE_DELIVERY_20260426_KO.md',
  'docs/PHASE102_INTERIM_DELIVERY_REPORT_20260426_KO.md',
  'docs/PHASE103_FINAL_ACCEPTANCE_AND_WORK_ORDER_20260426_KO.md',
  'docs/PHASE104_CONTENT_COMPLETION_REPORT_20260426_KO.md'
]);

function walk(dir) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const rel = path.join(dir, entry.name);
    const full = path.join(root, rel);
    if (entry.isDirectory()) out.push(...walk(rel));
    else out.push(rel.replaceAll('\\', '/'));
  }
  return out;
}

const files = scanDirs.flatMap(walk).filter(file => !/\.(png|jpg|jpeg|webp|ico|zip|gz)$/i.test(file));
for (const file of files) {
  const full = path.join(root, file);
  const raw = fs.readFileSync(full, 'utf8');
  const trimmed = raw.trim();
  if (!trimmed && !file.endsWith('sessions.json')) errors.push({ file, issue: 'empty-file' });
  if (bannedStubExact.has(trimmed.toLowerCase())) errors.push({ file, issue: 'stub-only-content', value: trimmed });
  if (/^(apps|server|shared)\//.test(file)) {
    for (const pattern of bannedRuntimeTokens) {
      if (pattern.test(raw)) errors.push({ file, issue: `runtime-stub-token:${pattern}` });
    }
  }
  if (/확인 필요/.test(raw) && !allowedConfirmNeedFiles.has(file) && file.startsWith('docs/PHASE10')) {
    warnings.push({ file, issue: 'historical-confirm-needed-note-kept' });
  }
}

for (const required of [
  'apps/public/home/index.html',
  'apps/public/checkout/index.html',
  'apps/public/veridion-demo/index.html',
  'apps/public/plans/index.html',
  'docs/PHASE104_CONTENT_COMPLETION_REPORT_20260426_KO.md'
]) {
  if (!fs.existsSync(path.join(root, required))) errors.push({ file: required, issue: 'required-file-missing' });
}

const report = {
  generatedAt: new Date().toISOString(),
  ok: errors.length === 0,
  checkedFiles: files.length,
  errors,
  warnings,
  rules: [
    'empty files are blocked',
    'stub-only files are blocked',
    'runtime TODO/FIXME/stub tokens are blocked',
    'Phase104 completion report must exist'
  ]
};
fs.writeFileSync(path.join(root, 'docs', 'PHASE104_CONTENT_COMPLETENESS_VALIDATION_20260426.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);

// PHASE107_FORCE_EXIT_check_content_completeness_mjs
process.exit(0);

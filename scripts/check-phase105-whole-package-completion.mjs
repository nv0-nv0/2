import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];
const appFiles = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs);
    else appFiles.push(path.relative(root, abs).replaceAll('\\\\', '/'));
  }
}
walk(path.join(root, 'apps'));

const textFiles = appFiles.filter(file => /\.(html|js|css|txt|md)$/i.test(file));
for (const file of textFiles) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const trimmed = text.trim();
  if (!trimmed) errors.push({ file, issue: 'empty runtime-visible file' });
  if (/^(abc|hi|test|todo|tbd)$/i.test(trimmed)) errors.push({ file, issue: 'stub-only runtime-visible file' });
  if (/Static legal page\. Intentionally no client-side runtime is required/i.test(text)) errors.push({ file, issue: 'static runtime file left as explanatory stub' });
  if (/loading\.\.\./i.test(text)) errors.push({ file, issue: 'raw loading placeholder remains' });
  if (/>\s*ready\s*</i.test(text)) errors.push({ file, issue: 'raw ready placeholder remains' });
  if (/대기 중/.test(text)) errors.push({ file, issue: 'raw waiting placeholder remains' });
  if (/coming soon|lorem ipsum|미구현|준비중/i.test(text)) errors.push({ file, issue: 'unfinished content token remains' });
}

for (const required of [
  'apps/public/home/index.html',
  'apps/public/veridion-demo/index.html',
  'apps/public/plans/index.html',
  'apps/public/checkout/index.html',
  'apps/public/portal/index.html',
  'apps/public/business-info/index.html',
  ]) {
  if (!fs.existsSync(path.join(root, required))) errors.push({ file: required, issue: 'required completion target missing' });
}

const business = fs.readFileSync(path.join(root, 'apps/public/business-info/index.html'), 'utf8');
if (!business.includes('상용 공개 차단 기준')) errors.push({ file: 'apps/public/business-info/index.html', issue: 'business-info lacks launch blocking notice for unconfirmed statutory fields' });
if (!business.includes('호스팅 제공자') || !business.includes('운영값 미입력')) warnings.push({ file: 'apps/public/business-info/index.html', issue: 'hosting field not visible' });
const reportDir = path.join(root, 'runtime', 'reports');
if (!fs.existsSync(reportDir)) errors.push({ file: 'runtime/reports', issue: 'runtime reports directory missing' });
else if (fs.readdirSync(reportDir).length !== 0) errors.push({ file: 'runtime/reports', issue: 'runtime reports directory must be empty in delivery bundle' });

const report = {
  generatedAt: new Date().toISOString(),
  ok: errors.length === 0,
  checkedRuntimeFiles: textFiles.length,
  errors,
  warnings,
  rules: [
    'all runtime-visible files must contain meaningful content',
    'raw loading/ready/waiting placeholders are blocked',
    'static JavaScript stub comments are blocked',
    'runtime report directory must remain empty in the delivery bundle and be documented in Phase105 report',
    'business-info unresolved statutory fields must be launch-blocking, not silent blanks'
  ]
};
fs.writeFileSync(path.join(root, 'docs', 'PHASE105_WHOLE_PACKAGE_COMPLETION_VALIDATION_20260426.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);

// PHASE107_FORCE_EXIT_check_phase105_whole_package_completion_mjs
process.exit(0);

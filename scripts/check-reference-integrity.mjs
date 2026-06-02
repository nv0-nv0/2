import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [];
const add = (name, fn) => { try { fn(); checks.push({ name, ok: true }); } catch (error) { checks.push({ name, ok: false, error: error.message }); } };
const rel = abs => path.relative(root, abs).replaceAll('\\', '/');
const walk = dir => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  if (['.git', 'node_modules', 'current'].includes(entry.name) && rel(dir) === 'docs') return [];
  if (['.git', 'node_modules'].includes(entry.name)) return [];
  const abs = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(abs) : [abs];
}) : [];
const files = walk(root);
const codeFiles = files.filter(file => /\.(?:mjs|js)$/.test(file));
const read = abs => fs.readFileSync(abs, 'utf8');
const exists = relPath => fs.existsSync(path.join(root, relPath));
const importPatterns = [
  /(?:from\s*|import\s*)['"]([^'"]+)['"]/g,
  /import\(\s*['"]([^'"]+)['"]\s*\)/g
];
function resolveRelativeImport(source, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(path.dirname(source), specifier);
  const candidates = [base, `${base}.mjs`, `${base}.js`, `${base}.json`, path.join(base, 'index.mjs'), path.join(base, 'index.js')];
  return candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || null;
}
function importsFor(file) {
  const text = read(file);
  const found = [];
  for (const pattern of importPatterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) found.push(match[1]);
  }
  return [...new Set(found)];
}
const imports = new Map(codeFiles.map(file => [file, importsFor(file)]));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const packageCommands = Object.values(pkg.scripts || {}).join('\n');
const allCodeText = codeFiles.map(read).join('\n');

add('all-relative-imports-resolve', () => {
  const missing = [];
  for (const [file, specs] of imports) for (const spec of specs) if (spec.startsWith('.') && !resolveRelativeImport(file, spec)) missing.push(`${rel(file)} -> ${spec}`);
  assert.deepEqual(missing, []);
});
add('no-orphan-core-modules', () => {
  const coreDir = path.join(root, 'server/core');
  const coreFiles = walk(coreDir).filter(file => file.endsWith('.mjs'));
  const importedTargets = new Set();
  for (const [source, specs] of imports) for (const spec of specs) {
    const resolved = resolveRelativeImport(source, spec);
    if (resolved) importedTargets.add(path.resolve(resolved));
  }
  const orphan = coreFiles.filter(file => !importedTargets.has(path.resolve(file))).map(rel);
  assert.deepEqual(orphan, []);
});
add('all-operation-scripts-linked', () => {
  const scripts = walk(path.join(root, 'scripts')).filter(file => file.endsWith('.mjs'));
  const orphan = scripts.filter(file => !packageCommands.includes(`scripts/${path.basename(file)}`) && !allCodeText.includes(path.basename(file))).map(rel);
  assert.deepEqual(orphan, []);
});
add('stable-core-module-filenames', () => {
  const coreNames = walk(path.join(root, 'server/core')).map(file => path.basename(file));
  assert.deepEqual(coreNames.filter(name => /phase\d+|-[0-9]{3}\.mjs$/i.test(name)), []);
  for (const file of ['server/core/service-quality.mjs', 'server/core/commercial-readiness.mjs', 'server/core/operations-governance.mjs']) assert.equal(exists(file), true, file);
  for (const file of ['server/core/service-quality-220.mjs', 'server/core/commercial-readiness-287.mjs', 'server/core/phase313-operations-governance.mjs']) assert.equal(exists(file), false, file);
});
add('no-numbered-stage-residue-outside-guards', () => {
  const allowed = new Set([
    'scripts/check-reference-integrity.mjs',
    'scripts/check-clean-baseline.mjs',
    'scripts/check-public-api-isolation.mjs',
    'server/routes/public.mjs',
    'apps/public/board/app.js'
  ]);
  const roots = ['apps', 'server', 'shared', 'scripts', 'tests', 'deploy'];
  const active = roots.flatMap(name => walk(path.join(root, name))).filter(file => /\.(?:mjs|js|css|html|yml|yaml|txt|example|template)$/.test(file));
  const offenders = active.filter(file => !allowed.has(rel(file)) && /phase\d+/i.test(read(file))).map(rel);
  assert.deepEqual(offenders, []);
});
add('legacy-diagnosis-renderers-removed', () => {
  const demoJs = fs.readFileSync(path.join(root, 'apps/public/demo/app.js'), 'utf8');
  const demoCss = fs.readFileSync(path.join(root, 'apps/public/demo/app.css'), 'utf8');
  for (const token of ['renderConversionCommandCenter', 'renderCrisisAreaMap', 'renderProgressiveEvidenceDetails', 'renderDemoCountOnlyResult', 'vr-phase356-conversion-report', 'vr-crisis-command-center']) assert.equal(demoJs.includes(token) || demoCss.includes(token), false, token);
  assert.doesNotMatch(demoCss, /\.vr-(?:crisis|target|score)-\d+\{/);
});
add('neutral-deploy-template-identifiers', () => {
  const deployText = [
    'docker-compose.yml',
    'deploy/docker-compose.coolify.yml',
    'deploy/env.commercial.template',
    'deploy/env.production.template',
    'deploy/env.production.nv0.kr.example',
    'deploy/coolify.env.example',
    'deploy/coolify.env.bulk.txt',
    'scripts/generate-r2-coolify-env.mjs',
    'server/index.mjs'
  ].map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
  assert.doesNotMatch(deployText, /phase313-legal-evidence-v1|CICHECKSTORAGE(?:ACCESSID|SECRETKEY)PHASE302/);
  assert.match(deployText, /legal-evidence-v1/);
});

const failures = checks.filter(item => !item.ok);
const report = { ok: failures.length === 0, contract: 'reference-integrity-contract', checkedAt: new Date().toISOString(), codeFiles: codeFiles.length, checked: checks.length, failed: failures.length, failures, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/REFERENCE_INTEGRITY.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);

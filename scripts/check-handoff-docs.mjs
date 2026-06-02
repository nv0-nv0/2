import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'README.md',
  'docs/INDEX.md',
  'docs/CURRENT_RELEASE.md',
  'docs/PROJECT_STRUCTURE.md',
  'deploy/README.md',
  'docs/PHASE357_GLOBAL_QA_WORK_ORDER.md',
  'docs/PHASE357_REMEDIATION_MATRIX.md',
  'docs/PHASE357_GLOBAL_QA_CLOSEOUT.md',
  'docs/PHASE358_COMMERCIAL_DEPLOY_INTEGRITY_WORK_ORDER.md',
  'docs/PHASE358_REMEDIATION_MATRIX.md',
  'docs/PHASE358_COMMERCIAL_DEPLOY_INTEGRITY_CLOSEOUT.md'
];
const checked = [];
const errors = [];
for (const rel of required) {
  const abs = path.join(root, rel);
  if (fs.existsSync(abs)) checked.push(rel);
  else errors.push({ file: rel, error: 'required current handoff document is missing' });
}
const docsIndex = fs.readFileSync(path.join(root, 'docs/INDEX.md'), 'utf8');
const currentRelease = fs.readFileSync(path.join(root, 'docs/CURRENT_RELEASE.md'), 'utf8');
const projectStructure = fs.readFileSync(path.join(root, 'docs/PROJECT_STRUCTURE.md'), 'utf8');
if (!docsIndex.includes('PHASE358')) errors.push({ file: 'docs/INDEX.md', error: 'PHASE358 current release section is missing' });
if (!currentRelease.includes('phase358')) errors.push({ file: 'docs/CURRENT_RELEASE.md', error: 'phase358 current version marker is missing' });
if (!projectStructure.includes('phase358:final')) errors.push({ file: 'docs/PROJECT_STRUCTURE.md', error: 'latest phase358 final gate is missing' });
console.log(JSON.stringify({ ok: errors.length === 0, referencedCount: required.length, checked, errors }, null, 2));
if (errors.length) process.exit(1);

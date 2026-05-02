import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cutoff = String(process.env.NV0_VALIDATION_GATE_MIN_DATE || '20260501');
const files = [];
async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'runtime') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (/VALIDATION.*\.json$/i.test(entry.name) || /VALIDATION_.*\.json$/i.test(entry.name)) files.push(full);
  }
}
function fileDate(name) {
  const matches = [...name.matchAll(/20\d{6}/g)].map(m => m[0]);
  return matches[matches.length - 1] || '00000000';
}
await walk(root);
const failures = [];
const legacyWarnings = [];
for (const file of files) {
  const rel = path.relative(root, file);
  const gate = fileDate(rel) >= cutoff;
  try {
    const data = JSON.parse(await fs.readFile(file, 'utf8'));
    const failed = data.ok === false || data.passed === false || (Array.isArray(data.errors) && data.errors.length);
    if (failed && gate) failures.push(`${rel} reports failure`);
    if (failed && !gate) legacyWarnings.push(rel);
  } catch (error) {
    if (gate) failures.push(`${rel} invalid JSON: ${error.message}`);
    else legacyWarnings.push(`${rel} invalid legacy JSON: ${error.message}`);
  }
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, validationFiles: files.length, gatedFromDate: cutoff, legacyWarnings: legacyWarnings.length }));

import { promises as fs } from 'node:fs';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');
const outDir = path.resolve(root, '..');
const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
const zipName = process.argv.includes('--name') ? process.argv[process.argv.indexOf('--name') + 1] : `nv0_phase200_secure_release_${stamp}.zip`;
const zipPath = path.join(outDir, zipName);

const excluded = [
  '.git', 'node_modules', '.env', '.env.local', '.env.production',
  'runtime/data', 'runtime/uploads', 'runtime/backups', 'runtime/reports',
  'coverage', '.DS_Store'
];

function shouldExclude(rel) {
  const normalized = rel.replaceAll('\\', '/').replace(/^\.\//, '');
  return excluded.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}

async function walk(dir, result = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(root, abs).replaceAll('\\', '/');
    if (shouldExclude(rel)) continue;
    if (entry.isDirectory()) await walk(abs, result);
    else result.push(rel);
  }
  return result;
}

const files = await walk(root);
const suspicious = files.filter((rel) => {
  const base = path.basename(rel);
  const realEnv = base === '.env' || base === '.env.local' || base === '.env.production';
  const runtimeState = /^runtime\/(data|uploads|backups|reports)\//.test(rel);
  return realEnv || runtimeState;
});
if (suspicious.length) {
  console.error(JSON.stringify({ ok: false, reason: 'release contains forbidden runtime/env files', suspicious }, null, 2));
  process.exit(1);
}
if (fsSync.existsSync(zipPath)) await fs.unlink(zipPath);
const args = ['-q', '-r', zipPath, '.', ...excluded.flatMap((item) => ['-x', `${item}/*`, '-x', item])];
const zipped = spawnSync('zip', args, { cwd: root, encoding: 'utf8' });
if (zipped.status !== 0) {
  console.error(zipped.stderr || zipped.stdout);
  process.exit(zipped.status || 1);
}
const sha256 = crypto.createHash('sha256').update(await fs.readFile(zipPath)).digest('hex');
const manifest = { ok: true, zipPath, zipName, sha256, fileCount: files.length, excluded, generatedAt: new Date().toISOString() };
await fs.writeFile(path.join(root, 'PHASE200_SECURE_RELEASE_MANIFEST_20260504.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));

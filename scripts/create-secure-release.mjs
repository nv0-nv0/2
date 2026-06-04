import { promises as fs } from 'node:fs';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const maxSingleFileBytes = Number(process.env.NV0_RELEASE_MAX_SINGLE_FILE_BYTES || 5 * 1024 * 1024);

function runPrepackCheck(script) {
  const result = spawnSync(process.execPath, [path.join(root, script)], { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024 * 32 });
  if (result.status !== 0) throw new Error(`prepack check failed: ${script}\n${result.stdout || ''}\n${result.stderr || ''}`);
}
for (const script of [
  'scripts/check-delivery-hygiene.mjs',
  'scripts/check-release-secret-hygiene.mjs',
  'scripts/check-runtime-clean.mjs',
  'scripts/check-commercial-max-hardening.mjs'
]) runPrepackCheck(script);

const outDir = path.resolve(root, '..');
const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
const zipName = process.argv.includes('--name') ? process.argv[process.argv.indexOf('--name') + 1] : `veridion_clean_commercial_baseline_${stamp}.zip`;
const zipPath = path.join(outDir, zipName);
const excludedPrefixes = ['.git','node_modules','docs/current','runtime/uploads','runtime/backups','runtime/reports','runtime/data/secure-records','coverage','.DS_Store','runtime-ui'];
const forbiddenRuntime = new Set(['runtime/data/db.json','runtime/data/sessions.json']);
const forbiddenExtensions = new Set(['.pem','.key','.p12','.pfx','.jks','.keystore','.sqlite','.sqlite3','.db','.bak','.dump','.sql.gz']);
const allowedRootEnv = new Set(['.env.example','.env.coolify.example']);
const normalize = rel => rel.replaceAll('\\','/').replace(/^\.\//,'');
function forbiddenEnv(rel) { const n = normalize(rel); const base = path.posix.basename(n); return base.startsWith('.env') && !(n === base && allowedRootEnv.has(base)); }
function forbiddenExtension(rel) { const lower = normalize(rel).toLowerCase(); return [...forbiddenExtensions].some(extension => lower.endsWith(extension)); }
function excluded(rel) { const n = normalize(rel); return forbiddenEnv(n) || forbiddenRuntime.has(n) || n === 'runtime-ui' || n.startsWith('runtime-ui/') || excludedPrefixes.some(prefix => n === prefix || n.startsWith(`${prefix}/`)) || n.startsWith('runtime-test-'); }
async function walk(dir, result = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = normalize(path.relative(root, abs));
    if (excluded(rel)) continue;
    const stat = await fs.lstat(abs);
    if (stat.isSymbolicLink()) throw new Error(`release must not contain symlink: ${rel}`);
    if (entry.isDirectory()) await walk(abs, result);
    else {
      if (forbiddenExtension(rel)) throw new Error(`release must not contain sensitive file extension: ${rel}`);
      if (stat.size > maxSingleFileBytes) throw new Error(`release file exceeds ${maxSingleFileBytes} bytes: ${rel}`);
      result.push({ rel, abs, size: stat.size });
    }
  }
  return result;
}
function sha256Buffer(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }
function sha256File(abs) { return sha256Buffer(fsSync.readFileSync(abs)); }

const entries = (await walk(root)).sort((a, b) => a.rel.localeCompare(b.rel));
const files = entries.map(item => item.rel);
for (const required of ['runtime/data/db.seed.json','.env.example','.env.coolify.example','scripts/run-release-gate.mjs','scripts/check-commercial-max-hardening.mjs','docs/QA.md','docs/COMMERCIAL_MAXIMIZATION_REPORT_KO.md']) {
  if (!files.includes(required)) throw new Error(`release allowlist missing required file: ${required}`);
}
const suspicious = files.filter(rel => forbiddenEnv(rel) || forbiddenRuntime.has(rel) || forbiddenExtension(rel) || rel === 'runtime-ui' || rel.startsWith('runtime-ui/') || rel.startsWith('runtime-test-'));
if (suspicious.length) throw new Error(`release contains forbidden files: ${suspicious.join(', ')}`);
if (fsSync.existsSync(zipPath)) await fs.unlink(zipPath);
const result = spawnSync('zip', ['-X','-q','-@',zipPath], { cwd: root, input: files.join('\n') + '\n', encoding: 'utf8' });
if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'zip failed');
const zipEntriesResult = spawnSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' });
if (zipEntriesResult.status !== 0) throw new Error(zipEntriesResult.stderr || zipEntriesResult.stdout || 'zip verification failed');
const sortPaths = values => [...values].sort((a, b) => a.localeCompare(b));
const zipEntries = sortPaths(zipEntriesResult.stdout.split(/\r?\n/).map(normalize).filter(Boolean));
const duplicateZipEntries = zipEntries.filter((value, index) => index > 0 && value === zipEntries[index - 1]);
if (duplicateZipEntries.length) throw new Error(`zip verification failed: duplicate packaged entries: ${duplicateZipEntries.join(', ')}`);
if (JSON.stringify(zipEntries) !== JSON.stringify(sortPaths(files))) throw new Error('zip verification failed: packaged entries differ from release allowlist');
const sha256 = sha256File(zipPath);
const fileManifest = entries.map(item => ({ path: item.rel, bytes: item.size, sha256: sha256File(item.abs) }));
const filesManifestText = fileManifest.map(item => `${item.sha256}  ${item.path}`).join('\n') + '\n';
const filesManifestPath = `${zipPath}.files-manifest`;
const filesSha256 = sha256Buffer(Buffer.from(filesManifestText));
const manifest = {
  ok: true,
  contract: 'secure-release-reproducible-v3',
  zipPath,
  zipName,
  sha256,
  filesSha256,
  filesManifestPath,
  fileCount: files.length,
  totalBytes: entries.reduce((sum, item) => sum + item.size, 0),
  maxSingleFileBytes,
  excludedPrefixes,
  verifiedZipEntries: zipEntries.length,
  duplicateZipEntries: duplicateZipEntries.length,
  generatedAt: new Date().toISOString(),
  files: fileManifest
};
await fs.mkdir(path.join(root, 'docs/current'), { recursive: true });
await fs.writeFile(path.join(root, 'docs/current/SECURE_RELEASE_MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
await fs.writeFile(filesManifestPath, filesManifestText);
await fs.writeFile(`${zipPath}.sha256.txt`, `${sha256}  ${zipName}\n${filesSha256}  ${zipName}.files-manifest\n`);
console.log(JSON.stringify({ ...manifest, files: undefined }, null, 2));

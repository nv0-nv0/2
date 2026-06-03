import { promises as fs } from 'node:fs';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runPrepackCheck(script) {
  const result = spawnSync(process.execPath, [path.join(root, script)], { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024 * 16 });
  if (result.status !== 0) throw new Error(`prepack check failed: ${script}\n${result.stdout || ''}\n${result.stderr || ''}`);
}
for (const script of ['scripts/check-delivery-hygiene.mjs', 'scripts/check-release-secret-hygiene.mjs', 'scripts/check-runtime-clean.mjs']) runPrepackCheck(script);
const outDir = path.resolve(root, '..');
const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
const zipName = process.argv.includes('--name') ? process.argv[process.argv.indexOf('--name') + 1] : `veridion_clean_commercial_baseline_${stamp}.zip`;
const zipPath = path.join(outDir, zipName);
const excludedPrefixes = ['.git','node_modules','docs/current','runtime/uploads','runtime/backups','runtime/reports','runtime/data/secure-records','coverage','.DS_Store','runtime-ui'];
const forbiddenRuntime = new Set(['runtime/data/db.json','runtime/data/sessions.json']);
const allowedRootEnv = new Set(['.env.example','.env.coolify.example']);
const normalize = rel => rel.replaceAll('\\','/').replace(/^\.\//,'');
function forbiddenEnv(rel) { const n = normalize(rel); const base = path.posix.basename(n); return base.startsWith('.env') && !(n === base && allowedRootEnv.has(base)); }
function excluded(rel) { const n = normalize(rel); return forbiddenEnv(n) || forbiddenRuntime.has(n) || n === 'runtime-ui' || n.startsWith('runtime-ui/') || excludedPrefixes.some(prefix => n === prefix || n.startsWith(`${prefix}/`)) || n.startsWith('runtime-test-'); }
async function walk(dir, result=[]) { for (const entry of await fs.readdir(dir,{withFileTypes:true})) { const abs=path.join(dir,entry.name); const rel=normalize(path.relative(root,abs)); if (excluded(rel)) continue; if (entry.isDirectory()) await walk(abs,result); else result.push(rel); } return result; }
const files=(await walk(root)).sort();
for (const required of ['runtime/data/db.seed.json','.env.example','.env.coolify.example','scripts/run-release-gate.mjs','docs/QA.md']) if (!files.includes(required)) throw new Error(`release allowlist missing required file: ${required}`);
const suspicious=files.filter(rel => forbiddenEnv(rel) || forbiddenRuntime.has(rel) || rel === 'runtime-ui' || rel.startsWith('runtime-ui/') || rel.startsWith('runtime-test-'));
if (suspicious.length) throw new Error(`release contains forbidden files: ${suspicious.join(', ')}`);
if (fsSync.existsSync(zipPath)) await fs.unlink(zipPath);
const result=spawnSync('zip',['-q','-@',zipPath],{cwd:root,input:files.join('\n')+'\n',encoding:'utf8'});
if (result.status!==0) throw new Error(result.stderr || result.stdout || 'zip failed');
const sha256=crypto.createHash('sha256').update(await fs.readFile(zipPath)).digest('hex');
const manifest={ok:true,zipPath,zipName,sha256,fileCount:files.length,excludedPrefixes,generatedAt:new Date().toISOString()};
await fs.mkdir(path.join(root,'docs/current'),{recursive:true});
await fs.writeFile(path.join(root,'docs/current/SECURE_RELEASE_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));

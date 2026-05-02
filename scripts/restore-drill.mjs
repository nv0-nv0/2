import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const runtimeDir = path.resolve(process.env.NV0_RUNTIME_DIR || path.join(ROOT, 'runtime'));
const dataDir = path.join(runtimeDir, 'data');
const sourceDb = path.join(dataDir, 'db.json');
const drillRoot = path.resolve(process.env.NV0_RESTORE_DRILL_DIR || path.join(os.tmpdir(), 'nv0-restore-drill'));
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const drillDir = path.join(drillRoot, stamp);

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

await fs.mkdir(drillDir, { recursive: true });
let dbBuffer;
let source = sourceDb;
try {
  dbBuffer = await fs.readFile(sourceDb);
} catch {
  source = 'generated-drill-seed';
  dbBuffer = Buffer.from(JSON.stringify({ drillSeed: true, createdAt: new Date().toISOString() }, null, 2));
}
JSON.parse(dbBuffer.toString('utf8'));
const snapshot = path.join(drillDir, `db-${stamp}.json`);
const restoreTarget = path.join(drillDir, `restore-target-${stamp}.json`);
const manifestPath = path.join(drillDir, `db-${stamp}.manifest.json`);
const digest = sha256(dbBuffer);
await fs.writeFile(snapshot, dbBuffer);
await fs.writeFile(manifestPath, JSON.stringify({ version: 'phase164-restore-drill-v1', createdAt: new Date().toISOString(), source, snapshot, sha256: digest, size: dbBuffer.length }, null, 2));
const readBack = await fs.readFile(snapshot);
if (sha256(readBack) !== digest) throw new Error('restore drill snapshot hash mismatch');
await fs.copyFile(snapshot, restoreTarget);
const restored = await fs.readFile(restoreTarget);
if (sha256(restored) !== digest) throw new Error('restore drill copy hash mismatch');
JSON.parse(restored.toString('utf8'));
const report = { ok: true, phase: 'phase164-zero-cost-hardening-50', source, snapshot, restoreTarget, manifestPath, sha256: digest, bytes: restored.length, nonDestructive: true };
console.log(JSON.stringify(report, null, 2));

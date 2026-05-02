import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createPostgresBridge } from '../server/infrastructure/persistence/postgres-bridge.mjs';

const repoRoot = process.cwd();
const bridgeSource = await fs.readFile(path.join(repoRoot, 'server/infrastructure/persistence/postgres-bridge.mjs'), 'utf8');
const migrationSource = await fs.readFile(path.join(repoRoot, 'scripts/migrate-existing-cta-human-friendly.mjs'), 'utf8');

const checks = [];
function check(name, ok, detail = {}) {
  checks.push({ name, ok: Boolean(ok), ...detail });
}

check('postgres bridge streams SQL via stdin', /stdio:\s*\['pipe',\s*'pipe',\s*'pipe'\]/.test(bridgeSource) && /child\.stdin\.end\(String\(sql\) \+ '\\n'\)/.test(bridgeSource));
check('postgres bridge no longer sends SQL through argv -c', !/spawn\('psql',[\s\S]*'-c',[\s\S]*sql/.test(bridgeSource));
check('postgres bridge uses minimal child environment', /function createPsqlEnv/.test(bridgeSource) && /env:\s*createPsqlEnv\(process\.env\)/.test(bridgeSource) && !/env:\s*process\.env/.test(bridgeSource));
check('CTA migration psql helper also avoids argv SQL', /function createPsqlEnv/.test(migrationSource) && !/spawn\('psql',[\s\S]*'-c',[\s\S]*sql/.test(migrationSource));

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nv0-fake-psql-'));
const markerPath = path.join(tempDir, 'calls.jsonl');
const fakePsqlPath = path.join(tempDir, 'psql');
await fs.writeFile(fakePsqlPath, `#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
const chunks = [];
for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
const sql = Buffer.concat(chunks).toString('utf8');
const record = {
  argv: process.argv.slice(2),
  sqlLength: sql.length,
  sawHugeEnv: Boolean(process.env.HUGE_COOLIFY_BLOB),
  envKeys: Object.keys(process.env).sort()
};
appendFileSync(${JSON.stringify(markerPath)}, JSON.stringify(record) + '\\n');
if (record.argv.includes('-c')) process.exit(44);
if (record.sawHugeEnv) process.exit(45);
process.stdout.write('ok');
`, 'utf8');
await fs.chmod(fakePsqlPath, 0o755);

const previousPath = process.env.PATH;
process.env.PATH = `${tempDir}:${previousPath || ''}`;
process.env.HUGE_COOLIFY_BLOB = 'x'.repeat(1024 * 1024 * 2);
const bridge = createPostgresBridge({
  ...process.env,
  NV0_PERSISTENCE_MODE: 'dual_write',
  NV0_DATABASE_URL: 'postgres://user:pass@localhost:5432/nv0'
}, console);
await bridge.writeDbSnapshot({
  settings: { blob: 'y'.repeat(1024 * 1024) },
  orders: [],
  subscriptions: [],
  publications: [],
  boards: [],
  library: [],
  scans: [],
  sites: [],
  legalUpdates: [],
  systemItems: [],
  rules: [],
  autoFixJobs: [],
  guidanceDocuments: [],
  paymentSessions: [],
  adminUsers: [],
  adminRoleBindings: [],
  adminSessions: [],
  auditLogs: [],
  paymentEvents: [],
  webhookInbox: []
});
process.env.PATH = previousPath;
delete process.env.HUGE_COOLIFY_BLOB;

const callsRaw = await fs.readFile(markerPath, 'utf8');
const calls = callsRaw.split('\n').filter(Boolean).map(line => JSON.parse(line));
check('runtime bridge successfully spawned psql with 2MB parent env', calls.length > 0, { calls: calls.length });
check('fake psql never received SQL in argv', calls.every(call => !call.argv.includes('-c')));
check('fake psql received large snapshot over stdin', calls.some(call => call.sqlLength > 1024 * 1024));
check('fake psql did not inherit huge Coolify environment blob', calls.every(call => call.sawHugeEnv === false));

const ok = checks.every(item => item.ok);
const report = {
  ok,
  phase: 'P158',
  fix: 'postgres psql spawn E2BIG hotfix',
  checks,
  summary: {
    total: checks.length,
    passed: checks.filter(item => item.ok).length,
    failed: checks.filter(item => !item.ok).length
  }
};
console.log(JSON.stringify(report, null, 2));
if (!ok) process.exit(1);

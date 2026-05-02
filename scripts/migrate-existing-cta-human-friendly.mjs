import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { rewriteExistingCtaPublication, auditHumanFriendlyCtaArticle } from '../server/core/cta-publication.mjs';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const dryRun = !apply;
const sourceArg = process.argv.find(arg => arg.startsWith('--source='));
const source = sourceArg ? sourceArg.split('=')[1] : 'auto';
const runtimeDir = process.env.NV0_RUNTIME_DIR || path.join(process.cwd(), 'runtime');
const dataDir = path.join(runtimeDir, 'data');
const backupDir = path.join(runtimeDir, 'backups');
const dbPath = process.env.NV0_DB_JSON_PATH || path.join(dataDir, 'db.json');
const now = new Date().toISOString();
const stamp = now.replace(/[:.]/g, '-');

function createPsqlEnv(sourceEnv = process.env) {
  const childEnv = {
    PATH: sourceEnv.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    HOME: sourceEnv.HOME || '/tmp',
    LANG: sourceEnv.LANG || 'C.UTF-8'
  };
  for (const key of [
    'LC_ALL',
    'PGAPPNAME',
    'PGCONNECT_TIMEOUT',
    'PGSSLMODE',
    'PGSSLROOTCERT',
    'PGSSLCERT',
    'PGSSLKEY',
    'PGSERVICEFILE',
    'PGSERVICE'
  ]) {
    if (sourceEnv[key]) childEnv[key] = sourceEnv[key];
  }
  return childEnv;
}

function psql(databaseUrl, sql) {
  return new Promise((resolve, reject) => {
    const child = spawn('psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-t', '-A'], {
      env: createPsqlEnv(process.env),
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const fail = error => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', fail);
    child.on('close', code => {
      if (settled) return;
      settled = true;
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `psql exited with code ${code}`));
    });
    child.stdin.on('error', fail);
    child.stdin.end(String(sql) + '\n');
  });
}

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function isTargetPost(item = {}) {
  const text = [item.type, item.boardType, item.ctaType, item.baseCtaType, item.combinationMode, item.autoPublished ? 'autoPublished' : '', item.body, item.title].join(' ');
  return Boolean(item && typeof item === 'object' && (
    item.autoPublished ||
    item.ctaType ||
    item.baseCtaType ||
    item.boardType === 'cta' ||
    item.type === 'cta' ||
    /제목 후보|검색 의도|고객 단계|CTA|SEO|퍼널|랜딩|메타 설명|fingerprint|아키타입/.test(text)
  ));
}

function rewriteCollection(rows = [], collectionName = 'publications') {
  const before = Array.isArray(rows) ? rows : [];
  let scanned = 0;
  let rewritten = 0;
  let skipped = 0;
  const samples = [];
  const after = before.map((item, index) => {
    if (!isTargetPost(item)) {
      skipped += 1;
      return item;
    }
    scanned += 1;
    const next = rewriteExistingCtaPublication(item, {
      seed: `phase155:${collectionName}:${index}:${item.id || item.createdAt || ''}`,
      sequenceOffset: index,
      rewrittenAt: now
    });
    const audit = auditHumanFriendlyCtaArticle(next);
    if (!audit.ok) {
      samples.push({ index, id: item.id, title: next.title, audit });
    }
    const changed = JSON.stringify(item) !== JSON.stringify(next);
    if (changed) rewritten += 1;
    return next;
  });
  return { before, after, scanned, rewritten, skipped, failedSamples: samples.slice(0, 10) };
}

async function loadJsonDb() {
  const raw = await fs.readFile(dbPath, 'utf8');
  return JSON.parse(raw);
}

async function saveJsonDb(db, originalRaw) {
  await fs.mkdir(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `db.before-phase155-cta-humanize.${stamp}.json`);
  await fs.writeFile(backupPath, originalRaw);
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
  return backupPath;
}

async function loadPostgresSnapshot(databaseUrl) {
  const sql = `
    select collection_key || E'\t' || coalesce(payload_json::text, 'null')
    from state_snapshots
    where collection_key in ('publications', 'boards')
    order by collection_key;
  `;
  const raw = await psql(databaseUrl, sql);
  const db = {};
  for (const line of raw.split('\n').map(row => row.trim()).filter(Boolean)) {
    const idx = line.indexOf('\t');
    if (idx === -1) continue;
    const key = line.slice(0, idx);
    db[key] = JSON.parse(line.slice(idx + 1));
  }
  if (!Array.isArray(db.publications)) db.publications = [];
  if (!Array.isArray(db.boards)) db.boards = [];
  return db;
}

async function savePostgresSnapshot(databaseUrl, before, after) {
  await fs.mkdir(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `postgres-state.before-phase155-cta-humanize.${stamp}.json`);
  await fs.writeFile(backupPath, JSON.stringify(before, null, 2));
  const parts = ['begin;'];
  for (const key of ['publications', 'boards']) {
    parts.push(`
      insert into state_snapshots (collection_key, payload_json, updated_at)
      values (${sqlLiteral(key)}, ${sqlLiteral(JSON.stringify(after[key] || []))}::jsonb, now())
      on conflict (collection_key)
      do update set payload_json = excluded.payload_json, updated_at = now();
    `);
  }
  parts.push('commit;');
  await psql(databaseUrl, parts.join('\n'));
  return backupPath;
}

async function runJson() {
  const originalRaw = await fs.readFile(dbPath, 'utf8');
  const db = JSON.parse(originalRaw);
  if (!Array.isArray(db.publications)) db.publications = [];
  if (!Array.isArray(db.boards)) db.boards = [];

  const pub = rewriteCollection(db.publications, 'publications');
  const board = rewriteCollection(db.boards, 'boards');
  const nextDb = { ...db, publications: pub.after, boards: board.after };
  const report = {
    source: 'json',
    dryRun,
    dbPath,
    scanned: pub.scanned + board.scanned,
    rewritten: pub.rewritten + board.rewritten,
    skipped: pub.skipped + board.skipped,
    failures: [...pub.failedSamples, ...board.failedSamples],
    backupPath: null
  };
  if (apply) report.backupPath = await saveJsonDb(nextDb, originalRaw);
  return report;
}

async function runPostgres() {
  const databaseUrl = process.env.NV0_DATABASE_URL;
  if (!databaseUrl) throw new Error('NV0_DATABASE_URL is required for --source=postgres');
  const db = await loadPostgresSnapshot(databaseUrl);
  const original = clone(db);
  const pub = rewriteCollection(db.publications, 'publications');
  const board = rewriteCollection(db.boards, 'boards');
  const nextDb = { ...db, publications: pub.after, boards: board.after };
  const report = {
    source: 'postgres',
    dryRun,
    scanned: pub.scanned + board.scanned,
    rewritten: pub.rewritten + board.rewritten,
    skipped: pub.skipped + board.skipped,
    failures: [...pub.failedSamples, ...board.failedSamples],
    backupPath: null
  };
  if (apply) report.backupPath = await savePostgresSnapshot(databaseUrl, original, nextDb);
  return report;
}

async function main() {
  let report;
  if (source === 'json') report = await runJson();
  else if (source === 'postgres') report = await runPostgres();
  else {
    const usePostgres = ['postgres_primary', 'dual_write'].includes(String(process.env.NV0_PERSISTENCE_MODE || '').trim()) && Boolean(process.env.NV0_DATABASE_URL);
    report = usePostgres ? await runPostgres() : await runJson();
    report.source = usePostgres ? 'postgres(auto)' : 'json(auto)';
  }

  const ok = report.failures.length === 0;
  console.log(JSON.stringify({
    ok,
    mode: dryRun ? 'dry-run' : 'apply',
    phase: 'P155',
    ...report,
    nextCommand: dryRun ? 'node scripts/migrate-existing-cta-human-friendly.mjs --apply' : 'node scripts/validate-phase155-cta-existing-rewrite.mjs'
  }, null, 2));

  if (!ok) process.exitCode = 1;
}

main().catch(error => {
  console.error(JSON.stringify({ ok: false, error: error.message, stack: error.stack }, null, 2));
  process.exit(1);
});

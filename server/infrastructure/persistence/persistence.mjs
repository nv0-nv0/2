import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createPostgresBridge } from './postgres-bridge.mjs';
import { createSecureRecordStore } from '../security/secure-record-store.mjs';

export function createPersistenceManager(options) {
  const {
    dataDir,
    sessionsFile,
    defaultDb,
    ensureRuntime,
    ensureAdminCollections,
    logger = console,
    env = process.env
  } = options;

  const bridge = createPostgresBridge(env, logger);
  const secureStore = createSecureRecordStore({ dataDir, defaultDb, env, logger });
  const dbPath = path.join(dataDir, 'db.json');

  async function readJsonDb() {
    await ensureRuntime();
    const db = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    for (const [key, value] of Object.entries(defaultDb)) {
      if (!(key in db)) {
        db[key] = Array.isArray(value) ? [] : { ...value };
        continue;
      }
      if (Array.isArray(value) && !Array.isArray(db[key])) db[key] = [];
      if (!Array.isArray(value) && (typeof db[key] !== 'object' || db[key] === null || Array.isArray(db[key]))) db[key] = { ...value };
    }
    db.settings = { ...defaultDb.settings, ...(db.settings || {}) };
    const secureCollections = await secureStore.readSecureCollections();
    const merged = secureStore.merge(db, secureCollections);
    ensureAdminCollections(merged);
    return merged;
  }

  async function writeJsonDb(db) {
    await ensureRuntime();
    const { publicDb, secure } = secureStore.split(db);
    await secureStore.writeSecureCollections(secure);
    await fs.writeFile(dbPath, JSON.stringify(publicDb, null, 2));
  }

  async function readDb() {
    if (bridge.mode === 'postgres_primary') {
      const pgDb = await bridge.readDbSnapshot();
      const base = JSON.parse(JSON.stringify(defaultDb));
      const merged = pgDb && Object.keys(pgDb).length ? { ...base, ...pgDb, settings: { ...base.settings, ...(pgDb.settings || {}) } } : base;
      ensureAdminCollections(merged);
      return merged;
    }
    const jsonDb = await readJsonDb();
    if (!bridge.enabled) return jsonDb;

    const pgDb = await bridge.readDbSnapshot();
    if (!pgDb || Object.keys(pgDb).length === 0) return jsonDb;

    if (bridge.compareMode) {
      for (const key of Object.keys(defaultDb)) {
        const left = JSON.stringify(jsonDb[key] ?? null);
        const right = JSON.stringify(pgDb[key] ?? null);
        if (left !== right) {
          bridge.logCompareMismatch('db_collection', { collection: key });
        }
      }
    }
    return bridge.mode === 'postgres_primary' ? { ...jsonDb, ...pgDb, settings: { ...jsonDb.settings, ...(pgDb.settings || {}) } } : jsonDb;
  }

  async function writeDb(db) {
    if (bridge.mode !== 'postgres_primary') await writeJsonDb(db);
    if (bridge.enabled) {
      await bridge.writeDbSnapshot(db);
    }
  }

  async function readJsonSessions() {
    await ensureRuntime();
    let rows = [];
    try {
      rows = JSON.parse(await fs.readFile(sessionsFile, 'utf8'));
    } catch {
      rows = [];
    }
    return Array.isArray(rows) ? rows : [];
  }

  async function writeJsonSessions(rows) {
    await ensureRuntime();
    await fs.writeFile(sessionsFile, JSON.stringify(rows, null, 2));
  }

  async function readSessions() {
    if (bridge.mode === 'postgres_primary') {
      const pgRows = await bridge.readSessions();
      return Array.isArray(pgRows) ? pgRows : [];
    }
    const jsonRows = await readJsonSessions();
    if (!bridge.enabled) return jsonRows;
    const pgRows = await bridge.readSessions();
    if (Array.isArray(pgRows) && bridge.compareMode) {
      const left = JSON.stringify(jsonRows.map(item => item.sid).sort());
      const right = JSON.stringify(pgRows.map(item => item.sid).sort());
      if (left !== right) bridge.logCompareMismatch('session_set');
    }
    return bridge.mode === 'postgres_primary' && Array.isArray(pgRows) && pgRows.length ? pgRows : jsonRows;
  }

  async function writeSessions(rows) {
    if (bridge.mode !== 'postgres_primary') await writeJsonSessions(rows);
    if (bridge.enabled) {
      await bridge.writeSessions(rows);
    }
  }

  return {
    mode: bridge.mode,
    bridgeEnabled: bridge.enabled,
    compareMode: bridge.compareMode,
    secureRecordStore: secureStore.status(),
    readDb,
    writeDb,
    readSessions,
    writeSessions
  };
}

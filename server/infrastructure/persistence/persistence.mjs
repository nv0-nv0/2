import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createPostgresBridge } from './postgres-bridge.mjs';
import { createSecureRecordStore } from '../security/secure-record-store.mjs';

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeFlag(value) {
  return String(value ?? '').trim().toLowerCase();
}

function postgresFallbackAllowed(env = process.env) {
  const explicit = normalizeFlag(env.NV0_POSTGRES_FALLBACK_MODE || env.NV0_PRELAUNCH_DB_FALLBACK || env.NV0_ALLOW_DB_FALLBACK);
  if (['0', 'false', 'no', 'off', 'strict'].includes(explicit)) return false;
  if (['1', 'true', 'yes', 'on', 'fallback'].includes(explicit)) return true;
  const stage = normalizeFlag(env.NV0_DEPLOYMENT_STAGE || 'prelaunch');
  const launchReady = normalizeFlag(env.NV0_COMMERCIAL_LAUNCH_READY) === 'true' || stage === 'commercial_launch';
  return !launchReady;
}

function isPostgresBootstrapOrConnectionError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return [
    'postgresql schema bootstrap failed',
    'could not translate host name',
    'could not connect',
    'connection refused',
    'connection timed out',
    'timeout expired',
    'temporary failure in name resolution',
    'name does not resolve',
    'enotfound',
    'econnrefused',
    'etimedout',
    'eai_again',
    'psql exited with code',
    'database url is empty'
  ].some(token => message.includes(token));
}

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
  const allowPostgresFallback = postgresFallbackAllowed(env);
  let postgresFallbackActive = false;
  let postgresFallbackWarned = false;

  function activatePostgresFallback(operation, error) {
    if (!allowPostgresFallback || !isPostgresBootstrapOrConnectionError(error)) return false;
    postgresFallbackActive = true;
    if (!postgresFallbackWarned) {
      postgresFallbackWarned = true;
      logger.warn?.('[postgres-prelaunch-fallback-json]', {
        operation,
        persistenceMode: bridge.mode,
        message: error?.message || String(error),
        note: 'PostgreSQL is unavailable; prelaunch continues with JSON runtime storage. commercial_launch remains strict.'
      });
    }
    return true;
  }

  async function readJsonDb() {
    await ensureRuntime();
    let db;
    try {
      db = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      db = cloneJson(defaultDb);
      ensureAdminCollections(db);
      await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    }
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
    if (bridge.mode === 'postgres_primary' && !postgresFallbackActive) {
      try {
        const pgDb = await bridge.readDbSnapshot();
        const base = cloneJson(defaultDb);
        const merged = pgDb && Object.keys(pgDb).length ? { ...base, ...pgDb, settings: { ...base.settings, ...(pgDb.settings || {}) } } : base;
        ensureAdminCollections(merged);
        return merged;
      } catch (error) {
        if (!activatePostgresFallback('readDb', error)) throw error;
      }
    }
    const jsonDb = await readJsonDb();
    if (!bridge.enabled || postgresFallbackActive) return jsonDb;

    try {
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
    } catch (error) {
      if (activatePostgresFallback('readDb-dual', error)) return jsonDb;
      throw error;
    }
  }

  async function writeDb(db) {
    if (bridge.mode !== 'postgres_primary' || postgresFallbackActive) await writeJsonDb(db);
    if (!bridge.enabled || postgresFallbackActive) return;
    try {
      await bridge.writeDbSnapshot(db);
    } catch (error) {
      if (!activatePostgresFallback('writeDb', error)) throw error;
      await writeJsonDb(db);
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
    if (bridge.mode === 'postgres_primary' && !postgresFallbackActive) {
      try {
        const pgRows = await bridge.readSessions();
        return Array.isArray(pgRows) ? pgRows : [];
      } catch (error) {
        if (!activatePostgresFallback('readSessions', error)) throw error;
      }
    }
    const jsonRows = await readJsonSessions();
    if (!bridge.enabled || postgresFallbackActive) return jsonRows;
    try {
      const pgRows = await bridge.readSessions();
      if (Array.isArray(pgRows) && bridge.compareMode) {
        const left = JSON.stringify(jsonRows.map(item => item.sid).sort());
        const right = JSON.stringify(pgRows.map(item => item.sid).sort());
        if (left !== right) bridge.logCompareMismatch('session_set');
      }
      return bridge.mode === 'postgres_primary' && Array.isArray(pgRows) && pgRows.length ? pgRows : jsonRows;
    } catch (error) {
      if (activatePostgresFallback('readSessions-dual', error)) return jsonRows;
      throw error;
    }
  }

  async function writeSessions(rows) {
    if (bridge.mode !== 'postgres_primary' || postgresFallbackActive) await writeJsonSessions(rows);
    if (!bridge.enabled || postgresFallbackActive) return;
    try {
      await bridge.writeSessions(rows);
    } catch (error) {
      if (!activatePostgresFallback('writeSessions', error)) throw error;
      await writeJsonSessions(rows);
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

import { spawn } from 'node:child_process';

const COLLECTION_KEYS = [
  'settings',
  'orders',
  'subscriptions',
  'publications',
  'boards',
  'library',
  'scans',
  'sites',
  'legalUpdates',
  'systemItems',
  'rules',
  'autoFixJobs',
  'guidanceDocuments',
  'paymentSessions',
  'adminUsers',
  'adminRoleBindings',
  'adminSessions',
  'auditLogs',
  'paymentEvents',
  'webhookInbox'
];

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function execPsql(databaseUrl, sql) {
  return new Promise((resolve, reject) => {
    const child = spawn('psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', sql], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `psql exited with code ${code}`));
    });
  });
}

export function createPostgresBridge(env = process.env, logger = console) {
  const mode = String(env.NV0_PERSISTENCE_MODE || 'json').trim();
  const databaseUrl = String(env.NV0_DATABASE_URL || '').trim();
  const compareMode = env.NV0_DB_COMPARE_MODE === '1' || env.NV0_DB_COMPARE_MODE === 'true';
  const enabled = ['dual_write', 'postgres_primary'].includes(mode) && Boolean(databaseUrl);

  async function writeCollection(key, payload) {
    if (!enabled) return;
    const json = JSON.stringify(payload ?? null);
    const sql = `
      insert into state_snapshots (collection_key, payload_json, updated_at)
      values (${sqlLiteral(key)}, ${sqlLiteral(json)}::jsonb, now())
      on conflict (collection_key)
      do update set payload_json = excluded.payload_json, updated_at = now();
    `;
    await execPsql(databaseUrl, sql);
  }

  async function writeDbSnapshot(db) {
    if (!enabled) return;
    for (const key of COLLECTION_KEYS) {
      await writeCollection(key, db[key]);
    }
    await replaceOrders(db.orders || []);
    await replacePaymentEvents(db.paymentEvents || []);
    await replaceWebhookInbox(db.webhookInbox || []);
  }

  async function readDbSnapshot() {
    if (!enabled) return null;
    const sql = `
      select collection_key || E'\t' || coalesce(payload_json::text, 'null')
      from state_snapshots
      where collection_key = any(array[${COLLECTION_KEYS.map(sqlLiteral).join(',')}])
      order by collection_key;
    `;
    const raw = await execPsql(databaseUrl, sql);
    if (!raw) return {};
    const rows = raw.split('\n').map(line => line.trim()).filter(Boolean);
    const snapshot = {};
    for (const row of rows) {
      const idx = row.indexOf('\t');
      if (idx === -1) continue;
      const key = row.slice(0, idx);
      const payload = row.slice(idx + 1);
      snapshot[key] = JSON.parse(payload);
    }
    return snapshot;
  }

  async function writeSessions(rows) {
    if (!enabled) return;
    const parts = ['begin;', 'delete from admin_sessions;'];
    for (const row of rows) {
      parts.push(`insert into admin_sessions (sid, csrf_token, created_at, last_seen_at, expires_at, admin_user_id, email, roles_json, permissions_json) values (
        ${sqlLiteral(row.sid)},
        ${sqlLiteral(row.csrfToken || '')},
        to_timestamp(${Number(row.createdAt || Date.now())} / 1000.0),
        to_timestamp(${Number(row.lastSeenAt || Date.now())} / 1000.0),
        to_timestamp(${Number(row.expiresAt || Date.now())} / 1000.0),
        ${row.adminUserId ? sqlLiteral(row.adminUserId) : 'null'},
        ${row.email ? sqlLiteral(row.email) : 'null'},
        ${sqlLiteral(JSON.stringify(row.roles || []))}::jsonb,
        ${sqlLiteral(JSON.stringify(row.permissions || []))}::jsonb
      );`);
    }
    parts.push('commit;');
    await execPsql(databaseUrl, parts.join('\n'));
  }

  async function readSessions() {
    if (!enabled) return null;
    const sql = `
      select json_build_object(
        'sid', sid,
        'csrfToken', csrf_token,
        'createdAt', (extract(epoch from created_at) * 1000)::bigint,
        'lastSeenAt', (extract(epoch from last_seen_at) * 1000)::bigint,
        'expiresAt', (extract(epoch from expires_at) * 1000)::bigint,
        'adminUserId', admin_user_id,
        'email', email,
        'roles', coalesce(roles_json, '[]'::jsonb),
        'permissions', coalesce(permissions_json, '[]'::jsonb)
      )::text
      from admin_sessions
      order by expires_at desc;
    `;
    const raw = await execPsql(databaseUrl, sql);
    if (!raw) return [];
    return raw.split('\n').map(line => line.trim()).filter(Boolean).map(line => JSON.parse(line));
  }

  function logCompareMismatch(kind, detail = {}) {
    if (!compareMode) return;
    logger.error('[persistence-compare-mismatch]', { kind, ...detail });
  }



  async function replaceOrders(rows) {
    if (!enabled) return;
    const parts = ['begin;', 'delete from orders;'];
    for (const row of rows || []) {
      parts.push(`insert into orders (id, customer, status, stage, amount, created_at, updated_at) values (
        ${sqlLiteral(row.id)},
        ${sqlLiteral(row.customer || '')},
        ${sqlLiteral(row.status || 'draft')},
        ${sqlLiteral(row.stage || 'draft')},
        ${Number(row.amount || 0)},
        ${row.createdAt ? `to_timestamp(${Date.parse(row.createdAt)} / 1000.0)` : 'now()'},
        ${row.updatedAt ? `to_timestamp(${Date.parse(row.updatedAt)} / 1000.0)` : 'now()'}
      );`);
    }
    parts.push('commit;');
    await execPsql(databaseUrl, parts.join('\n'));
  }

  async function replacePaymentEvents(rows) {
    if (!enabled) return;
    const parts = ['begin;', 'delete from payment_events;'];
    for (const row of rows || []) {
      parts.push(`insert into payment_events (id, at, provider, event_type, order_id, payment_session_id, payment_id, provider_status, order_status, source, payload_json) values (
        ${sqlLiteral(row.id)},
        ${row.at ? `to_timestamp(${Date.parse(row.at)} / 1000.0)` : 'now()'},
        ${sqlLiteral(row.provider || '')},
        ${sqlLiteral(row.eventType || 'unknown')},
        ${row.orderId ? sqlLiteral(row.orderId) : 'null'},
        ${row.paymentSessionId ? sqlLiteral(row.paymentSessionId) : 'null'},
        ${row.paymentId ? sqlLiteral(row.paymentId) : 'null'},
        ${row.providerStatus ? sqlLiteral(row.providerStatus) : 'null'},
        ${row.orderStatus ? sqlLiteral(row.orderStatus) : 'null'},
        ${row.source ? sqlLiteral(row.source) : 'null'},
        ${sqlLiteral(JSON.stringify(row.payload || {}))}::jsonb
      );`);
    }
    parts.push('commit;');
    await execPsql(databaseUrl, parts.join('\n'));
  }

  async function replaceWebhookInbox(rows) {
    if (!enabled) return;
    const parts = ['begin;', 'delete from webhook_inbox;'];
    for (const row of rows || []) {
      parts.push(`insert into webhook_inbox (id, provider, event_type, received_at, payment_id, order_id, reason, signature_present, verified, verification_mode, status, raw_sha256, payload_json) values (
        ${sqlLiteral(row.id)},
        ${sqlLiteral(row.provider || '')},
        ${sqlLiteral(row.eventType || 'unknown')},
        ${row.receivedAt ? `to_timestamp(${Date.parse(row.receivedAt)} / 1000.0)` : 'now()'},
        ${row.paymentId ? sqlLiteral(row.paymentId) : 'null'},
        ${row.orderId ? sqlLiteral(row.orderId) : 'null'},
        ${row.reason ? sqlLiteral(row.reason) : 'null'},
        ${row.signaturePresent ? 'true' : 'false'},
        ${row.verified ? 'true' : 'false'},
        ${row.verificationMode ? sqlLiteral(row.verificationMode) : 'null'},
        ${row.status ? sqlLiteral(row.status) : 'null'},
        ${row.rawSha256 ? sqlLiteral(row.rawSha256) : 'null'},
        ${sqlLiteral(JSON.stringify(row.payload || {}))}::jsonb
      );`);
    }
    parts.push('commit;');
    await execPsql(databaseUrl, parts.join('\n'));
  }
  return {
    mode,
    enabled,
    compareMode,
    async writeDbSnapshot(db) {
      return writeDbSnapshot(db);
    },
    async readDbSnapshot() {
      return readDbSnapshot();
    },
    async writeSessions(rows) {
      return writeSessions(rows);
    },
    async readSessions() {
      return readSessions();
    },
    logCompareMismatch
  };
}

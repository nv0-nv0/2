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


let schemaBootstrapPromise = null;
let schemaBootstrapDatabaseUrl = null;

const POSTGRES_SCHEMA_SQL = `
create table if not exists settings (
  key text primary key,
  value_json jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id text primary key,
  customer text not null,
  status text not null,
  stage text not null,
  amount integer not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_stage on orders(stage);

create table if not exists publications (
  id text primary key,
  title text not null,
  status text not null,
  created_at timestamptz not null
);
create index if not exists idx_publications_status on publications(status);

create table if not exists library_items (
  id text primary key,
  title text not null,
  body text,
  filename text,
  content_type text,
  created_at timestamptz not null
);
create index if not exists idx_library_items_created_at on library_items(created_at desc);

create table if not exists scans (
  request_id text primary key,
  target text not null,
  summary text not null,
  score integer not null,
  recommended_plan text,
  findings_json jsonb not null,
  next_actions_json jsonb not null,
  created_at timestamptz not null
);
create index if not exists idx_scans_created_at on scans(created_at desc);

create table if not exists audit_logs (
  id text primary key,
  at timestamptz not null,
  event text not null,
  ip text,
  method text,
  path text,
  meta_json jsonb not null default '{}'::jsonb
);
create index if not exists idx_audit_logs_at on audit_logs(at desc);
create index if not exists idx_audit_logs_event on audit_logs(event);

create table if not exists admin_sessions (
  sid text primary key,
  csrf_token text not null,
  created_at timestamptz not null,
  last_seen_at timestamptz not null,
  expires_at timestamptz not null,
  admin_user_id text,
  email text,
  roles_json jsonb not null default '[]'::jsonb,
  permissions_json jsonb not null default '[]'::jsonb
);
create index if not exists idx_admin_sessions_expires_at on admin_sessions(expires_at);

create table if not exists state_snapshots (
  collection_key text primary key,
  payload_json jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists idx_state_snapshots_updated_at on state_snapshots(updated_at desc);

create table if not exists payment_events (
  id text primary key,
  at timestamptz not null,
  provider text not null,
  event_type text not null,
  order_id text,
  payment_session_id text,
  payment_id text,
  provider_status text,
  order_status text,
  source text,
  payload_json jsonb not null default '{}'::jsonb
);
create index if not exists idx_payment_events_order_id on payment_events(order_id);
create index if not exists idx_payment_events_payment_id on payment_events(payment_id);
create index if not exists idx_payment_events_at on payment_events(at desc);

create table if not exists webhook_inbox (
  id text primary key,
  provider text not null,
  event_type text not null,
  received_at timestamptz not null,
  payment_id text,
  order_id text,
  reason text,
  signature_present boolean not null default false,
  verified boolean not null default false,
  verification_mode text,
  status text,
  raw_sha256 text,
  payload_json jsonb not null default '{}'::jsonb
);
create index if not exists idx_webhook_inbox_received_at on webhook_inbox(received_at desc);
create index if not exists idx_webhook_inbox_payment_id on webhook_inbox(payment_id);
`;

function createPsqlEnv(sourceEnv = process.env) {
  // Coolify can inject a very large environment block. Passing the whole
  // process.env to child_process.spawn can exceed Linux ARG_MAX and crash
  // before psql starts with `spawn E2BIG`. Keep only the variables psql
  // actually needs plus a safe executable search path.
  const allowList = [
    'PATH',
    'HOME',
    'LANG',
    'LC_ALL',
    'PGAPPNAME',
    'PGCONNECT_TIMEOUT',
    'PGSSLMODE',
    'PGSSLROOTCERT',
    'PGSSLCERT',
    'PGSSLKEY',
    'PGSERVICEFILE',
    'PGSERVICE'
  ];
  const childEnv = {
    PATH: sourceEnv.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    HOME: sourceEnv.HOME || '/tmp',
    LANG: sourceEnv.LANG || 'C.UTF-8'
  };
  for (const key of allowList) {
    if (sourceEnv[key]) childEnv[key] = sourceEnv[key];
  }
  return childEnv;
}

function runPsql(databaseUrl, sql) {
  return new Promise((resolve, reject) => {
    // Never pass SQL through `-c`. Snapshot payloads can contain large JSON
    // blobs; putting them in argv triggers E2BIG in production. Stream the SQL
    // over stdin instead so the command line remains tiny and deterministic.
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

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });
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

export async function ensurePostgresSchema(databaseUrl = process.env.NV0_DATABASE_URL, logger = console) {
  const url = String(databaseUrl || '').trim();
  if (!url) {
    throw new Error('PostgreSQL schema bootstrap failed: NV0_DATABASE_URL is empty.');
  }

  if (!schemaBootstrapPromise || schemaBootstrapDatabaseUrl !== url) {
    schemaBootstrapDatabaseUrl = url;
    schemaBootstrapPromise = runPsql(url, POSTGRES_SCHEMA_SQL).catch(error => {
      schemaBootstrapPromise = null;
      schemaBootstrapDatabaseUrl = null;
      const message = error instanceof Error ? error.message : String(error);
      logger?.error?.('[postgres-schema-bootstrap-failed]', { error: message });
      throw new Error(`PostgreSQL schema bootstrap failed: ${message}`);
    });
  }

  return schemaBootstrapPromise;
}

async function execPsql(databaseUrl, sql, logger = console) {
  await ensurePostgresSchema(databaseUrl, logger);
  return runPsql(databaseUrl, sql);
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
    await execPsql(databaseUrl, sql, logger);
  }

  async function writeCollections(payloads = {}) {
    if (!enabled) return;
    const parts = ['begin;'];
    for (const key of COLLECTION_KEYS) {
      const json = JSON.stringify(payloads[key] ?? null);
      parts.push(`insert into state_snapshots (collection_key, payload_json, updated_at)
        values (${sqlLiteral(key)}, ${sqlLiteral(json)}::jsonb, now())
        on conflict (collection_key)
        do update set payload_json = excluded.payload_json, updated_at = now();`);
    }
    parts.push('commit;');
    await execPsql(databaseUrl, parts.join('\n'), logger);
  }

  async function writeDbSnapshot(db) {
    if (!enabled) return;
    await writeCollections(db || {});
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
    const raw = await execPsql(databaseUrl, sql, logger);
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
    await execPsql(databaseUrl, parts.join('\n'), logger);
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
    const raw = await execPsql(databaseUrl, sql, logger);
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
    await execPsql(databaseUrl, parts.join('\n'), logger);
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
    await execPsql(databaseUrl, parts.join('\n'), logger);
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
    await execPsql(databaseUrl, parts.join('\n'), logger);
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

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

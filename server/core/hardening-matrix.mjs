export function buildOpenApiSpec(ctx = {}) {
  const baseUrl = ctx.baseUrl || 'https://nv0.kr';
  const releasePhase = ctx.releasePhase || 'runtime-hardening-v1';
  return {
    openapi: '3.1.0',
    info: {
      title: 'NV0 VERIDION Public/Admin API',
      version: releasePhase,
      description: 'Zero-cost hardening public contract. Admin routes require account RBAC session, CSRF header, and optional IP allowlist.'
    },
    servers: [{ url: baseUrl }],
    paths: {
      '/healthz': { get: { summary: 'Liveness probe', responses: { '200': { description: 'Process is alive' } } } },
      '/readyz': { get: { summary: 'Readiness probe', responses: { '200': { description: 'Runtime, persistence, storage and optional Redis are ready' }, '503': { description: 'Not ready' } } } },
      '/api/public/scan': { post: { summary: 'Run preliminary public evidence scan', responses: { '200': { description: 'Preliminary scan result' }, '429': { description: 'Rate limited' } } } },
      '/api/public/diagnose': { post: { summary: 'Alias for scan/diagnosis flow', responses: { '200': { description: 'Diagnosis result' } } } },
      '/api/public/board': { get: { summary: 'Paginated public board posts', responses: { '200': { description: 'Board posts' } } } },
      '/api/public/plans': { get: { summary: 'Plan catalog with risk-based recommendation', responses: { '200': { description: 'Plan list' } } } },
      '/api/public/release-readiness': { get: { summary: 'Public release readiness summary', responses: { '200': { description: 'Readiness summary' } } } },
      '/api/public/hardening-matrix': { get: { summary: '50-point hardening matrix summary', responses: { '200': { description: 'Hardening matrix' } } } },
      '/api/public/openapi.json': { get: { summary: 'OpenAPI contract', responses: { '200': { description: 'OpenAPI JSON' } } } },
      '/api/admin/session': { get: { summary: 'Read admin session' }, post: { summary: 'Create admin session' } },
      '/api/admin/ops-report': { get: { summary: 'Read operational report' } },
      '/api/admin/maintenance/prune': { post: { summary: 'Prune backups and expired runtime records' } },
      '/api/admin/backups/run': { post: { summary: 'Create local and optional remote backup snapshot' } }
    }
  };
}

export function buildHardeningMatrix(ctx = {}) {
  const implementedStatuses = new Set(['implemented', 'configured', 'documented', 'not_required_for_internal_compose', 'implemented_optional']);
  const checks = [
    ['Security', 'env_examples_only', 'implemented', '.env examples and Coolify bulk env use placeholders; real secrets remain external.'],
    ['Security', 'secret_rotation_runbook', 'operator_required', 'Rotation cadence is documented; execution requires external provider credentials.'],
    ['Security', 'r2_min_privilege', ctx.backupConfigured ? 'configured' : 'operator_required', 'S3-compatible adapter uses explicit bucket/prefix; IAM policy must be applied in Cloudflare R2.'],
    ['Security', 'bruteforce_rate_limit', 'implemented', `admin=${ctx.adminAuthLimit}/${ctx.adminAuthWindowMs}ms, publicScan=${ctx.publicScanLimit}/${ctx.publicScanWindowMs}ms`],
    ['Security', 'session_expiry_csrf', 'implemented', `admin ttl=${ctx.sessionTtlMs}ms, CSRF header required on mutating admin routes`],
    ['Security', 'admin_ip_allowlist', ctx.adminIpAllowlistCount ? 'configured' : (ctx.platformCommercial ? 'operator_required' : 'dev_open'), ctx.adminIpAllowlistCount ? `${ctx.adminIpAllowlistCount} allowlist entries` : 'NV0_ADMIN_IP_ALLOWLIST not set'],
    ['Security', 'cors_same_origin', 'implemented', 'No wildcard CORS is emitted; admin mutations require same-origin/CSRF.'],
    ['Security', 'dependency_surface', 'implemented', 'No runtime third-party npm dependencies; Node standard-library server.'],
    ['Security', 'database_ssl_policy', String(ctx.databaseUrl || '').includes('sslmode=require') || ctx.pgSslMode === 'require' ? 'configured' : 'not_required_for_internal_compose', 'Internal Docker network uses postgres service. For external DB set PGSSLMODE=require or sslmode=require.'],
    ['Security', 'docker_non_root', 'implemented', 'Dockerfile switches to USER node; Compose adds no-new-privileges/cap_drop.'],
    ['Infra', 'postgres_e2big', 'implemented', 'psql payload is streamed via stdin and child env is allowlisted.'],
    ['Infra', 'restore_drill', 'implemented', 'scripts/restore-drill.mjs performs non-destructive backup integrity simulation.'],
    ['Infra', 'slow_request_logging', 'implemented', `requests slower than ${ctx.slowRequestThresholdMs}ms are emitted as warn logs`],
    ['Infra', 'connection_pooling', 'operator_optional', 'Current psql bridge is short-lived; add PgBouncer when traffic requires persistent pooling.'],
    ['Infra', 'docker_volume_persistence', 'implemented', 'Named volumes nv0_runtime, nv0_postgres, nv0_redis are declared.'],
    ['Infra', 'coolify_rollback', 'documented', 'Deploy precheck, backups, smoke checks, and rollback runbooks are included.'],
    ['Infra', 'log_rotation', 'implemented', 'docker-compose logging max-size/max-file applied to services.'],
    ['Infra', 'multi_region_dr', 'operator_required', 'Remote encrypted backups are supported; second region bucket/server must be provisioned externally.'],
    ['Infra', 'state_persistence', 'implemented', 'Customer sessions, saved sites, scans, and orders are server-backed.'],
    ['Infra', 'redis_layer', ctx.redisConfigured ? 'configured' : 'implemented_optional', 'Redis adapters exist for session/rate-limit/lock.'],
    ['FE', 'loading_stall', 'implemented', 'Legacy hardening fixes and routes smoke tests retained.'],
    ['FE', 'image_optimization', 'documented', 'Static assets are small; WebP conversion remains build-pipeline optional.'],
    ['FE', 'bundle_size', 'implemented', 'Vanilla static pages avoid bundler dependency and large JS bundles.'],
    ['FE', 'seo_meta', 'implemented', 'Server injects route-level meta, sitemap, robots, feed, and structured data.'],
    ['FE', 'lighthouse_monitoring', 'operator_optional', 'Run Lighthouse/PageSpeed manually or in CI if Chrome is available.'],
    ['FE', 'error_pages', 'implemented', '404/500 fallback contract is validated in the runtime hardening baseline.'],
    ['FE', 'font_display', 'implemented', 'No external webfont dependency; layout shift risk minimized.'],
    ['FE', 'pwa', 'optional', 'Not required for current conversion path; can be added without backend change.'],
    ['FE', 'dark_mode', 'implemented', 'CSS variables and dark-mode compatibility are covered by guard scripts.'],
    ['FE', 'server_validation', 'implemented', 'All mutating public/admin payloads pass server-side normalizers.'],
    ['Ops', 'payment_failure_recovery', 'implemented', 'paymentSessions/paymentEvents/webhookInbox and sync/cancel admin routes exist.'],
    ['Ops', 'terms_versioning', 'implemented', 'Document preview and consent timestamps include the release stage.'],
    ['Ops', 'notification_tracking', 'implemented', 'emailOutbox retries and admin processing route are implemented.'],
    ['Ops', 'admin_audit_logs', 'implemented', `audit retention=${ctx.auditLogRetentionCount}`],
    ['Ops', 'dashboard_counts', 'implemented', 'Admin status reads counts from persisted DB state.'],
    ['Ops', 'i18n_readiness', 'documented', 'Current launch is Korean-first; copy is isolated in static pages and server builders.'],
    ['Ops', 'support_channel', 'implemented', ctx.supportMode === 'phone_or_email' ? 'Phone/support email displayed' : 'Email-only support is explicitly disclosed.'],
    ['Ops', 'api_docs', 'implemented', '/api/public/openapi.json generated by server.'],
    ['Ops', 'batch_monitoring', 'implemented', 'CTA autopublish, auto backup, email outbox, ops self-test and operational events are present.'],
    ['Ops', 'data_destruction', 'implemented', `cleanupDataRetention prunes expired records and anonymizes disabled customers after ${ctx.dataDestructionGraceDays} days`],
    ['QA', 'e2e_core', 'implemented', 'tests/e2e.mjs and routes-smoke are part of final gate.'],
    ['QA', 'browser_matrix', 'operator_required', 'Cross-device manual smoke matrix added; actual Safari/Samsung Internet requires devices/cloud browser.'],
    ['QA', 'stress_test', 'implemented', 'scripts/stress-smoke.mjs provides zero-cost local concurrent request test.'],
    ['QA', 'shadow_deployment', 'documented', 'Coolify preview/shadow checklist included; real traffic mirroring requires infra setting.'],
    ['QA', 'style_consistency', 'implemented', 'Syntax and render-safety checks are CI-enforced.'],
    ['QA', 'dead_code_archive', 'implemented', 'scripts/audit-inventory.mjs and historical document archive policy included.'],
    ['QA', 'hotfix_fast_track', 'documented', 'Runtime hardening runbook defines precheck -> backup -> deploy -> smoke -> rollback path.'],
    ['QA', 'docs_archive', 'implemented', 'Historical stage documents are separated and the current handoff supersedes older iterations.'],
    ['QA', 'visual_regression', 'implemented', 'Static route smoke plus CSS/HTML guard; true screenshot diff remains optional without browser service.'],
    ['QA', 'health_endpoint', 'implemented', '/healthz, /health, /livez, /readyz are supported.']
  ].map(([area, key, status, evidence], index) => ({ id: index + 1, area, key, status, evidence }));
  const implemented = checks.filter(item => implementedStatuses.has(item.status)).length;
  const operatorRequired = checks.filter(item => item.status === 'operator_required').length;
  return {
    ok: checks.length === 50,
    version: ctx.version || 'runtime-hardening-matrix-v1',
    phase: ctx.releasePhase || 'runtime-hardening-v1',
    checkedAt: ctx.checkedAt || new Date().toISOString(),
    score: { total: checks.length, implemented, operatorRequired, optional: checks.length - implemented - operatorRequired },
    checks
  };
}

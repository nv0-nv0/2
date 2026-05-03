import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function read(file) { return readFileSync(file, 'utf8'); }
const checks = [];
function add(name, ok, detail = '') { checks.push({ name, ok: Boolean(ok), detail }); }
function run(name, cmd, args, options = {}) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', ...options });
  add(name, res.status === 0, `${res.stdout || ''}${res.stderr || ''}`.trim());
  return res;
}

const server = read('server/index.mjs');
const envReader = read('server/config/env.mjs');
const envExample = read('.env.example');
const pkg = JSON.parse(read('package.json'));

add('phase:package-version', pkg.version.includes('phase176-access-log-scan-hygiene'));
add('phase:script-registered', pkg.scripts?.['validate:phase176'] === 'node scripts/validate-phase176-access-log-hygiene.mjs');
add('env:access-log-mode-reader', envReader.includes('NV0_ACCESS_LOG_MODE') && envReader.includes('logHealthcheckRequests'));
add('env:examples-include-quiet-healthz', envExample.includes('NV0_LOG_HEALTHCHECK_REQUESTS=false') && envExample.includes('NV0_LOG_FAVICON_REQUESTS=false'));
add('server:healthcheck-log-suppression', server.includes('shouldLogRequest') && server.includes('isHealthcheckPath(req)') && server.includes('LOG_HEALTHCHECK_REQUESTS'));
add('server:error-and-slow-logs-preserved', server.includes('statusCode >= 400') && server.includes('elapsedMs >= SLOW_REQUEST_THRESHOLD_MS'));
add('server:favicon-no-content', server.includes("pathname === '/favicon.ico'") && server.includes('noContent(req, res, 204'));
add('server:security-txt', server.includes("pathname === '/.well-known/security.txt'") && server.includes('buildSecurityTxt'));

run('syntax:server', 'node', ['--check', 'server/index.mjs']);

const port = String(45670 + Math.floor(Math.random() * 500));
const child = spawnSync('node', ['scripts/smoke.mjs'], {
  encoding: 'utf8',
  env: {
    ...process.env,
    PORT: port,
    NV0_ACCESS_LOG_MODE: 'normal',
    NV0_LOG_HEALTHCHECK_REQUESTS: 'false',
    NV0_LOG_FAVICON_REQUESTS: 'false'
  },
  timeout: 20000
});
add('smoke:phase176-normal-mode', child.status === 0, `${child.stdout || ''}${child.stderr || ''}`.trim());

const failed = checks.filter(x => !x.ok);
console.log(JSON.stringify({ ok: failed.length === 0, phase: 'phase176-access-log-scan-hygiene', total: checks.length, failed: failed.length, checks }, null, 2));
if (failed.length) process.exit(1);

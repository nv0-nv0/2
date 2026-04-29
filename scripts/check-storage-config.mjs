import fs from 'node:fs';
import path from 'node:path';

function loadEnvFile(filePath) {
  const abs = path.resolve(filePath);
  const text = fs.readFileSync(abs, 'utf8');
  const env = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return env;
}

const env = process.argv[2] ? loadEnvFile(process.argv[2]) : process.env;
const errors = [];
const warnings = [];
const placeholders = [];

function val(key) { return String(env[key] || '').trim(); }
function isPlaceholder(value) {
  const text = String(value || '').trim().toLowerCase();
  return !text || ['replace-with', 'replace_real', 'r2_account_id', 'r2_access_key_id', 'r2_secret_key', 'changeme', 'dummy', 'example.com', 'localhost'].some(token => text.includes(token));
}

const storageMode = val('NV0_STORAGE_MODE');
const endpoint = val('NV0_S3_ENDPOINT');
const region = val('NV0_S3_REGION');
const bucket = val('NV0_S3_BUCKET');
const accessKey = val('NV0_S3_ACCESS_KEY_ID');
const secretKey = val('NV0_S3_SECRET_ACCESS_KEY');

if (storageMode === 'local_fs') errors.push('NV0_STORAGE_MODE=local_fs is not allowed for commercial launch.');
if (!['s3', 's3_compatible', 'object_storage'].includes(storageMode)) errors.push('NV0_STORAGE_MODE must be s3, s3_compatible, or object_storage.');
for (const key of ['NV0_S3_ENDPOINT','NV0_S3_BUCKET','NV0_S3_ACCESS_KEY_ID','NV0_S3_SECRET_ACCESS_KEY']) {
  if (!val(key)) errors.push(`${key} is required.`);
  if (isPlaceholder(val(key))) placeholders.push(key);
}

let endpointHost = '';
try {
  const parsed = new URL(endpoint);
  endpointHost = parsed.hostname;
  if (parsed.pathname && parsed.pathname !== '/') warnings.push('NV0_S3_ENDPOINT should not contain a path; keep bucket in NV0_S3_BUCKET only.');
} catch {
  errors.push('NV0_S3_ENDPOINT must be a valid URL.');
}

if (/r2\.cloudflarestorage\.com$/i.test(endpointHost)) {
  if (region !== 'auto') errors.push('Cloudflare R2 requires NV0_S3_REGION=auto in this project.');
  if (val('NV0_S3_FORCE_PATH_STYLE') !== 'true') warnings.push('R2 profile should use NV0_S3_FORCE_PATH_STYLE=true for this code path.');
  if (!/^https:\/\/[^/]+\.r2\.cloudflarestorage\.com$/i.test(endpoint)) warnings.push('R2 endpoint should be https://<ACCOUNT_ID>.r2.cloudflarestorage.com with no bucket path.');
}
if (endpoint.includes('/' + bucket + '/')) warnings.push('Do not include the bucket name inside NV0_S3_ENDPOINT; keep it in NV0_S3_BUCKET only.');

const report = { ok: errors.length === 0, storageMode, endpoint, bucket, region, endpointHost, placeholders, errors, warnings };
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exit(1);

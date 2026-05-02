import crypto from 'node:crypto';

export function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hmac(key, value, encoding) {
  return crypto.createHmac('sha256', key).update(value).digest(encoding);
}

export function getS3CompatibleConfig(env = process.env) {
  return {
    endpoint: String(env.NV0_S3_ENDPOINT || '').replace(/\/$/, ''),
    bucket: String(env.NV0_S3_BUCKET || '').trim(),
    region: String(env.NV0_S3_REGION || 'ap-northeast-2').trim(),
    accessKey: String(env.NV0_S3_ACCESS_KEY_ID || '').trim(),
    secretKey: String(env.NV0_S3_SECRET_ACCESS_KEY || '').trim(),
    publicBaseUrl: String(env.NV0_S3_PUBLIC_BASE_URL || '').replace(/\/$/, ''),
    forcePathStyle: String(env.NV0_S3_FORCE_PATH_STYLE || 'true') === 'true'
  };
}

export function isS3CompatibleConfigured(env = process.env) {
  const config = getS3CompatibleConfig(env);
  return Boolean(config.endpoint && config.bucket && config.accessKey && config.secretKey);
}

export function s3CompatibleConfigSummary(env = process.env) {
  const config = getS3CompatibleConfig(env);
  let endpointHost = '';
  try { endpointHost = new URL(config.endpoint).host; } catch {}
  return {
    configured: isS3CompatibleConfigured(env),
    endpointHost,
    bucket: config.bucket ? `${config.bucket.slice(0, 3)}***${config.bucket.slice(-2)}` : '',
    region: config.region,
    publicBaseUrlConfigured: Boolean(config.publicBaseUrl),
    forcePathStyle: config.forcePathStyle
  };
}

export async function putObjectToS3Compatible({ env = process.env, key, content, contentType }) {
  const config = getS3CompatibleConfig(env);
  if (!config.endpoint || !config.bucket || !config.accessKey || !config.secretKey) throw new Error('S3 compatible storage is not configured.');
  if (!key || /(^|\/)\.\.($|\/)/.test(String(key))) throw new Error('invalid object key');
  const body = Buffer.isBuffer(content) ? content : Buffer.from(String(content ?? ''));
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const encodedKey = String(key).split('/').map(encodeURIComponent).join('/');
  const url = new URL(`${config.endpoint}/${config.bucket}/${encodedKey}`);
  const host = url.host;
  const payloadHash = sha256Hex(body);
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = ['PUT', url.pathname, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n');
  const kDate = hmac(`AWS4${config.secretKey}`, dateStamp);
  const kRegion = hmac(kDate, config.region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = hmac(kSigning, stringToSign, 'hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      authorization,
      'content-type': contentType || 'application/octet-stream',
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate
    },
    body
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`S3 upload failed: ${response.status} ${errorText}`.trim());
  }
  return { key: String(key), size: body.length, sha256: payloadHash, url: config.publicBaseUrl ? `${config.publicBaseUrl}/${encodedKey}` : url.toString() };
}

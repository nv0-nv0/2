import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const COMPRESSIBLE_TYPE = /^(?:text\/|application\/(?:javascript|json|xml|rss\+xml)|image\/svg\+xml)/i;

function parseAcceptedEncodings(raw = '') {
  const accepted = new Map();
  for (const token of String(raw || '').split(',')) {
    const [namePart, ...params] = token.trim().toLowerCase().split(';');
    const name = namePart.trim();
    if (!name) continue;
    let q = 1;
    for (const param of params) {
      const match = param.trim().match(/^q=(0(?:\.\d+)?|1(?:\.0+)?)$/);
      if (match) q = Number(match[1]);
    }
    accepted.set(name, q);
  }
  return accepted;
}

export function preferredContentEncoding(req = {}) {
  const accepted = parseAcceptedEncodings(req?.headers?.['accept-encoding']);
  const wildcard = accepted.get('*') ?? 0;
  const br = accepted.get('br') ?? wildcard;
  const gzip = accepted.get('gzip') ?? wildcard;
  if (br <= 0 && gzip <= 0) return '';
  return br >= gzip && br > 0 ? 'br' : 'gzip';
}

export function isCompressiblePublicType(contentType = '') {
  return COMPRESSIBLE_TYPE.test(String(contentType || '').trim());
}

export function createPublicResponseCompressor({ minBytes = 1_024, maxEntries = 160 } = {}) {
  const cache = new Map();
  const stats = { cacheHits: 0, cacheMisses: 0, compressed: 0, bypassed: 0, evicted: 0 };

  function varyHeaders({ contentType = '', bodyBytes = 0 } = {}) {
    return isCompressiblePublicType(contentType) && Number(bodyBytes) >= minBytes ? { vary: 'Accept-Encoding' } : {};
  }

  function remember(key, value) {
    if (!key) return;
    if (cache.has(key)) cache.delete(key);
    cache.set(key, value);
    while (cache.size > maxEntries) {
      cache.delete(cache.keys().next().value);
      stats.evicted += 1;
    }
  }

  function compress(req, input, { contentType = '', cacheKey = '' } = {}) {
    const body = Buffer.isBuffer(input) ? input : Buffer.from(String(input ?? ''), 'utf8');
    const vary = varyHeaders({ contentType, bodyBytes: body.byteLength });
    if (!vary.vary) {
      stats.bypassed += 1;
      return { body, headers: {}, encoding: '', compressed: false };
    }
    const encoding = preferredContentEncoding(req);
    if (!encoding) {
      stats.bypassed += 1;
      return { body, headers: vary, encoding: '', compressed: false };
    }
    const key = cacheKey ? `${cacheKey}|${encoding}` : '';
    if (key && cache.has(key)) {
      stats.cacheHits += 1;
      const cached = cache.get(key);
      cache.delete(key);
      cache.set(key, cached);
      return cached;
    }
    stats.cacheMisses += 1;
    const encoded = encoding === 'br'
      ? brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } })
      : gzipSync(body, { level: 6 });
    if (encoded.byteLength >= body.byteLength) {
      stats.bypassed += 1;
      return { body, headers: vary, encoding: '', compressed: false };
    }
    stats.compressed += 1;
    const result = { body: encoded, headers: { ...vary, 'content-encoding': encoding }, encoding, compressed: true };
    remember(key, result);
    return result;
  }

  function clear() {
    cache.clear();
    for (const key of Object.keys(stats)) stats[key] = 0;
  }

  return Object.freeze({ compress, varyHeaders, clear, stats });
}

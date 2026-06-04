import assert from 'node:assert/strict';
import { createPublicResponseCompressor, isCompressiblePublicType, preferredContentEncoding } from '../server/core/public-response-compression.mjs';

const checks = [];
function add(name, fn) { try { fn(); checks.push({ name, pass: true }); } catch (error) { checks.push({ name, pass: false, error: error.message }); } }
const req = encoding => ({ headers: { 'accept-encoding': encoding } });
add('content-negotiation-prefers-brotli-on-equal-quality', () => assert.equal(preferredContentEncoding(req('gzip, br')), 'br'));
add('content-negotiation-respects-quality', () => assert.equal(preferredContentEncoding(req('br;q=0.4, gzip;q=0.9')), 'gzip'));
add('content-negotiation-respects-disabled-and-wildcard', () => { assert.equal(preferredContentEncoding(req('br;q=0, gzip;q=0')), ''); assert.equal(preferredContentEncoding(req('*;q=0.5')), 'br'); });
add('compressible-types-are-public-text-only', () => { assert.equal(isCompressiblePublicType('text/html; charset=utf-8'), true); assert.equal(isCompressiblePublicType('application/javascript; charset=utf-8'), true); assert.equal(isCompressiblePublicType('image/png'), false); });
const compressor = createPublicResponseCompressor({ minBytes: 64, maxEntries: 2 });
const body = Buffer.from('<main>' + '공개 페이지 압축 '.repeat(120) + '</main>');
const first = compressor.compress(req('br, gzip'), body, { contentType: 'text/html; charset=utf-8', cacheKey: 'html:test' });
const second = compressor.compress(req('br, gzip'), body, { contentType: 'text/html; charset=utf-8', cacheKey: 'html:test' });
add('brotli-compresses-repetitive-public-html', () => { assert.equal(first.encoding, 'br'); assert.equal(first.headers.vary, 'Accept-Encoding'); assert.equal(first.headers['content-encoding'], 'br'); assert.ok(first.body.byteLength < body.byteLength); });
add('compressed-public-response-is-memory-cached', () => { assert.equal(second.body, first.body); assert.equal(compressor.stats.cacheHits, 1); });
add('small-or-binary-payloads-bypass-compression', () => { assert.equal(compressor.compress(req('br'), Buffer.from('small'), { contentType: 'text/plain' }).compressed, false); assert.equal(compressor.compress(req('br'), body, { contentType: 'image/png' }).compressed, false); });
add('identity-clients-receive-vary-with-original-body', () => { const result = compressor.compress(req('identity'), body, { contentType: 'text/html' }); assert.equal(result.compressed, false); assert.equal(result.headers.vary, 'Accept-Encoding'); assert.equal(result.body, body); });
const failed = checks.filter(check => !check.pass);
console.log(JSON.stringify({ ok: failed.length === 0, contract: 'public-response-compression-contract-v1', checked: checks.length, failed: failed.length, checks }, null, 2));
assert.equal(failed.length, 0, JSON.stringify(failed, null, 2));

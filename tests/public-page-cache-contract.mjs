import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createPublicPageCache, requestMatchesEtag, responseEtag } from '../server/core/public-page-cache.mjs';

const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'veridion-page-cache-'));
const page = path.join(dir, 'index.html');
const checks = [];
function add(name, fn) { try { fn(); checks.push({ name, pass: true }); } catch (error) { checks.push({ name, pass: false, error: error.message }); } }
try {
  await fs.writeFile(page, '<h1>first</h1>');
  const cached = createPublicPageCache({ enabled: true, readTextFile: file => fs.readFile(file, 'utf8') });
  const first = await cached.readTemplate(page);
  await fs.writeFile(page, '<h1>second</h1>');
  const second = await cached.readTemplate(page);
  add('enabled-template-cache-keeps-first-read', () => assert.equal(first, second));
  add('enabled-template-cache-reports-hit-and-miss', () => assert.deepEqual({ hits: cached.stats.templateHits, misses: cached.stats.templateMisses }, { hits: 1, misses: 1 }));
  add('render-cache-stores-and-loads-shell', () => { assert.equal(cached.getRendered('home'), ''); cached.setRendered('home', '<main>cached</main>'); assert.equal(cached.getRendered('home'), '<main>cached</main>'); });
  cached.clear();
  add('clear-resets-cache-and-stats', () => { assert.equal(cached.getRendered('home'), ''); assert.equal(cached.stats.renderHits, 0); assert.equal(cached.stats.renderMisses, 1); });

  const uncached = createPublicPageCache({ enabled: false, readTextFile: file => fs.readFile(file, 'utf8') });
  await fs.writeFile(page, '<h1>third</h1>');
  const third = await uncached.readTemplate(page);
  await fs.writeFile(page, '<h1>fourth</h1>');
  const fourth = await uncached.readTemplate(page);
  add('disabled-cache-always-rereads-template', () => assert.notEqual(third, fourth));
  add('disabled-render-cache-does-not-store-shell', () => { uncached.setRendered('home', 'value'); assert.equal(uncached.getRendered('home'), ''); });

  const body = Buffer.from('<html>cache</html>');
  const etag = responseEtag(body);
  add('etag-is-stable-and-weak', () => { assert.match(etag, /^W\//); assert.equal(responseEtag(body), etag); assert.notEqual(responseEtag(Buffer.from('<html>changed</html>')), etag); });
  add('if-none-match-supports-exact-wildcard-and-lists', () => {
    assert.equal(requestMatchesEtag({ headers: { 'if-none-match': etag } }, etag), true);
    assert.equal(requestMatchesEtag({ headers: { 'if-none-match': '*' } }, etag), true);
    assert.equal(requestMatchesEtag({ headers: { 'if-none-match': `"other", ${etag}` } }, etag), true);
    assert.equal(requestMatchesEtag({ headers: { 'if-none-match': '"other"' } }, etag), false);
  });
} finally {
  await fs.rm(dir, { recursive: true, force: true });
}
const failed = checks.filter(check => !check.pass);
console.log(JSON.stringify({ ok: failed.length === 0, contract: 'public-page-cache-contract-v1', checked: checks.length, failed: failed.length, checks }, null, 2));
assert.equal(failed.length, 0, JSON.stringify(failed, null, 2));

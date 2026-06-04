import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ASSET_VERSION, PACKAGE_VERSION } from '../shared/release-version.mjs';

const root = process.cwd();
const budgets = Object.freeze({ htmlBytes: 180_000, cssBytes: 220_000, jsBytes: 260_000, publicCssTotalBytes: 140_000, publicJsLargestBytes: 120_000, serverIndexBytes: 270_000, serverIndexLines: 5_000, sharedRebrandRepeatedSelectors: 191, demoCssRepeatedSelectors: 106 });
const failures = [];
const metrics = { htmlFiles: 0, cssFiles: 0, jsFiles: 0, localAssetRefs: 0, publicCssTotalBytes: 0, largestPublicJsBytes: 0, largestPublicJs: '', serverIndexBytes: 0, serverIndexLines: 0, sharedRebrandRepeatedSelectors: 0, demoCssRepeatedSelectors: 0, assetVersion: ASSET_VERSION, packageVersion: PACKAGE_VERSION };
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
function rel(file) { return path.relative(root, file).replaceAll('\\', '/'); }
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function requireText(file, token, label = token) { if (!read(file).includes(token)) failures.push(`${file}: missing ${label}`); }

function repeatedSelectorCount(file) {
  const css = read(file);
  const counts = new Map();
  for (const match of css.matchAll(/([^{}]+)\{/g)) {
    const group = match[1].trim();
    if (!group || group.startsWith('@')) continue;
    for (const selector of group.split(',').map(value => value.trim()).filter(Boolean)) counts.set(selector, (counts.get(selector) || 0) + 1);
  }
  return [...counts.values()].filter(count => count > 1).length;
}

const appFiles = walk(path.join(root, 'apps'));
for (const file of appFiles) {
  const relative = rel(file);
  const size = fs.statSync(file).size;
  if (relative.endsWith('.html')) {
    metrics.htmlFiles += 1;
    if (size > budgets.htmlBytes) failures.push(`${relative}: ${size} > ${budgets.htmlBytes}`);
    const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/(?:href|src)=["'](\/(?:shared|apps)\/[^"']+\.(?:css|js|mjs)(?:\?[^"']*)?)["']/g)) {
      metrics.localAssetRefs += 1;
      const asset = new URL(match[1], 'https://nv0.kr');
      if (asset.searchParams.get('v') !== ASSET_VERSION) failures.push(`${relative}: stale or missing asset version ${match[1]}`);
    }
  }
  if (relative.endsWith('.css')) {
    metrics.cssFiles += 1;
    if (relative.startsWith('apps/public/')) metrics.publicCssTotalBytes += size;
    if (size > budgets.cssBytes) failures.push(`${relative}: ${size} > ${budgets.cssBytes}`);
  }
  if (relative.endsWith('.js')) {
    metrics.jsFiles += 1;
    if (size > budgets.jsBytes) failures.push(`${relative}: ${size} > ${budgets.jsBytes}`);
    if (relative.startsWith('apps/public/') && size > metrics.largestPublicJsBytes) { metrics.largestPublicJsBytes = size; metrics.largestPublicJs = relative; }
  }
}
for (const file of walk(path.join(root, 'shared'))) {
  const relative = rel(file);
  const size = fs.statSync(file).size;
  if (relative.endsWith('.css')) {
    metrics.cssFiles += 1;
    metrics.publicCssTotalBytes += size;
    if (size > budgets.cssBytes) failures.push(`${relative}: ${size} > ${budgets.cssBytes}`);
  }
  if (relative.endsWith('.js') || relative.endsWith('.mjs')) {
    metrics.jsFiles += 1;
    if (size > budgets.jsBytes) failures.push(`${relative}: ${size} > ${budgets.jsBytes}`);
    if (size > metrics.largestPublicJsBytes) { metrics.largestPublicJsBytes = size; metrics.largestPublicJs = relative; }
  }
}
if (metrics.publicCssTotalBytes > budgets.publicCssTotalBytes) failures.push(`public CSS total: ${metrics.publicCssTotalBytes} > ${budgets.publicCssTotalBytes}`);

metrics.serverIndexBytes = fs.statSync(path.join(root, 'server/index.mjs')).size;
metrics.serverIndexLines = read('server/index.mjs').split(/\r?\n/).length;
metrics.sharedRebrandRepeatedSelectors = repeatedSelectorCount('shared/veridion-rebrand.css');
metrics.demoCssRepeatedSelectors = repeatedSelectorCount('apps/public/demo/app.css');
if (metrics.serverIndexBytes > budgets.serverIndexBytes) failures.push(`server/index.mjs bytes: ${metrics.serverIndexBytes} > ${budgets.serverIndexBytes}`);
if (metrics.serverIndexLines > budgets.serverIndexLines) failures.push(`server/index.mjs lines: ${metrics.serverIndexLines} > ${budgets.serverIndexLines}`);
if (metrics.sharedRebrandRepeatedSelectors > budgets.sharedRebrandRepeatedSelectors) failures.push(`shared/veridion-rebrand.css repeated selectors: ${metrics.sharedRebrandRepeatedSelectors} > ${budgets.sharedRebrandRepeatedSelectors}`);
if (metrics.demoCssRepeatedSelectors > budgets.demoCssRepeatedSelectors) failures.push(`apps/public/demo/app.css repeated selectors: ${metrics.demoCssRepeatedSelectors} > ${budgets.demoCssRepeatedSelectors}`);
if (metrics.largestPublicJsBytes > budgets.publicJsLargestBytes) failures.push(`${metrics.largestPublicJs}: ${metrics.largestPublicJsBytes} > ${budgets.publicJsLargestBytes}`);
requireText('server/index.mjs', 'createPublicPageCache', 'production HTML cache module usage');
requireText('server/index.mjs', 'publicPageCache.getRendered', 'rendered public page cache usage');
requireText('server/core/public-page-cache.mjs', 'const templateCache = new Map();', 'production HTML template cache');
requireText('server/core/public-page-cache.mjs', 'const renderedPublicPageCache = new Map();', 'rendered public page cache');
requireText('server/core/public-page-cache.mjs', 'function responseEtag(body)', 'public HTML ETag helper');
requireText('server/core/public-page-cache.mjs', "['if-none-match']", 'If-None-Match revalidation');
requireText('server/index.mjs', 'createPublicResponseCompressor', 'public text compression module usage');
requireText('server/core/public-response-compression.mjs', 'brotliCompressSync', 'Brotli public text compression');
requireText('server/core/public-response-compression.mjs', 'gzipSync', 'gzip public text fallback');
for (const file of ['docker-compose.yml', 'deploy/docker-compose.coolify.yml']) requireText(file, 'NV0_PUBLIC_ASSET_CACHE_SECONDS:-31536000', 'one-year immutable asset cache default');
requireText('.env.coolify.example', 'NV0_PUBLIC_ASSET_CACHE_SECONDS=31536000', 'Coolify immutable asset cache example');
assert.equal(failures.length, 0, JSON.stringify({ budgets, metrics, failures }, null, 2));
console.log(JSON.stringify({ ok: true, contract: 'performance-budget-and-cache-contract-v2', budgets, metrics, failures }, null, 2));

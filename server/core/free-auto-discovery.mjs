import net from 'node:net';
import { lookup } from 'node:dns/promises';
function safeUrl(value = '') {
  try {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}
function ipv4Parts(address = '') {
  const raw = String(address || '').trim().toLowerCase();
  const mapped = raw.startsWith('::ffff:') ? raw.slice(7) : raw;
  const dotted = mapped.split('.');
  if (dotted.length === 4 && dotted.every(part => /^\d{1,3}$/.test(part))) {
    const parts = dotted.map(Number);
    return parts.every(value => Number.isInteger(value) && value >= 0 && value <= 255) ? parts : null;
  }
  if (/^\d+$/.test(mapped)) {
    const value = Number(mapped);
    if (Number.isSafeInteger(value) && value >= 0 && value <= 0xffffffff) return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
  }
  return null;
}
function isBlockedIpAddress(address = '') {
  const normalized = String(address || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  const v4 = ipv4Parts(normalized);
  if (v4) {
    const [a, b, c] = v4;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 192 && b === 0 && c === 0) return true;
    if (a === 192 && b === 0 && c === 2) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a === 198 && b === 51 && c === 100) return true;
    if (a === 203 && b === 0 && c === 113) return true;
    if (a >= 224) return true;
    return false;
  }
  if (!net.isIP(normalized)) return false;
  if (normalized === '::' || normalized === '::1') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:')) return true;
  if (normalized.startsWith('ff')) return true;
  return false;
}
function isBlockedTargetUrl(url) {
  if (!url || !['http:', 'https:'].includes(url.protocol)) return true;
  const host = String(url.hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  const blockedNames = new Set(['localhost', '0.0.0.0', 'metadata.google.internal']);
  if (blockedNames.has(host) || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (isBlockedIpAddress(host)) return true;
  return false;
}
async function isBlockedTargetUrlResolved(url) {
  if (isBlockedTargetUrl(url)) return true;
  const host = String(url.hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (net.isIP(host)) return isBlockedIpAddress(host);
  try {
    const records = await lookup(host, { all: true, verbatim: true });
    if (!Array.isArray(records) || records.length === 0) return true;
    return records.some(record => isBlockedIpAddress(record.address));
  } catch {
    return true;
  }
}
async function readLimitedText(res, maxBytes = 256 * 1024) {
  const declaredLength = Number(res.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new Error('target_response_too_large');
  if (!res.body || typeof res.body.getReader !== 'function') {
    const text = await res.text();
    if (Buffer.byteLength(text, 'utf8') > maxBytes) throw new Error('target_response_too_large');
    return text;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      try { await reader.cancel(); } catch {}
      throw new Error('target_response_too_large');
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return text;
}
function normalizeInternalUrl(href = '', baseUrl = '') {
  const raw = String(href || '').trim();
  if (!raw || raw.startsWith('#') || /^(mailto:|tel:|javascript:|data:)/i.test(raw)) return null;
  try {
    const base = new URL(baseUrl);
    const url = new URL(raw, base);
    if (url.origin !== base.origin) return null;
    url.hash = '';
    url.search = '';
    return url.toString();
  } catch {
    return null;
  }
}
function extractInternalCandidateLinks(html = '', baseUrl = '') {
  const links = [];
  const source = String(html || '');
  const hrefRe = /<a\b[^>]*?href\s*=\s*(['"])(.*?)\1/gi;
  let match;
  while ((match = hrefRe.exec(source))) {
    const url = normalizeInternalUrl(match[2], baseUrl);
    if (url) links.push(url);
  }
  const formRe = /<form\b[^>]*?action\s*=\s*(['"])(.*?)\1/gi;
  while ((match = formRe.exec(source))) {
    const url = normalizeInternalUrl(match[2], baseUrl);
    if (url) links.push(url);
  }
  return links;
}
async function mapWithConcurrency(items, limit, mapper) {
  const out = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      out[current] = await mapper(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit || 1), items.length) }, worker));
  return out;
}
async function fetchTextResource(target, { accept = 'text/plain,application/xml,text/xml,*/*;q=0.8', source = 'discovery_resource', timeoutMs = 3000, maxBytes = 256 * 1024, maxRedirects = 3 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let current = safeUrl(target);
  try {
    if (!current || await isBlockedTargetUrlResolved(current)) return { fetched: false, error: 'blocked_target_url', text: '', finalUrl: String(target || ''), status: 0, contentType: '', source };
    for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
      const res = await fetch(current.toString(), {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; NV0/0.1; +https://nv0.kr/bot)',
          accept,
          'accept-language': 'ko-KR,ko;q=0.9,en;q=0.6'
        }
      });
      const location = res.headers.get('location');
      if ([301, 302, 303, 307, 308].includes(res.status) && location) {
        const next = new URL(location, current);
        if (await isBlockedTargetUrlResolved(next)) return { fetched: false, error: 'blocked_redirect_target', text: '', finalUrl: next.toString(), status: res.status, contentType: '', source };
        current = next;
        continue;
      }
      const contentType = String(res.headers.get('content-type') || '');
      const text = await readLimitedText(res, maxBytes).catch((error) => { throw error; });
      return { fetched: true, status: res.status, text, finalUrl: current.toString(), contentType, error: null, source };
    }
    return { fetched: false, error: 'too_many_redirects', text: '', finalUrl: current.toString(), status: 0, contentType: '', source };
  } catch (error) {
    return { fetched: false, error: error.message, text: '', finalUrl: current?.toString?.() || target, status: 0, contentType: '', source };
  } finally {
    clearTimeout(timeout);
  }
}
function canonicalResourceUrl(target, pathname = '/') {
  const url = safeUrl(String(target || '').trim());
  if (!url) return null;
  const next = new URL(url.toString());
  next.pathname = pathname;
  next.search = '';
  next.hash = '';
  return next.toString();
}
function extractSitemapUrlsFromRobots(text = '', baseUrl = '') {
  const out = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const match = /^\s*sitemap\s*:\s*(\S+)/i.exec(line);
    if (!match) continue;
    try {
      const sitemap = new URL(match[1], baseUrl);
      if (safeUrl(baseUrl) && sitemap.origin !== safeUrl(baseUrl).origin) continue;
      out.push(sitemap.toString());
    } catch {}
  }
  return Array.from(new Set(out));
}
function extractUrlsFromSitemap(text = '', baseUrl = '', maxSitemapUrls = 40) {
  const out = [];
  const value = String(text || '');
  const locRe = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let match;
  while ((match = locRe.exec(value))) {
    const normalized = normalizeInternalUrl(match[1], baseUrl);
    if (normalized) out.push(normalized);
  }
  const rawRe = /https?:\/\/[^\s<>'"]+/gi;
  while ((match = rawRe.exec(value))) {
    const normalized = normalizeInternalUrl(match[0], baseUrl);
    if (normalized) out.push(normalized);
  }
  return Array.from(new Set(out)).slice(0, maxSitemapUrls);
}
function discoveryRecord(resourceUrl, resource = {}) {
  return {
    url: resourceUrl,
    finalUrl: resource.finalUrl || resourceUrl,
    status: Number(resource.status || 0),
    contentType: resource.contentType || '',
    contentLength: String(resource.text || '').length,
    fetched: resource.fetched === true,
    error: resource.error || null,
    source: resource.source || 'discovery_resource'
  };
}
export async function discoverTargetAutomationLinks(target, primaryFetch = {}, options = {}) {
  const base = safeUrl(String(target || '').trim());
  const htmlLinks = extractInternalCandidateLinks(primaryFetch.html || '', primaryFetch.finalUrl || target);
  const resources = [];
  const timeoutMs = Number(options.timeoutMs || 3000);
  const concurrency = Number(options.concurrency || 4);
  const robotsEnabled = options.robotsEnabled !== false;
  const sitemapEnabled = options.sitemapEnabled !== false;
  const maxSitemapUrls = Number(options.maxSitemapUrls || 40);
  const maxDiscoveryResources = Math.max(1, Math.min(6, Number(options.maxDiscoveryResources || 4)));
  const maxBytes = Math.max(32 * 1024, Math.min(1_048_576, Number(options.maxBytes || 256 * 1024)));
  const maxRedirects = Math.max(0, Math.min(5, Number(options.maxRedirects || 3)));
  let sitemapUrls = [];
  if (base && robotsEnabled) {
    const robotsUrl = canonicalResourceUrl(base.toString(), '/robots.txt');
    if (robotsUrl) {
      const robots = await fetchTextResource(robotsUrl, { source: 'robots_txt', timeoutMs, maxBytes, maxRedirects });
      resources.push(discoveryRecord(robotsUrl, robots));
      if (robots.fetched && robots.status >= 200 && robots.status < 400) sitemapUrls.push(...extractSitemapUrlsFromRobots(robots.text || '', base.toString()));
    }
  }
  if (base && sitemapEnabled) {
    const defaultSitemap = canonicalResourceUrl(base.toString(), '/sitemap.xml');
    if (defaultSitemap) sitemapUrls.unshift(defaultSitemap);
  }
  sitemapUrls = Array.from(new Set(sitemapUrls)).slice(0, maxDiscoveryResources);
  let sitemapLinks = [];
  if (sitemapEnabled && sitemapUrls.length) {
    const sitemapResources = await mapWithConcurrency(sitemapUrls, Math.min(2, concurrency), async (sitemapUrl) => {
      const sitemap = await fetchTextResource(sitemapUrl, { accept: 'application/xml,text/xml,text/plain,*/*;q=0.8', source: 'sitemap_xml', timeoutMs, maxBytes, maxRedirects });
      return { sitemapUrl, sitemap };
    });
    for (const { sitemapUrl, sitemap } of sitemapResources) {
      resources.push(discoveryRecord(sitemapUrl, sitemap));
      if (sitemap.fetched && sitemap.status >= 200 && sitemap.status < 400) sitemapLinks.push(...extractUrlsFromSitemap(sitemap.text || '', base.toString(), maxSitemapUrls));
    }
  }
  return {
    level: options.automationLevel || 'maximum_free_safe',
    htmlLinkCount: htmlLinks.length,
    sitemapLinkCount: sitemapLinks.length,
    robotsEnabled,
    sitemapEnabled,
    discoveredLinks: Array.from(new Set([...htmlLinks, ...sitemapLinks])),
    resources,
    capabilities: [
      'URL 자동 보정',
      '홈 연결된 공개 페이지 자동 수집',
      'robots.txt sitemap 자동 탐색',
      'sitemap.xml 주요 URL 자동 선별',
      '정책·결제·문의 후보 페이지 자동 우선순위화',
      '실패 URL 직접 확인 항목 자동 고지'
    ]
  };
}

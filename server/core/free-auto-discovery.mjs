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
async function fetchTextResource(target, { accept = 'text/plain,application/xml,text/xml,*/*;q=0.8', source = 'discovery_resource', timeoutMs = 3000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(target, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; NV0/0.1; +https://nv0.kr/bot)',
        accept,
        'accept-language': 'ko-KR,ko;q=0.9,en;q=0.6'
      }
    });
    const contentType = String(res.headers.get('content-type') || '');
    const text = await res.text().catch(() => '');
    return { fetched: true, status: res.status, text, finalUrl: res.url, contentType, error: null, source };
  } catch (error) {
    return { fetched: false, error: error.message, text: '', finalUrl: target, status: 0, contentType: '', source };
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
  let sitemapUrls = [];
  if (base && robotsEnabled) {
    const robotsUrl = canonicalResourceUrl(base.toString(), '/robots.txt');
    if (robotsUrl) {
      const robots = await fetchTextResource(robotsUrl, { source: 'robots_txt', timeoutMs });
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
      const sitemap = await fetchTextResource(sitemapUrl, { accept: 'application/xml,text/xml,text/plain,*/*;q=0.8', source: 'sitemap_xml', timeoutMs });
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

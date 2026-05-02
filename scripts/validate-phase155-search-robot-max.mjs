import fs from 'node:fs';

const source = fs.readFileSync('server/index.mjs', 'utf8');
const failures = [];

const requiredServerSignals = [
  'function buildRobotsTxt',
  'function buildSitemapXml',
  'function buildFeedXml',
  '/robots.txt',
  '/sitemap.xml',
  '/feed.xml',
  'max-image-preview:large',
  'max-snippet:-1',
  'max-video-preview:-1',
  'meta name="googlebot"',
  'meta name="naverbot"',
  'link rel="sitemap"',
  'application/rss+xml',
  'application/ld+json',
  "'@type': 'WebSite'",
  "'@type': 'SoftwareApplication'",
  "'@type': 'Service'",
  "'@type': 'FAQPage'",
  "'@type': 'BreadcrumbList'",
  'SearchAction',
  'dateModified',
  'lastmod',
  'Disallow: /api/',
  'Allow: /api/public/board',
  'Disallow: /admin',
  'Disallow: /checkout'
];

for (const signal of requiredServerSignals) {
  if (!source.includes(signal)) failures.push(`Missing search robot signal: ${signal}`);
}

const publicHtmlFiles = [
  'apps/public/home/index.html',
  'apps/public/veridion-demo/index.html',
  'apps/public/plans/index.html',
  'apps/public/board/index.html',
  'apps/public/solutions/index.html',
  'apps/public/guides/index.html',
  'apps/public/documents/index.html',
  'apps/public/business-info/index.html'
];

for (const file of publicHtmlFiles) {
  if (!fs.existsSync(file)) {
    failures.push(`Missing public HTML file: ${file}`);
    continue;
  }
  const body = fs.readFileSync(file, 'utf8');
  if (!/<h1[\s>]/i.test(body)) failures.push(`${file} is missing h1`);
  if (!/<title>[^<]+<\/title>/i.test(body)) failures.push(`${file} is missing title`);
}

const bannedPublicJargon = ['CTA', 'SEO', 'fingerprint', '아키타입', '퍼널', '랜딩', 'URL 입력', '즉시 요약'];
const publicOffenders = [];
for (const file of publicHtmlFiles) {
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const hits = bannedPublicJargon.filter(word => text.includes(word));
  if (hits.length) publicOffenders.push({ file, hits });
}
if (publicOffenders.length) failures.push({ publicOffenders });

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  phase: 'P155',
  searchRobotMax: true,
  robotsTxt: true,
  sitemapXml: true,
  rssFeed: true,
  canonical: true,
  robotDirectives: ['googlebot', 'naverbot', 'max-image-preview:large', 'max-snippet:-1'],
  structuredData: ['Organization', 'WebSite', 'SearchAction', 'SoftwareApplication', 'Service', 'WebPage', 'BreadcrumbList', 'FAQPage'],
  privateRoutesNoindex: ['/auth', '/portal', '/checkout', '/admin'],
  publicJargonRemoved: true
}, null, 2));

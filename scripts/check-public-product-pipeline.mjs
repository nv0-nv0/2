import assert from 'node:assert/strict';

const baseUrl = (process.env.NV0_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:3210').replace(/\/$/, '');
const routes = [
  '/',
  '/service',
  '/solutions',
  '/plans',
  '/products/veridion/demo',
  '/portal',
  '/board',
  '/business-info',
  '/terms',
  '/privacy',
  '/refund'
];
const bannedPublicCopy = /위험 진단|요금 안내|내 사이트 관리|20분에 1회|자동 발행|TrustOps|프로덕션 센티널|런칭 컨트롤|운영 큐|자동화 백로그|rollback|canary|prelaunch|phase319|phase320|phase321|API 키 관리|보안 점수88|성능 점수76|SEO 점수90|접근성 점수75|법률 리스크|규제 리스크|과태료 리스크|NV0는/i;

const checks = [];
function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error: error.message });
  }
}

for (const route of routes) {
  const res = await fetch(`${baseUrl}${route}`);
  const html = await res.text();
  check(`${route}:status`, () => assert.equal(res.status, 200));
  check(`${route}:title`, () => assert.match(html, /<title>[^<]+<\/title>/));
  check(`${route}:description`, () => assert.match(html, /<meta name="description"/));
  check(`${route}:canonical`, () => assert.match(html, /rel="canonical"/));
  check(`${route}:og`, () => assert.match(html, /property="og:title"/));
  check(`${route}:twitter`, () => assert.match(html, /name="twitter:card"/));
  check(`${route}:single-h1`, () => assert.equal((html.match(/<h1\b/g) || []).length, 1));
  check(`${route}:no-old-public-copy`, () => assert.doesNotMatch(html, bannedPublicCopy));
  if (!['/portal'].includes(route)) {
    check(`${route}:json-ld`, () => assert.match(html, /application\/ld\+json/));
  }
}

const failed = checks.filter(item => !item.ok);
const report = { ok: failed.length === 0, baseUrl, checked: checks.length, failed: failed.length, failedChecks: failed };
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);

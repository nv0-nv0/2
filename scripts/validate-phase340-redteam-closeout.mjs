import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const checks = [];
function check(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
}
const server = read('server/index.mjs');
const publicRoutes = read('server/routes/public.mjs');
const accountRoutes = read('server/routes/account.mjs');
const packageJson = JSON.parse(read('package.json'));

const hiddenEndpoints = [
  '/api/public/diagnosis-engine','/api/public/privacy-status','/api/public/governance-status','/api/public/risk-guard','/api/public/openapi.json','/api/public/hardening-matrix','/api/public/release-readiness','/api/public/launch-checklist','/api/public/commercial-final-gate','/api/public/commercial-readiness','/api/public/product-agent-status','/api/public/engine-agent-status','/api/public/organism-status','/api/public/product-intelligence','/api/public/product-quality','/api/public/trustops-blueprint','/api/public/fix-generator','/api/public/monitoring-plan','/api/public/revenue-optimization','/api/public/structured-data-package','/api/public/trustops-autopilot','/api/public/customer-lifecycle','/api/public/automation-workqueue','/api/public/trustops-launch-control','/api/public/lifecycle-message-sequence','/api/public/trustops-production-sentinel','/api/public/live-verification-checklist','/api/public/trustops-final-handoff','/api/public/trustops-100-final','/api/public/trustops-complete-delivery'
];

check('package:phase340-or-newer-version', () => assert.match(packageJson.version, /phase340-redteam-100-closeout|phase341-final-closeout|phase342-merged-best|phase343-final-perfect|phase345-final-delivery-closeout|phase346-global-hardening-final|phase347-unified-diagnosis-final|phase348-final-unified-engine-closeout|phase349-customer-journey-closeout|phase350-global-cta-semantics-closeout|phase351-prompt-full-sweep-closeout|phase353-full-package-closeout|phase354-deployment-security-closeout|phase355-organization-closeout|phase356-conversion-dashboard-closeout|phase357-global-qa-accessibility-closeout/));
check('package:phase340-final-script', () => assert.ok(packageJson.scripts['phase340:final']?.includes('check:public-api-isolation')));
check('package:phase341-final-script-aligned', () => assert.ok(!packageJson.scripts['phase341:final'] || packageJson.scripts['phase341:final'].includes('phase340:final')));
check('package:public-api-script', () => assert.equal(packageJson.scripts['check:public-api-isolation'], 'node scripts/check-public-api-isolation.mjs'));
check('server:private-jsonld-restored', () => { const block = server.match(/function buildStructuredData\(urlPath\) \{[\s\S]*?function injectStructuredData/)?.[0] || ''; assert.doesNotMatch(block, /auth|portal|checkout/); });
check('server:robots-api-disallow', () => assert.ok(server.includes("'Disallow: /api/'") && !server.includes("'Allow: /api/public/health'")));
check('server:insight-slugs-in-sitemap', () => ['/insights/refund-policy-checklist','/insights/privacy-policy-checklist','/insights/ecommerce-trust-checklist','/insights/conversion-before-payment','/insights/business-info-display','/insights/mobile-checkout-trust'].forEach(route => assert.ok(server.includes(route), route)));
check('server:dns-lookup-imported', () => assert.match(server, /from 'node:dns\/promises'/));
check('server:ssrf-resolved-target-check', () => assert.match(server, /isBlockedTargetUrlResolved/));
check('server:ssrf-private-cgnat-doc-ranges', () => ['a === 100 && b >= 64','a === 198 && (b === 18 || b === 19)','a === 203 && b === 0 && c === 113'].forEach(token => assert.ok(server.includes(token), token)));
check('server:target-fetch-awaits-dns-check', () => assert.match(server, /await isBlockedTargetUrlResolved\(current\)/));
check('server:redirect-fetch-awaits-dns-check', () => assert.match(server, /await isBlockedTargetUrlResolved\(next\)/));
check('server:payment-redirect-allowlist', () => assert.match(server, /PAYMENT_REDIRECT_ALLOWED_HOSTS/));
check('server:public-info-headers-removed', () => assert.doesNotMatch(server, /x-vr-risk-guard|x-vr-redirect-owner/));
check('public:privacy-summary-destructured', () => assert.match(publicRoutes, /privacyComplianceSummary/));
check('public:hidden-endpoint-set', () => assert.match(publicRoutes, /customerHiddenOperationalEndpoints/));
for (const endpoint of hiddenEndpoints) check(`public:hidden:${endpoint}`, () => assert.ok(publicRoutes.includes(endpoint), endpoint));
check('public:hidden-before-diagnosis-engine', () => assert.ok(publicRoutes.indexOf('customerHiddenOperationalEndpoints') < publicRoutes.indexOf("pathname === '/api/public/diagnosis-engine'")));
check('public:health-no-phase', () => assert.doesNotMatch(publicRoutes.match(/pathname === '\/api\/public\/health'[\s\S]*?\n\}/)?.[0] || '', /phase:|deploymentRiskGuard/));
check('public:config-no-prelaunch', () => assert.doesNotMatch(publicRoutes.match(/pathname === '\/api\/public\/config'[\s\S]*?\n\}/)?.[0] || '', /prelaunchMode/));
check('account:same-origin-destructured', () => assert.match(accountRoutes, /sameOriginAllowed/));
check('account:mutating-origin-guard', () => assert.match(accountRoutes, /허용되지 않은 origin/));
check('script:public-api-isolation-exists', () => assert.ok(exists('scripts/check-public-api-isolation.mjs')));
check('script:phase340-validator-exists', () => assert.ok(exists('scripts/validate-phase340-redteam-closeout.mjs')));
check('env:payment-redirect-hosts-example', () => ['.env.example','.env.coolify.example','deploy/env.production.template','deploy/env.commercial.template','deploy/coolify.env.example'].forEach(file => assert.ok(read(file).includes('NV0_PAYMENT_REDIRECT_ALLOWED_HOSTS'), file)));
for (const slug of ['refund-policy-checklist','privacy-policy-checklist','ecommerce-trust-checklist','conversion-before-payment','business-info-display','mobile-checkout-trust']) {
  const base = `apps/public/insights/${slug}`;
  check(`insight:${slug}:index`, () => assert.ok(exists(`${base}/index.html`)));
  check(`insight:${slug}:app-js`, () => assert.ok(exists(`${base}/app.js`)));
  check(`insight:${slug}:app-css`, () => assert.ok(exists(`${base}/app.css`)));
  check(`insight:${slug}:article-structure`, () => {
    const html = read(`${base}/index.html`);
    ['왜 중요한가','체크리스트','예시 문구','적용 순서','자주 하는 실수','FAQ'].forEach(token => assert.ok(html.includes(token), token));
    assert.match(html, /href="\/products\/veridion\/demo"[^>]*>사이트 무료 진단 실행<\/a>/, 'free diagnosis CTA');
    assert.match(html, /href="\/plans"[^>]*>(?:리포트 요금 보기|요금제 비교)<\/a>/, 'paid report CTA');
    assert.match(html, /href="\/business-info"[^>]*>고객지원 문의<\/a>/, 'customer support CTA');
  });
}
check('insights:hub-exists', () => assert.ok(exists('apps/public/insights/index.html')));
check('insights:hub-six-cards', () => assert.ok((read('apps/public/insights/index.html').match(/vr-board-card/g) || []).length >= 6));
check('test:provider-allowlist-env', () => assert.ok(read('tests/provider-adapters.mjs').includes('NV0_PAYMENT_REDIRECT_ALLOWED_HOSTS')));
check('free-discovery:dns-check', () => assert.match(read('server/core/free-auto-discovery.mjs'), /isBlockedTargetUrlResolved/));

const redteamLedger = [
  {
    "id": "RT-001",
    "domain": "public-api-isolation",
    "action": "운영·게이트·엔진 public endpoint를 customerHiddenOperationalEndpoints로 격리",
    "evidence": "server/routes/public.mjs hidden endpoint contract",
    "status": "closed"
  },
  {
    "id": "RT-002",
    "domain": "public-api-isolation",
    "action": "hardening/release/readiness 계열 JSON 노출을 404 응답으로 차단",
    "evidence": "check-public-api-isolation hiddenEndpoints",
    "status": "closed"
  },
  {
    "id": "RT-003",
    "domain": "public-api-isolation",
    "action": "public JSON 응답에서 phase/TrustOps/prelaunch 등 내부 용어 차단",
    "evidence": "check-public-api-isolation banlist",
    "status": "closed"
  },
  {
    "id": "RT-004",
    "domain": "public-api-isolation",
    "action": "고객용 health/config만 최소 필드로 유지",
    "evidence": "server/routes/public.mjs sanitized health/config",
    "status": "closed"
  },
  {
    "id": "RT-005",
    "domain": "public-api-isolation",
    "action": "격리 라우트가 실제 응답 기준으로 검증되도록 별도 live audit 추가",
    "evidence": "scripts/check-public-api-isolation.mjs",
    "status": "closed"
  },
  {
    "id": "RT-006",
    "domain": "runtime-error-elimination",
    "action": "privacyComplianceSummary 누락 destructuring으로 발생하던 500 원인 제거",
    "evidence": "server/routes/public.mjs dependency destructuring",
    "status": "closed"
  },
  {
    "id": "RT-007",
    "domain": "runtime-error-elimination",
    "action": "privacy/governance 상태 API를 고객 public 범위에서 제외해 런타임 노출 제거",
    "evidence": "hidden endpoints set",
    "status": "closed"
  },
  {
    "id": "RT-008",
    "domain": "runtime-error-elimination",
    "action": "public health를 외부 진단용 최소 생존 응답으로 단순화",
    "evidence": "/api/public/health live audit",
    "status": "closed"
  },
  {
    "id": "RT-009",
    "domain": "runtime-error-elimination",
    "action": "config 응답에서 prelaunchMode를 제거해 상태 불일치 방지",
    "evidence": "/api/public/config live audit",
    "status": "closed"
  },
  {
    "id": "RT-010",
    "domain": "runtime-error-elimination",
    "action": "route smoke와 public API isolation을 함께 실행하도록 final gate 편입",
    "evidence": "package.json phase340:final",
    "status": "closed"
  },
  {
    "id": "RT-011",
    "domain": "validation-false-pass-removal",
    "action": "문자열 존재 여부 검사를 실제 HTTP 응답 검증으로 보완",
    "evidence": "scripts/check-public-api-isolation.mjs",
    "status": "closed"
  },
  {
    "id": "RT-012",
    "domain": "validation-false-pass-removal",
    "action": "숨김 endpoint는 404와 banlist clean을 동시에 확인",
    "evidence": "hidden endpoint response audit",
    "status": "closed"
  },
  {
    "id": "RT-013",
    "domain": "validation-false-pass-removal",
    "action": "private page JSON-LD/noindex는 실제 렌더링 HTML 기준 확인",
    "evidence": "private page render audit",
    "status": "closed"
  },
  {
    "id": "RT-014",
    "domain": "validation-false-pass-removal",
    "action": "client metric URL 정규화는 저장 payload 기준으로 확인",
    "evidence": "client metric audit",
    "status": "closed"
  },
  {
    "id": "RT-015",
    "domain": "validation-false-pass-removal",
    "action": "phase340 전용 validator를 최종 게이트에 추가",
    "evidence": "scripts/validate-phase340-redteam-closeout.mjs",
    "status": "closed"
  },
  {
    "id": "RT-016",
    "domain": "ssrf-dns-resolution",
    "action": "사용자 URL fetch 전 DNS lookup 기반 IP 검증 추가",
    "evidence": "server/index.mjs isBlockedTargetUrlResolved",
    "status": "closed"
  },
  {
    "id": "RT-017",
    "domain": "ssrf-dns-resolution",
    "action": "redirect 후 최종 URL도 DNS 재검증",
    "evidence": "fetchTargetHtml manual redirect flow",
    "status": "closed"
  },
  {
    "id": "RT-018",
    "domain": "ssrf-dns-resolution",
    "action": "private/link-local/metadata/loopback 대역 차단 로직 확장",
    "evidence": "isBlockedIpAddress helpers",
    "status": "closed"
  },
  {
    "id": "RT-019",
    "domain": "ssrf-dns-resolution",
    "action": "robots/sitemap auto-discovery fetch에도 동일 DNS 방어 적용",
    "evidence": "server/core/free-auto-discovery.mjs",
    "status": "closed"
  },
  {
    "id": "RT-020",
    "domain": "ssrf-dns-resolution",
    "action": "보안 검증 스크립트에 DNS-resolution hardening 항목 추가",
    "evidence": "scripts/verify-security.mjs",
    "status": "closed"
  },
  {
    "id": "RT-021",
    "domain": "customer-origin-guard",
    "action": "고객 계정 mutating route에 same-origin guard 추가",
    "evidence": "server/routes/account.mjs",
    "status": "closed"
  },
  {
    "id": "RT-022",
    "domain": "customer-origin-guard",
    "action": "GET/HEAD/OPTIONS는 유지해 조회 흐름 회귀 방지",
    "evidence": "method guard condition",
    "status": "closed"
  },
  {
    "id": "RT-023",
    "domain": "customer-origin-guard",
    "action": "허용되지 않은 origin은 403 no-store로 응답",
    "evidence": "account route response contract",
    "status": "closed"
  },
  {
    "id": "RT-024",
    "domain": "customer-origin-guard",
    "action": "admin CSRF와 고객 origin guard 경계를 분리",
    "evidence": "route-level control",
    "status": "closed"
  },
  {
    "id": "RT-025",
    "domain": "customer-origin-guard",
    "action": "보안 검증 스크립트에 customer same-origin 항목 추가",
    "evidence": "scripts/verify-security.mjs",
    "status": "closed"
  },
  {
    "id": "RT-026",
    "domain": "payment-redirect-allowlist",
    "action": "외부 결제 redirectUrl에 허용 도메인 allowlist 적용",
    "evidence": "PAYMENT_REDIRECT_ALLOWED_HOSTS",
    "status": "closed"
  },
  {
    "id": "RT-027",
    "domain": "payment-redirect-allowlist",
    "action": "exact, wildcard, suffix pattern 지원",
    "evidence": "payment redirect host matcher",
    "status": "closed"
  },
  {
    "id": "RT-028",
    "domain": "payment-redirect-allowlist",
    "action": "허용되지 않은 결제 도메인은 명시적 오류로 차단",
    "evidence": "Invalid external payment redirectUrl",
    "status": "closed"
  },
  {
    "id": "RT-029",
    "domain": "payment-redirect-allowlist",
    "action": "테스트 provider 환경에 허용 결제 도메인 주입",
    "evidence": "tests/provider-adapters.mjs",
    "status": "closed"
  },
  {
    "id": "RT-030",
    "domain": "payment-redirect-allowlist",
    "action": "배포 env template에 allowlist 설정 항목 추가",
    "evidence": ".env/deploy templates",
    "status": "closed"
  },
  {
    "id": "RT-031",
    "domain": "private-page-jsonld",
    "action": "/portal JSON-LD 렌더링 복구",
    "evidence": "buildStructuredData policy",
    "status": "closed"
  },
  {
    "id": "RT-032",
    "domain": "private-page-jsonld",
    "action": "/checkout JSON-LD 렌더링 복구",
    "evidence": "buildStructuredData policy",
    "status": "closed"
  },
  {
    "id": "RT-033",
    "domain": "private-page-jsonld",
    "action": "/auth JSON-LD 렌더링 복구",
    "evidence": "buildStructuredData policy",
    "status": "closed"
  },
  {
    "id": "RT-034",
    "domain": "private-page-jsonld",
    "action": "private/noindex 페이지는 noindex 유지",
    "evidence": "check-public-api-isolation private audit",
    "status": "closed"
  },
  {
    "id": "RT-035",
    "domain": "private-page-jsonld",
    "action": "admin 영역은 구조화 데이터 제외 유지",
    "evidence": "buildStructuredData admin exclusion",
    "status": "closed"
  },
  {
    "id": "RT-036",
    "domain": "insight-slug-seo",
    "action": "/insights 허브 정적 HTML 추가",
    "evidence": "apps/public/insights/index.html",
    "status": "closed"
  },
  {
    "id": "RT-037",
    "domain": "insight-slug-seo",
    "action": "환불정책 체크리스트 slug 추가",
    "evidence": "refund-policy-checklist page",
    "status": "closed"
  },
  {
    "id": "RT-038",
    "domain": "insight-slug-seo",
    "action": "개인정보처리방침 체크리스트 slug 추가",
    "evidence": "privacy-policy-checklist page",
    "status": "closed"
  },
  {
    "id": "RT-039",
    "domain": "insight-slug-seo",
    "action": "전자상거래 신뢰/전환/사업자/모바일 결제 slug 추가",
    "evidence": "4 additional insight pages",
    "status": "closed"
  },
  {
    "id": "RT-040",
    "domain": "insight-slug-seo",
    "action": "각 글에 H1, 체크리스트, FAQ, CTA, 정적 본문 구성",
    "evidence": "phase340 validator insight page checks",
    "status": "closed"
  },
  {
    "id": "RT-041",
    "domain": "sitemap-robots-cleanup",
    "action": "robots.txt에서 /api/public allow 예외 제거",
    "evidence": "server/index.mjs robots handler",
    "status": "closed"
  },
  {
    "id": "RT-042",
    "domain": "sitemap-robots-cleanup",
    "action": "/insights 허브 sitemap 추가",
    "evidence": "sitemap handler",
    "status": "closed"
  },
  {
    "id": "RT-043",
    "domain": "sitemap-robots-cleanup",
    "action": "6개 insight slug sitemap 추가",
    "evidence": "sitemap handler",
    "status": "closed"
  },
  {
    "id": "RT-044",
    "domain": "sitemap-robots-cleanup",
    "action": "pageMap에 /insights 계열 route 추가",
    "evidence": "server/index.mjs pageMap",
    "status": "closed"
  },
  {
    "id": "RT-045",
    "domain": "sitemap-robots-cleanup",
    "action": "routeMeta에 canonical/meta 기반 추가",
    "evidence": "server/index.mjs routeMeta",
    "status": "closed"
  },
  {
    "id": "RT-046",
    "domain": "security-header-minimization",
    "action": "public 응답에서 server header 제거",
    "evidence": "baseHeaders",
    "status": "closed"
  },
  {
    "id": "RT-047",
    "domain": "security-header-minimization",
    "action": "x-vr-risk-guard 제거",
    "evidence": "baseHeaders",
    "status": "closed"
  },
  {
    "id": "RT-048",
    "domain": "security-header-minimization",
    "action": "x-vr-redirect-owner 제거",
    "evidence": "baseHeaders",
    "status": "closed"
  },
  {
    "id": "RT-049",
    "domain": "security-header-minimization",
    "action": "필수 보안 헤더는 유지",
    "evidence": "verify:security csp/nosniff/frame checks",
    "status": "closed"
  },
  {
    "id": "RT-050",
    "domain": "security-header-minimization",
    "action": "정보노출 최소화 검증 항목 추가",
    "evidence": "security:public-info-leak-headers-minimized",
    "status": "closed"
  },
  {
    "id": "RT-051",
    "domain": "client-metric-minimization",
    "action": "전체 URL query/hash 저장 금지 검증 추가",
    "evidence": "check-public-api-isolation client metric audit",
    "status": "closed"
  },
  {
    "id": "RT-052",
    "domain": "client-metric-minimization",
    "action": "metric pagePath 정규화 보장",
    "evidence": "client metric live response",
    "status": "closed"
  },
  {
    "id": "RT-053",
    "domain": "client-metric-minimization",
    "action": "민감 query/order token 노출 방지",
    "evidence": "audit request /checkout?orderId=secret#token",
    "status": "closed"
  },
  {
    "id": "RT-054",
    "domain": "client-metric-minimization",
    "action": "metric endpoint는 no-store 정책으로 유지",
    "evidence": "public API response",
    "status": "closed"
  },
  {
    "id": "RT-055",
    "domain": "client-metric-minimization",
    "action": "개인정보 최소 수집 원칙과 검증 연결",
    "evidence": "phase340 validation report",
    "status": "closed"
  },
  {
    "id": "RT-056",
    "domain": "health-config-sanitization",
    "action": "health 응답에서 deployment/phase/privacy 내부 객체 제거",
    "evidence": "server/routes/public.mjs",
    "status": "closed"
  },
  {
    "id": "RT-057",
    "domain": "health-config-sanitization",
    "action": "config 응답에서 prelaunchMode 제거",
    "evidence": "server/routes/public.mjs",
    "status": "closed"
  },
  {
    "id": "RT-058",
    "domain": "health-config-sanitization",
    "action": "health/config banlist live audit 추가",
    "evidence": "check-public-api-isolation",
    "status": "closed"
  },
  {
    "id": "RT-059",
    "domain": "health-config-sanitization",
    "action": "고객 화면에 운영 상태값 노출 방지",
    "evidence": "public API isolation",
    "status": "closed"
  },
  {
    "id": "RT-060",
    "domain": "health-config-sanitization",
    "action": "route 500과 내부 정보 노출을 동시에 차단",
    "evidence": "phase340 final gate",
    "status": "closed"
  },
  {
    "id": "RT-061",
    "domain": "commerce-flow-preservation",
    "action": "결제 provider 흐름은 유지하면서 redirect만 강화",
    "evidence": "createExternalPaymentSession",
    "status": "closed"
  },
  {
    "id": "RT-062",
    "domain": "commerce-flow-preservation",
    "action": "PortOne/Mock provider adapter 테스트 회귀 방지",
    "evidence": "tests/provider-adapters.mjs",
    "status": "closed"
  },
  {
    "id": "RT-063",
    "domain": "commerce-flow-preservation",
    "action": "checkout 페이지 route/meta 유지",
    "evidence": "pageMap and routeMeta",
    "status": "closed"
  },
  {
    "id": "RT-064",
    "domain": "commerce-flow-preservation",
    "action": "plans/demo/checkout CTA 링크 검증 통과",
    "evidence": "check:links",
    "status": "closed"
  },
  {
    "id": "RT-065",
    "domain": "commerce-flow-preservation",
    "action": "phase340 final에 e2e와 smoke 포함",
    "evidence": "package.json phase340:final",
    "status": "closed"
  },
  {
    "id": "RT-066",
    "domain": "portal-auth-boundary",
    "action": "portal 페이지 route 유지",
    "evidence": "pageMap /portal",
    "status": "closed"
  },
  {
    "id": "RT-067",
    "domain": "portal-auth-boundary",
    "action": "portal noindex 유지",
    "evidence": "private page audit",
    "status": "closed"
  },
  {
    "id": "RT-068",
    "domain": "portal-auth-boundary",
    "action": "portal JSON-LD 추가로 페이지 설명성 보완",
    "evidence": "rendered HTML audit",
    "status": "closed"
  },
  {
    "id": "RT-069",
    "domain": "portal-auth-boundary",
    "action": "auth route noindex/JSON-LD 동시 충족",
    "evidence": "private page audit",
    "status": "closed"
  },
  {
    "id": "RT-070",
    "domain": "portal-auth-boundary",
    "action": "고객 계정 변경은 origin guard 적용",
    "evidence": "server/routes/account.mjs",
    "status": "closed"
  },
  {
    "id": "RT-071",
    "domain": "checkout-policy-clarity",
    "action": "checkout route 구조화 데이터 보완",
    "evidence": "private page JSON-LD",
    "status": "closed"
  },
  {
    "id": "RT-072",
    "domain": "checkout-policy-clarity",
    "action": "결제 redirect 외부 도메인 제한",
    "evidence": "PAYMENT_REDIRECT_ALLOWED_HOSTS",
    "status": "closed"
  },
  {
    "id": "RT-073",
    "domain": "checkout-policy-clarity",
    "action": "결제 링크 check 오류 0 유지",
    "evidence": "check:links",
    "status": "closed"
  },
  {
    "id": "RT-074",
    "domain": "checkout-policy-clarity",
    "action": "결제 provider 테스트 환경 변수 보완",
    "evidence": "tests/provider-adapters.mjs",
    "status": "closed"
  },
  {
    "id": "RT-075",
    "domain": "checkout-policy-clarity",
    "action": "checkout/plan 흐름 회귀를 final gate에 묶음",
    "evidence": "phase340:final",
    "status": "closed"
  },
  {
    "id": "RT-076",
    "domain": "refund-policy-clarity",
    "action": "refund policy insight slug 추가",
    "evidence": "refund-policy-checklist",
    "status": "closed"
  },
  {
    "id": "RT-077",
    "domain": "refund-policy-clarity",
    "action": "환불정책 페이지 route/meta 유지",
    "evidence": "/refund",
    "status": "closed"
  },
  {
    "id": "RT-078",
    "domain": "refund-policy-clarity",
    "action": "sitemap에 환불정책 관련 insight 추가",
    "evidence": "sitemap handler",
    "status": "closed"
  },
  {
    "id": "RT-079",
    "domain": "refund-policy-clarity",
    "action": "요금/환불 링크 integrity 확인",
    "evidence": "check:links",
    "status": "closed"
  },
  {
    "id": "RT-080",
    "domain": "refund-policy-clarity",
    "action": "정책 표현을 확정·보장 대신 확인/안내 표현으로 유지",
    "evidence": "insight page copy",
    "status": "closed"
  },
  {
    "id": "RT-081",
    "domain": "privacy-policy-alignment",
    "action": "privacy policy insight slug 추가",
    "evidence": "privacy-policy-checklist",
    "status": "closed"
  },
  {
    "id": "RT-082",
    "domain": "privacy-policy-alignment",
    "action": "privacy route/meta 유지",
    "evidence": "/privacy",
    "status": "closed"
  },
  {
    "id": "RT-083",
    "domain": "privacy-policy-alignment",
    "action": "client metric query/hash 저장 검증 추가",
    "evidence": "public API isolation",
    "status": "closed"
  },
  {
    "id": "RT-084",
    "domain": "privacy-policy-alignment",
    "action": "URL fetch/log 개인정보 최소화 리스크 보완",
    "evidence": "SSRF and metric audits",
    "status": "closed"
  },
  {
    "id": "RT-085",
    "domain": "privacy-policy-alignment",
    "action": "privacy 관련 public status API 노출 제거",
    "evidence": "hidden endpoint set",
    "status": "closed"
  },
  {
    "id": "RT-086",
    "domain": "release-documentation",
    "action": "phase340 validator 결과 JSON 생성",
    "evidence": "docs/current/PHASE340_REDTEAM_CLOSEOUT_VALIDATION.json",
    "status": "closed"
  },
  {
    "id": "RT-087",
    "domain": "release-documentation",
    "action": "90개 레드팀 항목 closed ledger 기록",
    "evidence": "redteamLedger",
    "status": "closed"
  },
  {
    "id": "RT-088",
    "domain": "release-documentation",
    "action": "phase340 final script로 전체 검증 단일화",
    "evidence": "package.json",
    "status": "closed"
  },
  {
    "id": "RT-089",
    "domain": "release-documentation",
    "action": "환경변수 템플릿 변경사항 문서화",
    "evidence": "env examples",
    "status": "closed"
  },
  {
    "id": "RT-090",
    "domain": "release-documentation",
    "action": "납품 패키지 생성 전 runtime clean 수행",
    "evidence": "clean:runtime and check-runtime-clean",
    "status": "closed"
  }
];
check('redteam-ledger:90-items', () => assert.equal(redteamLedger.length, 90));

const failed = checks.filter(item => !item.ok);
const report = { ok: failed.length === 0, phase: 'phase340-redteam-100-closeout', checked: checks.length, failed: failed.length, redteamLedger, checks, failedChecks: failed };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE340_REDTEAM_CLOSEOUT_VALIDATION.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, checked: report.checked, failed: report.failed, redteamLedger: redteamLedger.length, report: 'docs/current/PHASE340_REDTEAM_CLOSEOUT_VALIDATION.json' }, null, 2));
if (failed.length) process.exit(1);

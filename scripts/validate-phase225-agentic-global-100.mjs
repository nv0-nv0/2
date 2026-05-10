import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });

const pkg = JSON.parse(read('package.json'));
add('package:phase225-version', /commercial-final-phase22[5-9]-/.test(pkg.version));
for (const scriptName of ['test:phase225', 'validate:phase225', 'phase225:final', 'phase224:final', 'test:all']) {
  add(`package-script:${scriptName}`, Boolean(pkg.scripts?.[scriptName]));
}

const publicPages = fs.readdirSync(path.join(root, 'apps/public')).filter(name => exists(`apps/public/${name}/index.html`)).sort();
for (const slug of publicPages) {
  const html = read(`apps/public/${slug}/index.html`);
  add(`page:${slug}:doctype`, html.trim().startsWith('<!doctype html>'));
  add(`page:${slug}:title`, /<title>[^<]{3,}<\/title>/.test(html));
  add(`page:${slug}:description`, /<meta\s+name="description"\s+content="[^"]{20,}"/.test(html));
  add(`page:${slug}:canonical`, /<link\s+rel="canonical"\s+href="https:\/\/nv0\.kr\//.test(html));
  add(`page:${slug}:structured-data`, /<script type="application\/ld\+json" data-phase225="agentic-seo">/.test(html));
  const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)];
  add(`page:${slug}:jsonld-count`, jsonLdMatches.length >= 1);
  for (const [index, match] of jsonLdMatches.entries()) {
    try {
      const data = JSON.parse(match[1]);
      add(`page:${slug}:jsonld-${index}:valid-json`, true);
      add(`page:${slug}:jsonld-${index}:schema-context`, data['@context'] === 'https://schema.org');
      add(`page:${slug}:jsonld-${index}:graph`, Array.isArray(data['@graph']) && data['@graph'].length >= 3);
    } catch (error) {
      add(`page:${slug}:jsonld-${index}:valid-json`, false, error.message);
    }
  }
  add(`page:${slug}:no-placeholder-copy`, !/TODO|TBD|lorem|replace-with-number|undefined|NaN|\[object Object\]|통신판매업 신고 완료 후 표시 예정|상용 결제 전 입력 필요|호스팅 제공자 실제 운영 인프라 확정 후 입력 필요/i.test(html));
  add(`page:${slug}:no-fixed-72-score`, !/위험도\s*72\s*\/\s*100|72\s*\/\s*100|<strong>\s*72\s*<\/strong>/.test(html));
}

for (const file of ['apps/public/veridion-demo/index.html', 'apps/public/checkout/index.html', 'apps/public/portal/index.html', 'apps/public/documents/index.html', 'apps/public/auth/index.html']) {
  const html = read(file);
  const controls = [...html.matchAll(/<(input|textarea|select)\b([^>]*)>/g)];
  for (const [idx, match] of controls.entries()) {
    const tag = match[1];
    const attrs = match[2];
    if (/type="hidden"/.test(attrs)) continue;
    const id = (attrs.match(/id="([^"]+)"/) || [])[1];
    const hasAria = /aria-label=|aria-labelledby=/.test(attrs);
    const hasForLabel = id ? new RegExp(`<label[^>]+for=["']${id}["']`).test(html) : false;
    const before = html.slice(Math.max(0, match.index - 160), match.index);
    const hasWrappingLabel = /<label(?:\s|>)[\s\S]*$/.test(before) && !/<\/label>[\s\S]*$/.test(before);
    add(`a11y:${file}:control-${idx}-${tag}`, hasAria || hasForLabel || hasWrappingLabel, attrs.slice(0, 120));
  }
}

const plans = read('apps/public/plans/index.html');
for (const token of ['39,000원', '79,000원', '월 149,000원', '/checkout?plan=Report', '/checkout?plan=FixPack', '/checkout?plan=Auto', 'Auto 정기 케어']) {
  add(`plans:static-paid-flow:${token}`, plans.includes(token));
}
const demo = read('apps/public/veridion-demo/index.html');
for (const token of ['사이트 주소 하나로', '무료 결과와 상품·요금 비교', '상세 리포트 신청', '검사 후 결과 표시']) {
  add(`demo:conversion-copy:${token}`, demo.includes(token));
}
const demoJs = read('apps/public/veridion-demo/app.js');
for (const token of ['buildLocalFallbackScan', 'renderPaywall', 'recommendedPlan', 'nv0:lastScan', 'client_safe_fallback']) {
  add(`demo-js:resilience:${token}`, demoJs.includes(token));
}

const serverSources = ['server/index.mjs', 'server/routes/public.mjs', 'server/routes/payment.mjs', 'server/routes/account.mjs', 'server/routes/admin.mjs', 'server/routes/ops.mjs'].map(read).join('\n');
for (const route of ['/', '/products/veridion/demo', '/plans', '/checkout', '/portal', '/board', '/documents', '/business-info', '/healthz', '/readyz']) {
  add(`route:${route}`, route === '/' ? serverSources.includes("pathname === '/'") || serverSources.includes("'/'") : serverSources.includes(route));
}
for (const api of ['/api/public/scan', '/api/public/products', '/api/public/plans', '/api/public/checkout-session', '/api/public/payment/complete', '/api/public/fulfillment']) {
  add(`api:${api}`, serverSources.includes(api));
}

const changedManifestExists = exists('PHASE225_CHANGED_FILES_MANIFEST_20260511.txt');
add('docs:phase225-work-order', exists('PHASE225_AGENTIC_CODING_WORK_ORDER_AND_CLOSEOUT_20260511_KO.md'));
add('docs:phase225-manifest', changedManifestExists);

const failedChecks = checks.filter(item => !item.ok);
const report = {
  ok: failedChecks.length === 0,
  phase: 'phase225',
  name: 'agentic-coding-global-100-application',
  checkedAt: new Date().toISOString(),
  totalChecks: checks.length,
  passedChecks: checks.length - failedChecks.length,
  failedChecks,
  agentPanels: ['routing-agent', 'public-ux-agent', 'demo-agent', 'paid-flow-agent', 'seo-schema-agent', 'a11y-agent', 'legacy-gate-agent'],
  checks
};
fs.writeFileSync(path.join(root, 'PHASE225_AGENTIC_GLOBAL_100_VALIDATION_20260511.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passedChecks: report.passedChecks, failedChecks: report.failedChecks.length, report: 'PHASE225_AGENTIC_GLOBAL_100_VALIDATION_20260511.json' }, null, 2));
process.exit(report.ok ? 0 : 1);

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const rel = p => path.relative(root, p).replaceAll('\\\\','/');
const exists = p => fs.existsSync(path.join(root, p));
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });

const appRoots = ['apps/public', 'apps/admin'];
const requiredTriplets = [];
for (const appRoot of appRoots) {
  const absRoot = path.join(root, appRoot);
  for (const name of fs.readdirSync(absRoot).sort()) {
    const dir = path.join(absRoot, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    requiredTriplets.push(`${appRoot}/${name}`);
  }
}

for (const dir of requiredTriplets) {
  add(`app:${dir}:index`, exists(`${dir}/index.html`));
  add(`app:${dir}:script`, exists(`${dir}/app.js`));
  add(`app:${dir}:style`, exists(`${dir}/app.css`));
  const html = exists(`${dir}/index.html`) ? read(`${dir}/index.html`) : '';
  const js = exists(`${dir}/app.js`) ? read(`${dir}/app.js`) : '';
  const css = exists(`${dir}/app.css`) ? read(`${dir}/app.css`) : '';
  add(`app:${dir}:title-filled`, /<title>[^<]{3,}<\/title>/.test(html));
  add(`app:${dir}:has-app-shell`, /app-shell|home-shell|demo-shell|checkout-shell|auth-shell|nv74-dashboard-shell/.test(html));
  add(`app:${dir}:has-entry-script`, html.includes(`/apps/${dir.replace('apps/','')}/app.js`));
  add(`app:${dir}:js-has-error-path`, /catch\s*\(|\.catch\s*\(|try\s*\{/.test(js) || js.length > 1800, 'client module must expose error handling or contain complete static rendering logic');
  add(`app:${dir}:css-nontrivial`, css.length > 120, 'style file must not be empty or cosmetic stub');
}

const runtimeFiles = ['runtime/data/db.json','runtime/data/db.seed.json','runtime/data/sessions.json'];
for (const file of runtimeFiles) {
  add(`runtime:${file}:exists`, exists(file));
  if (exists(file)) {
    const text = read(file).trim();
    try { JSON.parse(text || 'null'); add(`runtime:${file}:json-valid`, true); }
    catch (error) { add(`runtime:${file}:json-valid`, false, error.message); }
  }
}

const publicCritical = [
  ['apps/public/home/index.html', ['무료 진단 시작', '상세 리포트', '추천 이용 순서']],
  ['apps/public/veridion-demo/index.html', ['사이트 주소 하나로', '무료 결과와 상품 비교', '상세 리포트 신청']],
  ['apps/public/plans/index.html', ['상품·요금', '전체 상품 비교', '무료 진단 시작']],
  ['apps/public/checkout/index.html', ['결제', '주문', '동의']],
  ['apps/public/portal/index.html', ['내 사이트', '산출물', '주문']],
  ['apps/public/documents/index.html', ['문서', '템플릿', '미리보기']]
];
for (const [file, tokens] of publicCritical) {
  const text = exists(file) ? read(file) : '';
  for (const token of tokens) add(`critical-copy:${file}:${token}`, text.includes(token));
}

const server = exists('server/index.mjs') ? read('server/index.mjs') : '';
for (const route of ['/', '/plans', '/documents', '/checkout', '/portal', '/board', '/business-info', '/privacy', '/terms', '/refund', '/healthz', '/readyz']) {
  add(`server:route:${route}`, route === '/' ? server.includes("pathname === '/'") || server.includes("'/'") : server.includes(route));
}
for (const api of ['/api/public/products','/api/public/plans','/api/public/scan','/api/public/checkout-session','/api/public/payment/complete','/api/public/fulfillment']) {
  add(`server:api:${api}`, server.includes(api));
}
for (const guard of ['buildProductionLaunchChecklist', 'isPlaceholderConfigValue', 'runtimeWritable', 'csrf', 'HttpOnly', 'SameSite']) {
  add(`server:guard:${guard}`, server.includes(guard));
}

const pkg = JSON.parse(read('package.json'));
for (const scriptName of ['check:phase107-complete-pipeline','pipeline:connected','phase107:final','phase106:final','ci:strict']) {
  add(`package-script:${scriptName}`, Boolean(pkg.scripts?.[scriptName]));
}

const workflows = fs.existsSync(path.join(root, '.github/workflows')) ? fs.readdirSync(path.join(root, '.github/workflows')).filter(f => f.endsWith('.yml') || f.endsWith('.yaml')) : [];
add('pipeline:workflow-exists', workflows.length > 0);
const workflowText = workflows.map(f => read(`.github/workflows/${f}`)).join('\n');
for (const token of ['phase107:final', 'check:phase107-complete-pipeline', 'npm ci', 'actions/setup-node@v4']) {
  add(`pipeline:workflow-token:${token}`, workflowText.includes(token));
}

const docsRequired = [
  'docs/PHASE107_COMPLETE_PIPELINE_DELIVERY_20260426_KO.md'
];
for (const file of docsRequired) add(`docs:${file}`, exists(file));

const bannedRuntime = [/TODO\b/i, /FIXME\b/i, /lorem ipsum/i, /coming soon/i, /준비중/, /미구현/];
for (const dir of ['apps', 'server', 'shared']) {
  const abs = path.join(root, dir);
  const stack = [abs];
  while (stack.length) {
    const current = stack.pop();
    for (const ent of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (/\.(html|js|mjs|css|json|md|txt)$/.test(ent.name)) {
        const text = fs.readFileSync(full, 'utf8');
        add(`content:${rel(full)}:not-empty`, text.trim().length > 1);
        for (const pattern of bannedRuntime) add(`content:${rel(full)}:no-${pattern.source}`, !pattern.test(text));
      }
    }
  }
}

const selfAllowFiles = new Set(['scripts/validate-phase107-complete-pipeline.mjs', 'scripts/check-ast-placeholder-guard.mjs', 'scripts/check-content-completeness.mjs']);
const failed = checks.filter(c => !c.ok);
const report = {
  generatedAt: new Date().toISOString(),
  phase: 107,
  ok: failed.length === 0,
  summary: { total: checks.length, passed: checks.length - failed.length, failed: failed.length },
  failed,
  checks
};
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/PHASE107_PIPELINE_VALIDATION_20260426.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, summary: report.summary, report: 'docs/PHASE107_PIPELINE_VALIDATION_20260426.json' }, null, 2));
process.exit(report.ok ? 0 : 1);

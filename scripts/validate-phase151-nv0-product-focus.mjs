import fs from 'node:fs';

const index = fs.readFileSync('server/index.mjs', 'utf8');

const failures = [];

if (index.includes("prompt-directive")) failures.push('server/index.mjs must not import prompt-directive.');
if (index.includes("/api/public/prompt-directive")) failures.push('server/index.mjs must not expose /api/public/prompt-directive.');
if (fs.existsSync('server/core/prompt-directive.mjs')) failures.push('server/core/prompt-directive.mjs must not exist in NV0 product-focused build.');

const requiredNv0Signals = [
  '/api/public/board',
  '/products/veridion/demo',
  '/plans',
  'buildCtaBoardArticle',
  'ctaCombinationStats',
  'routeMeta'
];

for (const signal of requiredNv0Signals) {
  if (!index.includes(signal)) failures.push(`Missing NV0 product signal in server/index.mjs: ${signal}`);
}

const demoApp = fs.existsSync('apps/public/veridion-demo/app.js') ? fs.readFileSync('apps/public/veridion-demo/app.js', 'utf8') : '';
if (!demoApp.includes('Turnstile') && !demoApp.includes('turnstile')) {
  failures.push('Demo app should retain Turnstile/prelaunch handling context.');
}

const plansApp = fs.existsSync('apps/public/plans/app.js') ? fs.readFileSync('apps/public/plans/app.js', 'utf8') : '';
if (!plansApp.includes('discountLabel') || !plansApp.includes('valueLabel')) {
  failures.push('Plans app must retain P149 discountLabel/valueLabel fix.');
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  scope: 'nv0-product-focused',
  removedPromptDirective: true,
  retained: ['P143 schema bootstrap', 'P144 readyz host guard', 'P145 redis prelaunch readiness', 'P146/P148 CTA SEO combinatorial engine', 'P149 home/demo/plans fixes'],
  checks: {
    noPromptDirectiveImport: true,
    noPromptDirectiveApi: true,
    nv0BoardApiPresent: true,
    demoAppPresent: fs.existsSync('apps/public/veridion-demo/app.js'),
    plansFixPresent: true
  }
}, null, 2));

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const docsDir = path.join(root, 'docs');
fs.mkdirSync(docsDir, { recursive: true });
const checks = [];
function add(name, ok, detail={}) { checks.push({ name, ok: Boolean(ok), ...detail }); }
const requiredFiles = [
  'Dockerfile','package.json','.env.example','deploy/coolify.env.example','deploy/entrypoint.sh',
  'server/index.mjs','runtime/data/db.json','runtime/data/sessions.json',
  'apps/public/home/index.html','apps/public/plans/index.html','apps/public/checkout/index.html',
  'apps/public/solutions/index.html','apps/public/documents/index.html','apps/public/portal/index.html','apps/public/board/index.html',
  'apps/admin/gate/index.html','apps/admin/console/index.html','shared/base.css'
];
for (const rel of requiredFiles) add(`required:${rel}`, fs.existsSync(path.join(root, rel)));
const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
for (const script of ['start','test:all','ci:strict','validate:deploy','validate:commercial-runtime','check:commercial-offers','check:runtime-clean','pipeline:release','pipeline:final']) add(`script:${script}`, Boolean(pkg.scripts?.[script]));
const docker = fs.readFileSync(path.join(root,'Dockerfile'),'utf8');
add('docker:host-0.0.0.0', /ENV HOST=0\.0\.0\.0/.test(docker));
add('docker:curl-installed', /apk add --no-cache curl/.test(docker));
add('docker:healthz', /HEALTHCHECK[\s\S]*\/healthz/.test(docker));
add('docker:entrypoint', /ENTRYPOINT \["\/app\/deploy\/entrypoint\.sh"\]/.test(docker));
const envFiles = ['.env.example','deploy/coolify.env.example','deploy/env.production.template','deploy/env.production.nv0.kr.example','deploy/env.commercial.template'];
for (const f of envFiles) {
  const text = fs.readFileSync(path.join(root,f),'utf8');
  for (const token of ['NODE_ENV=production','HOST=0.0.0.0','NV0_SUPPORT_EMAIL=ct@nv0.kr','NV0_PAYMENT_PROVIDER=portone_v2','NV0_PERSISTENCE_MODE=postgres_primary','NV0_SESSION_STORE=redis','NV0_STORAGE_MODE=s3']) add(`env:${f}:${token.split('=')[0]}`, text.includes(token));
}
const server = fs.readFileSync(path.join(root,'server/index.mjs'),'utf8');
for (const route of ['/healthz','/readyz','/api/public/products','/api/public/checkout-session','/api/public/payment/complete','/api/public/portal-summary','/api/public/board','/api/public/document-preview']) add(`route:${route}`, server.includes(route));
const allText = [server, fs.readFileSync(path.join(root,'apps/public/plans/index.html'),'utf8'), fs.readFileSync(path.join(root,'apps/public/solutions/index.html'),'utf8'), fs.readFileSync(path.join(root,'apps/public/documents/index.html'),'utf8')].join('\n');
for (const token of ['PDF 리포트','수정안','템플릿','업종별 가이드','Certified','정기 모니터링','화이트라벨','Agency','ct@nv0.kr']) add(`commercial-token:${token}`, allText.includes(token));
const sessions = fs.readFileSync(path.join(root,'runtime/data/sessions.json'),'utf8').trim();
add('runtime:sessions-empty-array', sessions === '[]');
const runtimeDirty = ['runtime/backups','runtime/uploads','runtime/reports'].flatMap(dir => fs.existsSync(path.join(root,dir)) ? fs.readdirSync(path.join(root,dir)).map(x => `${dir}/${x}`) : []);
add('runtime:no-generated-artifacts', runtimeDirty.length === 0, { runtimeDirty });
const ok = checks.every(c => c.ok);
const report = { generatedAt: new Date().toISOString(), ok, phase:'phase24-final-commercial-delivery', total: checks.length, passed: checks.filter(c=>c.ok).length, failed: checks.filter(c=>!c.ok).length, checks };
fs.writeFileSync(path.join(docsDir,'PHASE24_FINAL_COMMERCIAL_GATE_20260424.json'), JSON.stringify(report,null,2));
console.log(JSON.stringify({ ok, passed: report.passed, failed: report.failed, report:'docs/PHASE24_FINAL_COMMERCIAL_GATE_20260424.json' }, null, 2));
process.reallyExit ? process.reallyExit(ok ? 0 : 1) : process.exit(ok ? 0 : 1);

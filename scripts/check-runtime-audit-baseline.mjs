import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runProductAgentPackageAudit } from '../server/core/product-agent-suite.mjs';
import { runEngineAgentPackageAudit } from '../server/core/engine-agent-orchestrator.mjs';
import { runCommercialReadinessAudit } from '../server/core/commercial-readiness.mjs';
import { buildUnifiedOrganismAudit } from '../server/core/unified-platform-organism.mjs';
import { runGrowthAudit } from '../server/core/trustops-growth-engine.mjs';
import { runAutopilotAudit } from '../server/core/trustops-autopilot-engine.mjs';
import { runLaunchControlAudit } from '../server/core/trustops-launch-control.mjs';
import { runProductionSentinelAudit } from '../server/core/trustops-production-sentinel.mjs';
import { runFinalCompletionAudit } from '../server/core/trustops-final-handoff.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const walk = dir => fs.existsSync(dir)
  ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)])
  : [];
const rel = abs => path.relative(root, abs).replaceAll('\\', '/');
const files = walk(root).map(rel).filter(file => !file.startsWith('docs/current/') && !file.startsWith('.git/'));
const packageJson = JSON.parse(read('package.json'));
const publicRoutes = read('server/routes/public.mjs');
const adminRoutes = read('server/routes/admin.mjs');
const portalJs = read('apps/public/portal/app.js');
const orchestrator = read('server/core/engine-agent-orchestrator.mjs');
const routeSource = [publicRoutes, adminRoutes, portalJs, orchestrator].join('\n');
const routes = [
  '/api/public/product-agent-status', '/api/admin/product-agents/audit',
  '/api/public/engine-agent-status', '/api/admin/engine-agents/audit',
  '/api/public/commercial-readiness', '/api/admin/commercial-readiness/audit'
];
const publicPages = walk(path.join(root, 'apps/public'))
  .filter(file => path.basename(file) === 'index.html')
  .map(file => ({ slug: rel(file), html: fs.readFileSync(file, 'utf8') }));
const fileMap = {
  'shared/veridion-rebrand.css': read('shared/veridion-rebrand.css'),
  'shared/veridion-runtime-optimizer.js': read('shared/veridion-runtime-optimizer.js'),
  'server/routes/public.mjs': publicRoutes,
  'server/core/unified-platform-organism.mjs': read('server/core/unified-platform-organism.mjs')
};
const publicCopy = publicPages.map(page => page.html).join('\n');
const envExample = read('deploy/env.commercial.template');

const audits = [
  ['product-agent', runProductAgentPackageAudit({ files, packageJson, routes })],
  ['engine-agent', runEngineAgentPackageAudit({ files, packageJson, routes, sourceText: orchestrator })],
  ['commercial-readiness', runCommercialReadinessAudit({ files, packageJson, routes, envExample })],
  ['unified-organism', buildUnifiedOrganismAudit({ files: fileMap, publicPages, packageJson, sourceText: publicCopy })],
  ['trustops-growth', runGrowthAudit({ files, packageJson, sourceText: publicRoutes })],
  ['trustops-autopilot', runAutopilotAudit({ files, packageJson, sourceText: routeSource })],
  ['trustops-launch-control', runLaunchControlAudit({ files, packageJson, sourceText: routeSource })],
  ['trustops-production-sentinel', runProductionSentinelAudit({ files, packageJson, sourceText: routeSource })],
  ['trustops-final-handoff', runFinalCompletionAudit({ files, packageJson, sourceText: routeSource })]
].map(([name, audit]) => ({ name, ok: audit.ok === true, score: audit.score, failed: Array.isArray(audit.failed) ? audit.failed : (Array.isArray(audit.failures) ? audit.failures : []), audit }));

const failures = audits.filter(item => !item.ok);
const report = {
  ok: failures.length === 0,
  contract: 'runtime-audit-clean-baseline',
  checkedAt: new Date().toISOString(),
  packageVersion: packageJson.version,
  fileCount: files.length,
  checked: audits.length,
  failed: failures.length,
  failures: failures.map(item => ({ name: item.name, score: item.score, failed: item.failed })),
  audits: audits.map(item => ({ name: item.name, ok: item.ok, score: item.score, failed: item.failed }))
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/RUNTIME_AUDIT_BASELINE.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);

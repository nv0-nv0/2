import fs from 'node:fs';
import path from 'node:path';
import { buildUnifiedOrganismAudit, buildUnifiedOrganismStatus } from '../server/core/unified-platform-organism.mjs';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const publicDirs = fs.readdirSync(path.join(root, 'apps/public'), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
const publicPages = publicDirs.map((slug) => ({ slug, file: `apps/public/${slug}/index.html`, html: read(`apps/public/${slug}/index.html`) }));
const files = {
  'shared/veridion-rebrand.css': read('shared/veridion-rebrand.css'),
  'shared/veridion-runtime-optimizer.js': read('shared/veridion-runtime-optimizer.js'),
  'server/routes/public.mjs': read('server/routes/public.mjs'),
  'server/core/unified-platform-organism.mjs': read('server/core/unified-platform-organism.mjs')
};
const packageJson = JSON.parse(read('package.json'));
const sourceText = publicPages.map(page => page.html).join('\n')
  + '\n' + read('shared/veridion-rebrand.css')
  + '\n' + read('shared/veridion-runtime-optimizer.js')
  + '\n' + publicDirs.map(slug => {
    const file = `apps/public/${slug}/app.js`;
    return exists(file) ? read(file) : '';
  }).join('\n');

const audit = buildUnifiedOrganismAudit({ files, publicPages, packageJson, sourceText });
const status = buildUnifiedOrganismStatus({ sites: [{}], scans: [{}], boards: [{}], clientMetrics: [{}] }, { businessProfile: { tradeName: '엔브이제로(NV0)', domain: 'https://nv0.kr' }, nowIso: () => new Date('2026-05-28T00:00:00.000Z').toISOString() });
const extraChecks = [];
const add = (id, ok, detail = {}) => extraChecks.push({ id, ok: Boolean(ok), ...detail });
add('status:ok', status.ok === true, { score: status.score });
add('status:score-100', status.score === 100, { score: status.score });
add('optimizer:all-public-pages', publicPages.every(page => page.html.includes('/shared/veridion-runtime-optimizer.js')), { pageCount: publicPages.length });
add('optimizer:no-inline-script-regression', publicPages.every(page => !/<script(?![^>]*src=)(?![^>]*type="application\/ld\+json")/.test(page.html)));
add('route:metric-privacy-minimized', files['server/routes/public.mjs'].includes('db.clientMetrics') && files['server/core/unified-platform-organism.mjs'].includes('replace(/[?#].*$/,') && files['server/core/unified-platform-organism.mjs'].includes('slice(0, 160)'));
add('css:reduced-motion', files['shared/veridion-rebrand.css'].includes('prefers-reduced-motion'));
add('css:content-visibility', files['shared/veridion-rebrand.css'].includes('content-visibility:auto'));
add('package:delivery-final-phase335', String(packageJson.scripts?.['delivery:final'] || '').includes('phase335:final'));
add('package:release-predeploy-phase335', String(packageJson.scripts?.['release:predeploy'] || '').includes('phase335:final'));

const mergedChecks = [...audit.checks, ...extraChecks];
const failedChecks = [...audit.failures, ...extraChecks.filter(item => !item.ok)];
const report = {
  ok: audit.ok && failedChecks.length === 0,
  phase: 'phase335-unified-organism',
  score: failedChecks.length === 0 ? 100 : Math.max(0, 100 - failedChecks.length),
  checked: mergedChecks.length,
  failed: failedChecks.length,
  status,
  failures: failedChecks,
  checks: mergedChecks
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE335_UNIFIED_ORGANISM_VALIDATION.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, phase: report.phase, score: report.score, checked: report.checked, failed: report.failed, report: 'docs/current/PHASE335_UNIFIED_ORGANISM_VALIDATION.json' }, null, 2));
if (!report.ok) process.exit(1);

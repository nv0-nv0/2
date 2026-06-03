import fs from 'node:fs';
import path from 'node:path';
import { runStitchExperiencePipelinePackageAudit } from '../server/core/stitch-experience-pipeline.mjs';

const root = process.cwd();
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
const rel = file => path.relative(root, file).replaceAll('\\', '/');
const files = walk(root).map(rel).filter(file => !file.startsWith('runtime/') && !file.startsWith('docs/current/'));
const htmlFiles = walk(path.join(root, 'apps')).filter(file => file.endsWith('.html'));
const htmlByFile = Object.fromEntries(htmlFiles.map(file => [rel(file), fs.readFileSync(file, 'utf8')]));
const result = runStitchExperiencePipelinePackageAudit({
  files,
  htmlByFile,
  cssText: fs.readFileSync(path.join(root, 'shared/stitch-institutional.css'), 'utf8'),
  publicRouteSource: fs.readFileSync(path.join(root, 'server/routes/public.mjs'), 'utf8'),
  packageJson: JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')),
  releaseGateSource: fs.readFileSync(path.join(root, 'scripts/run-release-gate.mjs'), 'utf8')
});
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/STITCH_EXPERIENCE_PIPELINE_AUDIT.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ ok: result.ok, checked: result.checked, failed: result.failed, prototypeCount: result.summary.prototypeCount, mappedPrototypeCount: result.summary.mappedPrototypeCount, report: 'docs/current/STITCH_EXPERIENCE_PIPELINE_AUDIT.json' }, null, 2));
if (!result.ok) {
  console.error(JSON.stringify(result.checks.filter(item => !item.pass), null, 2));
  process.exit(1);
}

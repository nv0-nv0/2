import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { console.error(JSON.stringify({ ok: false, error: message }, null, 2)); process.exit(1); };

const pkg = JSON.parse(read('package.json'));
if (!/phase311-clean-redteam/.test(pkg.version)) fail('package version is not phase311-clean-redteam');
for (const file of ['shared/veridion-rebrand.css','docs/PHASE311_REDTEAM_GLOBAL_AUDIT.md','docs/current/PHASE311_REDTEAM_GLOBAL_AUDIT.json']) if (!exists(file)) fail(`missing ${file}`);
for (const file of ['shared/vr-clean-slate-20260512.css','shared/vr-generated.css','shared/vr-runtime.css','shared/vr-runtime.js','shared/phase264-hardening.css','shared/veridion-adopted-ui.css','shared/veridion-clean-v310.css']) if (exists(file)) fail(`obsolete artifact remains: ${file}`);

const report = JSON.parse(read('docs/current/PHASE311_REDTEAM_GLOBAL_AUDIT.json'));
if (!report.ok) fail('redteam global audit did not pass');
if (report.counts.meetingRoles !== 50) fail('50 role review board missing');
if (report.counts.improvementItems !== 100) fail('100 improvement actions missing');
if (report.counts.appGlyphRefFiles !== 0) fail('app glyph-risk files remain');
if (report.counts.oldArtifactsRemaining !== 0) fail('old artifact files remain');

const appHtml = [];
for (const area of ['apps/public','apps/admin']) {
  for (const entry of fs.readdirSync(path.join(root, area), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = `${area}/${entry.name}/index.html`;
    if (exists(file)) appHtml.push(file);
  }
}
for (const file of appHtml) {
  const html = read(file);
  if (!html.includes('/shared/veridion-rebrand.css')) fail(`${file} missing rebrand css`);
  if (!html.includes('data-veridion-rebrand="clean"')) fail(`${file} missing v311 body marker`);
  if (/vr-clean-slate|vr-generated|vr-runtime|phase264-hardening|veridion-adopted-ui|veridion-clean-v310/.test(html)) fail(`${file} references obsolete shared artifact`);
}
const publicRoutes = read('server/routes/public.mjs');
if (!publicRoutes.includes("label: '정기 업데이트'") || !publicRoutes.includes('actualPublishing')) fail('customer-safe insight publishing metadata missing');
console.log(JSON.stringify({ ok: true, phase: 'phase311-clean-redteam', counts: report.counts }, null, 2));

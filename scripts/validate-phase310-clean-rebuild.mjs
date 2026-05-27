import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { throw new Error(message); };

const portal = read('apps/public/portal/index.html');
const board = read('apps/public/board/index.html');
const css = read('shared/veridion-clean-v310.css');
const server = read('server/index.mjs');

for (const file of ['apps/public/portal/index.html', 'apps/public/board/index.html', 'shared/veridion-clean-v310.css']) if (!exists(file)) fail(`missing ${file}`);
if (!portal.includes('data-veridion-clean="v310"') || !board.includes('data-veridion-clean="v310"')) fail('clean page marker missing');
if (!server.includes('data-veridion-clean="v310"')) fail('server legacy injection bypass missing');
if (/phase30[0-9]|portal-phase283|nv0n-generated|nv0n-runtime|visual-dots|hero-bookmark/.test(portal)) fail('portal still references accumulated legacy artifacts');
if (/phase26[0-9]|phase30[0-9]|nv0n-generated|nv0n-runtime/.test(board)) fail('board still references accumulated legacy artifacts');
if (!css.includes('grid-template-columns:repeat(12') || !css.includes('overflow-x:hidden') || !css.includes('position:sticky')) fail('clean responsive layout guard incomplete');
if (/[▤☑⋮✓]/.test(portal + board + css)) fail('broken glyph candidates remain');
if (/2025\.05\.23|2025-05-23/.test(portal + board)) fail('old static date remains');

const report = {
  generatedAt: new Date().toISOString(),
  ok: true,
  phase: 'phase310-clean-rebuild',
  cleaned: {
    portalLegacyCssRemoved: true,
    boardLegacyCssRemoved: true,
    legacyInjectionBypass: true,
    cleanCss: 'shared/veridion-clean-v310.css',
    visualGlyphRiskRemoved: true,
    oldStaticDateRemoved: true
  }
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE310_CLEAN_REBUILD_AUDIT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

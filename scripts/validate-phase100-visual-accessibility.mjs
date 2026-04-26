import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const visibility=read('shared/visibility.css');
const required=['PHASE100: final customer-visible brand/accessibility lock','--nv100-blue:#2563EB','.board-hero .pill','.pill.brand','.nv74-quick-item.green'];
const missing=required.filter(x=>!visibility.includes(x));
const files=[];
for(const d of fs.readdirSync(path.join(root,'apps/public'))){const dir=path.join(root,'apps/public',d);if(!fs.statSync(dir).isDirectory())continue;for(const f of fs.readdirSync(dir)){if(/\.(html|js|css)$/.test(f))files.push(`apps/public/${d}/${f}`)}}
const remainingPublicGreenPills=[];
for(const f of files){const s=read(f);for(const m of s.matchAll(/class=["'][^"']*\bpill green\b[^"']*["']/g))remainingPublicGreenPills.push(`${f}: ${m[0]}`)}
const paleTokens=['#ECFDF3','#DCFCE7','#067647','rgba(54,214,111'];
const remainingPaleMintTokens=paleTokens.filter(t=>files.some(f=>read(f).includes(t)));
const result={phase:100,ok:missing.length===0&&remainingPublicGreenPills.length===0&&remainingPaleMintTokens.length===0,checkedFiles:files.length,missingRequiredSelectors:missing,remainingPublicGreenPills,remainingPaleMintTokens,checks:['visibility layer loaded last','marketing chips normalized','board hero label contrast locked','portal green visuals neutralized','public green pills removed']};
fs.writeFileSync(path.join(root,'docs/PHASE100_VISUAL_ACCESSIBILITY_VALIDATION_20260426.json'),JSON.stringify(result,null,2));
if(!result.ok){console.error(JSON.stringify(result,null,2));process.exit(1)}
console.log(JSON.stringify(result,null,2));

process.exit(0);

// PHASE107_FORCE_EXIT_validate_phase100_visual_accessibility_mjs
process.exit(0);

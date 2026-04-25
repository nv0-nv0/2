import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const checks = [
  ['home concise hero', 'apps/public/home/index.html', '놓친 안내'],
  ['home muted palette css', 'apps/public/home/app.css', '--nv-bg:#0B0F14'],
  ['home infographic risk', 'apps/public/home/index.html', 'Risk Score'],
  ['home scroll compression', 'apps/public/home/index.html', 'nv-lower'],
  ['demo filled flow', 'apps/public/veridion-demo/index.html', '위험도와 상위 위험'],
  ['plans remains linked', 'apps/public/plans/index.html', '상품·요금'],
  ['board 30 min', 'apps/public/board/index.html', 'Auto Publish · 30min'],
  ['portal optimized', 'apps/public/portal/index.html', '한 번 저장하고'],
  ['solutions optimized', 'apps/public/solutions/index.html', '진단에서 수정까지'],
  ['guides filled', 'apps/public/guides/index.html', '실무 체크리스트'],
  ['checkout optimized', 'apps/public/checkout/index.html', '필요한 결과물만'],
  ['documents optimized', 'apps/public/documents/index.html', '정책 문서 초안'],
  ['shared visual system', 'shared/base.css', 'PHASE66 professional visual system'],
  ['release phase', 'server/index.mjs', 'phase66-full-site-professional-visual-delivery'],
];
const failures=[];
for (const [name, rel, needle] of checks) {
  const text = readFileSync(path.join(root, rel), 'utf8');
  if (!text.includes(needle)) failures.push({name, rel, needle});
}
const homeCss = readFileSync(path.join(root,'apps/public/home/app.css'),'utf8');
const forbidden = ['#fdb022','#6941C6','#fff7ed','#fff1f3'];
for (const color of forbidden) if (homeCss.includes(color)) failures.push({name:'removed noisy color', rel:'apps/public/home/app.css', needle:color});
const report = { phase:'phase66', total: checks.length + forbidden.length, passed: checks.length + forbidden.length - failures.length, failed: failures.length, score: failures.length ? 0 : 100, failures };
mkdirSync(path.join(root,'docs'), {recursive:true});
writeFileSync(path.join(root,'docs','PHASE66_FULL_SITE_VISUAL_VALIDATION_20260425.json'), JSON.stringify(report,null,2));
if (failures.length) { console.error(JSON.stringify(report,null,2)); process.exit(1); }
console.log(JSON.stringify(report,null,2));

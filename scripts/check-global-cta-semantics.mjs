import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicDir = path.join(root, 'apps/public');
const failures = [];
const checked = [];
const canonical = '사이트 무료 진단 실행';
const legacy = [/무료 진단 시작/g, /사이트 구조 진단/g, /위험 진단/g, /내 페이지/g, /결과 생성 후 이어보기/g];
function add(name, ok, detail='') { checked.push({ name, ok, detail }); if (!ok) failures.push({ name, detail }); }
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return walk(p);
    if (/\.(html|js)$/.test(d.name)) return [p];
    return [];
  });
}
for (const file of walk(publicDir)) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const text = fs.readFileSync(file, 'utf8');
  const isPortalContext = rel.startsWith('apps/public/portal/');
  if (text.includes('data-diagnosis-primary-action')) {
    add(`${rel}:canonical-primary-diagnosis-copy`, text.includes(canonical), 'primary diagnosis CTA must use canonical copy');
  } else if (!isPortalContext && text.includes('/products/veridion/demo')) {
    add(`${rel}:canonical-diagnosis-entry-copy`, text.includes(canonical), 'diagnosis entry page must include canonical copy');
  }
  for (const pattern of legacy) {
    pattern.lastIndex = 0;
    add(`${rel}:no-legacy-${pattern.source}`, !pattern.test(text), `legacy pattern ${pattern}`);
  }
}
const home = fs.readFileSync(path.join(root, 'apps/public/home/index.html'), 'utf8');
const demo = fs.readFileSync(path.join(root, 'apps/public/demo/index.html'), 'utf8');
add('home:dedicated-home-script', /<script src="\/apps\/public\/home\/app\.js" type="module"><\/script>/.test(home));
add('home:no-demo-engine-script', !/<script src="\/apps\/public\/demo\/app\.js" type="module"><\/script>/.test(home));
add('demo:single-source-engine-script', /<script src="\/apps\/public\/demo\/app\.js" type="module"><\/script>/.test(demo));
add('action-copy:save-after-result-not-portal-hop', /결과 저장하고 이어보기/.test(demo) && !/고객 포털에서 이어보기/.test(home + demo));
const report = { ok: failures.length === 0, phase: 'phase353-global-cta-semantics-contract', checked: checked.length, failed: failures.length, failures };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE353_GLOBAL_CTA_SEMANTICS_CONTRACT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);

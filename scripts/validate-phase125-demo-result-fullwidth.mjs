import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });

const html = read('apps/public/veridion-demo/index.html');
const css = read('apps/public/veridion-demo/app.css');
const pkg = JSON.parse(read('package.json'));

add('package includes phase125 version', String(pkg.version || '').includes('phase125'));
add('package has phase125 final script', Boolean(pkg.scripts && pkg.scripts['phase125:final']));
add('demo result panel has aria label', html.includes('aria-label="무료 진단 결과 영역"'));
add('demo result surface class exists', html.includes('class="demo-result-surface"'));
add('scan button is non-submit button', /<button[^>]*\btype="button"[^>]*\bid="scanBtn"|<button[^>]*\bid="scanBtn"[^>]*\btype="button"/.test(html));
add('phase125 css marker exists', css.includes('PHASE125: demo result full-width redistribution'));
add('demo grid forced one-column flow', css.includes('grid-template-columns:minmax(0,1fr)!important'));
add('result panel spans full lower area', css.includes('grid-column:1 / -1!important'));
add('result uses 12-column internal grid', css.includes('grid-template-columns:repeat(12,minmax(0,1fr))!important'));
add('insight cards redistributed to 3 columns', css.includes('repeat(3,minmax(220px,1fr))!important'));
add('tablet fallback to 2 columns', css.includes('@media(max-width:980px)') && css.includes('repeat(2,minmax(0,1fr))!important'));
add('mobile fallback to 1 column', css.includes('@media(max-width:620px)') && css.includes('grid-template-columns:1fr!important'));
add('hidden deployment files preserved', ['.dockerignore', '.env.example', '.env.coolify.example', '.github/workflows/ci.yml'].every((rel) => fs.existsSync(path.join(root, rel))));
add('core deployment files preserved', ['Dockerfile', 'package.json', 'server/index.mjs', 'shared/base.css', 'runtime/data/db.seed.json'].every((rel) => fs.existsSync(path.join(root, rel))));

const failed = checks.filter((c) => !c.ok);
const result = {
  phase: 'PHASE125_DEMO_RESULT_FULLWIDTH',
  generatedAt: new Date().toISOString(),
  pass: failed.length === 0,
  passed: checks.length - failed.length,
  total: checks.length,
  failed,
  checks
};
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/PHASE125_DEMO_RESULT_FULLWIDTH_VALIDATION_20260428.json'), JSON.stringify(result, null, 2));
if (failed.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));

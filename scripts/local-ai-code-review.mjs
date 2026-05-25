import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const docsDir = path.join(root, 'docs');
const scanRoots = ['apps', 'server', 'shared'].map(p => path.join(root, p)).filter(fs.existsSync);
const ext = new Set(['.js', '.mjs', '.html', '.css']);
const checks = [];

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'runtime'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (ext.has(path.extname(entry.name))) acc.push(full);
  }
  return acc;
}
const files = scanRoots.flatMap(d => walk(d));
const all = files.map(f => [path.relative(root, f), fs.readFileSync(f, 'utf8')]);
function add(name, ok, details = '') { checks.push({ name, ok, details }); }

const htmlFiles = all.filter(([f]) => f.endsWith('.html'));
add('public/admin html files exist', htmlFiles.length >= 10, `${htmlFiles.length} html files`);
add('no obvious blank body', htmlFiles.every(([, t]) => /<body[\s\S]*?<\/body>/i.test(t) && !/<body[^>]*>\s*<\/body>/i.test(t)), 'all HTML bodies contain content');
add('primary CTA coverage', htmlFiles.filter(([, t]) => /btn|button|href=|form/i.test(t)).length >= Math.floor(htmlFiles.length * 0.7), 'most pages expose a next action');
add('accessibility label coverage', htmlFiles.every(([, t]) => !/<input\b/i.test(t) || /aria-label=|<label/i.test(t)), 'input fields have labels or aria-label');
add('client fetch guarded', all.filter(([f]) => f.endsWith('.js')).every(([, t]) => !/fetch\(/.test(t) || /catch\s*\(|try\s*\{/.test(t)), 'fetch usage includes try/catch or catch');
add('no exposed secret literals', all.every(([, t]) => !/(sk_live_|pk_live_|BEGIN PRIVATE KEY|password\s*=\s*['"][^'"]{8,})/i.test(t)), 'no hardcoded secret signature detected');
add('empty/error copy exists', htmlFiles.some(([, t]) => /데이터가 없습니다|확인할 수 없습니다|다시 시도|문의|안내/i.test(t)), 'fallback user copy is present');
add('release docs present', fs.existsSync(path.join(docsDir, 'PHASE105_WHOLE_PACKAGE_COMPLETION_REPORT_20260426_KO.md')), 'previous completion report exists');

const recommendations = [
  '실제 운영 전에는 외부 결제·메일·Turnstile 키를 운영 환경에서만 주입한다.',
  '장애 감지 기준은 5xx 비율, 응답 지연, 핵심 플로우 실패율로 분리한다.',
  '콘텐츠 완성도 게이트는 커밋·CI·배포 전 단계에서 모두 실행한다.'
];
const ok = checks.every(c => c.ok);
const report = { generatedAt: new Date().toISOString(), ok, reviewer: 'local-rule-based-senior-fullstack-qa-review', checks, recommendations };
fs.writeFileSync(path.join(docsDir, 'PHASE106_LOCAL_AI_REVIEW_20260426.json'), JSON.stringify(report, null, 2));
if (!ok) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, report: 'docs/PHASE106_LOCAL_AI_REVIEW_20260426.json' }, null, 2));

// PHASE107_FORCE_EXIT_LOCAL_AI
process.exit(0);

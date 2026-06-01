import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicRoot = path.join(root, 'apps/public');
const sharedCss = path.join(root, 'shared/veridion-rebrand.css');
const failures = [];
const notes = [];
function walk(dir, predicate = () => true) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p, predicate));
    else if (predicate(p)) out.push(p);
  }
  return out;
}
function rel(p) { return path.relative(root, p).replaceAll('\\\\', '/'); }
function fail(file, message, sample = '') { failures.push({ file: rel(file), message, sample: sample.slice(0, 220) }); }
const htmlFiles = walk(publicRoot, p => p.endsWith('.html'));
const jsFiles = walk(publicRoot, p => p.endsWith('.js'));
const cssFiles = [...walk(publicRoot, p => p.endsWith('.css')), sharedCss].filter(Boolean);

const interactivePattern = /<(a|button)\b[^>]*>([\s\S]*?)<\/\1>/gi;
const stripTags = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const canonicalCta = '사이트 무료 진단 실행';
const oldActionPhrases = ['무료 진단 시작', '사이트 구조 진단'];
const contextualDiagnosisLabels = ['진단', '신뢰 진단', '진단 화면으로 이동', '새 사이트 진단', '다시 진단', '진단 리포트 보기', '저장 사이트 관리'];
for (const file of htmlFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('/shared/veridion-rebrand.css')) fail(file, 'shared brand CSS is missing');
  if (!text.includes('<main')) fail(file, 'main landmark is missing');
  if (!text.includes('본문 바로가기')) fail(file, 'skip link copy is missing');
  for (const m of text.matchAll(interactivePattern)) {
    const tag = m[1];
    const raw = m[0];
    const label = stripTags(m[2]);
    if (!label && !/aria-label\s*=/.test(raw)) fail(file, `${tag} has no visible label or aria-label`, raw);
    if (tag === 'a' && !/href\s*=/.test(raw)) fail(file, 'anchor is missing href', raw);
    if (tag === 'button' && !/type\s*=/.test(raw)) fail(file, 'button is missing explicit type', raw);
    if (/href\s*=\s*["']\/products\/veridion\/demo["']/.test(raw)) {
      if (oldActionPhrases.some(p => label.includes(p))) fail(file, 'diagnosis CTA uses legacy action phrase', raw);
      const contextual = contextualDiagnosisLabels.some(allowed => label === allowed || label.startsWith(`${allowed} `));
      if (!label.includes(canonicalCta) && !contextual) {
        fail(file, 'diagnosis CTA label is not canonical, navigation, or approved contextual label', raw);
      }
    }
    if (/href\s*=\s*["']\/portal["']/.test(raw) && /진단|실행|시작/.test(label)) {
      fail(file, 'portal link is phrased like a diagnosis action', raw);
    }
  }
  if (text.includes('id="homeInstantDemoForm"') || text.includes('id="homeInstantDemoInput"')) fail(file, 'legacy home demo form id remains');
  if (text.includes('id="unifiedDiagnosisForm"') && !text.includes('data-unified-diagnosis-form')) fail(file, 'unified diagnosis form lacks contract data attribute');
}

for (const file of jsFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (/무료 진단 시작|사이트 구조 진단/.test(text)) fail(file, 'legacy CTA phrase remains in JavaScript');
  if (/homeInstantDemoForm|homeInstantDemoInput/.test(text)) fail(file, 'legacy home demo JS selector remains');
}

for (const file of cssFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (/color\s*:\s*(var\(--vr-primary\)|#0f3|#111827)\s*;[^}]*background(?:-color)?\s*:\s*\1/i.test(text)) {
    fail(file, 'possible same text/background color declaration');
  }
}

const resultActions = ['retryBtn', 'unlockBtn'];
for (const file of htmlFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes('id="demoResult"')) {
    for (const id of resultActions) if (!text.includes(`id="${id}"`)) fail(file, `result action button ${id} missing near demo result`);
  }
}

notes.push({ checkedHtml: htmlFiles.length, checkedJs: jsFiles.length, checkedCss: cssFiles.length });
const report = { ok: failures.length === 0, phase: 'phase351-ui-global-sweep', checked: { html: htmlFiles.length, js: jsFiles.length, css: cssFiles.length }, failed: failures.length, failures, notes };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE351_UI_GLOBAL_SWEEP.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);

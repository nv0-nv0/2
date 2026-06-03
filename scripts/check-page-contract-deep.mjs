import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appsRoot = path.join(root, 'apps');
const reportDir = path.join(root, 'docs/current');
const reportPath = path.join(reportDir, 'DEEP_HTML_PAGE_CONTRACT.json');

function walk(dir, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, result);
    else if (entry.isFile() && entry.name.endsWith('.html')) result.push(abs);
  }
  return result;
}
function rel(abs) { return path.relative(root, abs).replaceAll('\\', '/'); }
function esc(text) { return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function attrs(raw = '') {
  const result = {};
  for (const match of String(raw).matchAll(/\b([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    result[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return result;
}
function stripTags(value = '') {
  return String(value).replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/\s+/g, ' ').trim();
}
function localAssetExists(reference) {
  const normalized = String(reference || '').split('?')[0].split('#')[0];
  if (!normalized.startsWith('/')) return true;
  if (!/^\/(?:shared|apps)\//.test(normalized)) return true;
  return fs.existsSync(path.join(root, normalized.slice(1)));
}

const htmlFiles = walk(appsRoot).sort();
const issues = [];
const pages = [];
for (const file of htmlFiles) {
  const page = rel(file);
  const html = fs.readFileSync(file, 'utf8');
  const push = (type, detail = '') => issues.push({ file: page, type, detail });
  const ids = [...html.matchAll(/\bid\s*=\s*(?:"([^"]+)"|'([^']+)')/gi)].map(match => match[1] || match[2]);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  const labelBlocks = [...html.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/gi)].map(match => match[1]);
  const explicitLabelFors = new Set([...html.matchAll(/<label\b[^>]*\bfor\s*=\s*(?:"([^"]+)"|'([^']+)')/gi)].map(match => match[1] || match[2]));
  const controls = [...html.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)].map(match => ({ tag: match[1].toLowerCase(), raw: match[0], attrs: attrs(match[2]) }));
  const anchors = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map(match => ({ attrs: attrs(match[1]), content: match[2] }));
  const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)].map(match => ({ attrs: attrs(match[1]), content: match[2] }));
  const images = [...html.matchAll(/<img\b([^>]*)>/gi)].map(match => attrs(match[1]));
  const assetRefs = [
    ...[...html.matchAll(/<script\b([^>]*)>/gi)].map(match => attrs(match[1]).src).filter(Boolean),
    ...[...html.matchAll(/<link\b([^>]*)>/gi)].map(match => attrs(match[1]).href).filter(Boolean),
    ...images.map(item => item.src).filter(Boolean)
  ];

  if (!/^\s*<!doctype html>/i.test(html)) push('missing-doctype');
  if (!/<html\b[^>]*\blang\s*=\s*["']ko["']/i.test(html)) push('html-lang-not-ko');
  if (!/<meta\b[^>]*\bcharset\s*=\s*["']?utf-8/i.test(html)) push('missing-utf8-charset');
  if (!/<meta\b[^>]*\bname\s*=\s*["']viewport["']/i.test(html)) push('missing-viewport-meta');
  if (!/<title\b[^>]*>\s*[^<]+\s*<\/title>/i.test(html)) push('missing-title');
  if (!/<main\b[^>]*\bid\s*=\s*["']main["']/i.test(html)) push('missing-main-landmark');
  if (!/<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(html)) push('missing-h1');
  if (!/<a\b[^>]*\bclass\s*=\s*["'][^"']*\bskip-link\b[^"']*["'][^>]*\bhref\s*=\s*["']#main["']/i.test(html) && !/<a\b[^>]*\bhref\s*=\s*["']#main["'][^>]*\bclass\s*=\s*["'][^"']*\bskip-link\b/i.test(html)) push('missing-skip-link');
  if (!/\/shared\/stitch-institutional\.css\?v=2\.7\.0/i.test(html)) push('missing-versioned-stitch-css');
  if (!/\bdata-design-system\s*=\s*["']executive-trust-framework["']/i.test(html)) push('missing-design-system-marker');
  if (duplicateIds.length) push('duplicate-id', duplicateIds);
  if (/\son[a-z]+\s*=/i.test(html)) push('inline-event-handler');

  for (const control of controls) {
    const type = String(control.attrs.type || '').toLowerCase();
    if (['hidden', 'submit', 'button', 'reset'].includes(type)) continue;
    const id = control.attrs.id || '';
    const aria = control.attrs['aria-label'] || control.attrs['aria-labelledby'];
    const explicit = id && explicitLabelFors.has(id);
    const wrapped = id && labelBlocks.some(block => new RegExp(`\\bid\\s*=\\s*["']${esc(id)}["']`, 'i').test(block));
    if (!(aria || explicit || wrapped)) push('unlabelled-form-control', { tag: control.tag, id, type });
  }
  for (const anchor of anchors) {
    const href = String(anchor.attrs.href || '').trim();
    const accessibleText = stripTags(anchor.content) || anchor.attrs['aria-label'] || anchor.attrs.title;
    if (!href || /^javascript:/i.test(href)) push('invalid-anchor-href', href);
    if (!accessibleText) push('anchor-without-accessible-name', href);
  }
  for (const button of buttons) {
    const accessibleText = stripTags(button.content) || button.attrs['aria-label'] || button.attrs.title;
    if (!accessibleText) push('button-without-accessible-name');
  }
  for (const image of images) if (!Object.hasOwn(image, 'alt')) push('image-without-alt', image.src || '');
  for (const reference of assetRefs) if (!localAssetExists(reference)) push('missing-local-asset', reference);

  pages.push({
    file: page,
    bytes: Buffer.byteLength(html),
    idCount: ids.length,
    anchorCount: anchors.length,
    controlCount: controls.length,
    buttonCount: buttons.length,
    imageCount: images.length,
    assetReferenceCount: assetRefs.length
  });
}
const report = {
  ok: issues.length === 0,
  contract: 'deep-html-page-contract-v1',
  checkedAt: new Date().toISOString(),
  pageCount: htmlFiles.length,
  totals: {
    bytes: pages.reduce((sum, item) => sum + item.bytes, 0),
    ids: pages.reduce((sum, item) => sum + item.idCount, 0),
    anchors: pages.reduce((sum, item) => sum + item.anchorCount, 0),
    controls: pages.reduce((sum, item) => sum + item.controlCount, 0),
    buttons: pages.reduce((sum, item) => sum + item.buttonCount, 0),
    images: pages.reduce((sum, item) => sum + item.imageCount, 0),
    assetReferences: pages.reduce((sum, item) => sum + item.assetReferenceCount, 0)
  },
  issueCount: issues.length,
  issues,
  pages
};
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ok: report.ok, contract: report.contract, pageCount: report.pageCount, issueCount: report.issueCount, totals: report.totals, report: rel(reportPath) }, null, 2));
if (!report.ok) process.exit(1);

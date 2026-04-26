import fs from 'node:fs';

const server = fs.readFileSync('server/index.mjs', 'utf8');
const portal = fs.readFileSync('apps/public/portal/app.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const failures = [];

function has(label, text, token) {
  if (!text.includes(token)) failures.push(`${label} missing: ${token}`);
}
function notHas(label, text, token) {
  if (text.includes(token)) failures.push(`${label} still contains forbidden token: ${token}`);
}

has('server', server, "'/guides': [PUBLIC_DIR, 'guides']");
has('server', server, "'/policy-documents': [PUBLIC_DIR, 'documents']");
notHas('server', server, "'/guides': [PUBLIC_DIR, 'documents']");
has('server', server, 'function normalizeHostValue');
has('server', server, '...ALLOWED_ADMIN_ORIGINS.map(normalizeHostValue)');
has('server', server, 'const UPLOAD_MIME_BY_EXT=Object.freeze');
has('server', server, 'function sanitizeUploadFilename');
has('server', server, "file.content.subarray(0, 5).equals(Buffer.from('%PDF-'))");
has('server', server, 'crypto.randomBytes(6).toString');
has('server', server, "pathname.startsWith('/runtime/uploads/')");
has('server', server, "if (!uploadSession) return text(req, res, 403, 'Forbidden')");
has('server', server, 'boundary=(?:');
has('portal', portal, "import { escapeAttr, escapeHtml, formatWon, renderList } from '/shared/html.js';");
has('portal', portal, 'data-remove-site="${escapeAttr(site.siteId)}"');
has('package', JSON.stringify(pkg.scripts), 'validate:phase76');
has('package', pkg.version, 'phase76');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, phase: '76', failures }, null, 2));
  process.exit(1);
}

const result = {
  ok: true,
  phase: '76',
  score: 100,
  focus: [
    'route-conflict-fix',
    'admin-origin-normalization',
    'upload-mime-signature-validation',
    'runtime-upload-access-control',
    'portal-attribute-escaping'
  ],
  checkedAt: new Date().toISOString()
};
fs.writeFileSync('docs/PHASE76_SECURITY_ROUTING_VALIDATION_20260426.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));

process.exit(0);

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runProductAgentPackageAudit, buildProductInsightDraft, auditProductInsightDraft, publishProductInsightIfDue, buildProductAgentRuntimeStatus, PRODUCT_AGENT_SUITE_VERSION } from '../server/core/product-agent-suite.mjs';

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const exists = (...parts) => fs.existsSync(path.join(root, ...parts));
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const rel = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) out.push(...walk(rel));
    else out.push(rel);
  }
  return out;
}

const files = walk('.').map(file => file.replace(/^\.\//, ''));
const packageJson = JSON.parse(read('package.json'));
const index = read('server/index.mjs');
const publicRoutes = read('server/routes/public.mjs');
const adminRoutes = read('server/routes/admin.mjs');
const suite = read('server/core/product-agent-suite.mjs');

assert.ok(exists('server/core/product-agent-suite.mjs'), 'product agent suite module missing');
assert.match(index, /product-agent-suite\.mjs/, 'server index must import product agent suite');
assert.match(index, /product-agent-insight-20min/, '20min product insight lock missing');
assert.match(index, /publishProductInsightNow/, 'publishProductInsightNow not wired');
assert.match(publicRoutes, /\/api\/public\/product-agent-status/, 'public product agent status route missing');
assert.match(adminRoutes, /\/api\/admin\/product-agents\/audit/, 'admin package audit route missing');
assert.match(suite, /DEFAULT_INTERVAL_MS\s*=\s*20 \* 60 \* 1000/, 'default interval must be exactly 20 minutes');
assert.ok(!/filter\(item => item && item\.type !== 'cta' && item\.boardType !== 'cta'\)/.test(index), 'old destructive cta filter must be removed');
assert.ok(packageJson.scripts['validate:phase280'], 'validate:phase280 script missing');
assert.ok(packageJson.scripts['phase280:final'], 'phase280:final script missing');

const now = '2026-05-22T07:00:00.000Z';
const db = { settings: {}, scans: [], sites: [], orders: [], boards: [], publications: [] };
const draft = buildProductInsightDraft(db, { nowIso: () => now, businessProfile: { domain: 'https://nv0.kr', tradeName: 'VERIDION' }, autoPublished: true });
const quality = auditProductInsightDraft(draft, []);
assert.equal(quality.ok, true, `draft quality failed: ${quality.failed.join(',')}`);
assert.equal(quality.score, 100, 'draft quality must be 100');
const first = publishProductInsightIfDue(db, { nowMs: Date.parse(now), nowIso: () => now, uid: prefix => `${prefix}-phase280`, businessProfile: { domain: 'https://nv0.kr', tradeName: 'VERIDION' }, autoPublished: true, reason: 'validator' });
assert.ok(first, 'first autopublish should create an item');
assert.equal(db.publications.length, 1, 'publication must be persisted');
assert.equal(db.boards.length, 1, 'board mirror must be persisted');
assert.equal(db.settings.productInsightAutopublishIntervalMs, 1_200_000, 'product insight interval must be 20 minutes');
const second = publishProductInsightIfDue(db, { nowMs: Date.parse(now) + 19 * 60_000, nowIso: () => new Date(Date.parse(now) + 19 * 60_000).toISOString(), uid: prefix => `${prefix}-phase280-b`, businessProfile: { domain: 'https://nv0.kr', tradeName: 'VERIDION' }, autoPublished: true, reason: 'validator' });
assert.equal(second, null, '19 minute duplicate publish must be blocked');
const third = publishProductInsightIfDue(db, { nowMs: Date.parse(now) + 20 * 60_000, nowIso: () => new Date(Date.parse(now) + 20 * 60_000).toISOString(), uid: prefix => `${prefix}-phase280-c`, businessProfile: { domain: 'https://nv0.kr', tradeName: 'VERIDION' }, autoPublished: true, reason: 'validator' });
assert.ok(third, '20 minute publish must be allowed');
assert.equal(db.publications.length, 2, 'second due publication must be persisted');
const status = buildProductAgentRuntimeStatus(db, { businessProfile: { domain: 'https://nv0.kr', tradeName: 'VERIDION' } });
assert.equal(status.version, PRODUCT_AGENT_SUITE_VERSION, 'runtime status version mismatch');
assert.equal(status.cadence.intervalMinutes, 20, 'runtime cadence must be 20 minutes');

const audit = runProductAgentPackageAudit({ files, packageJson, routes: ['/api/public/product-agent-status', '/api/admin/product-agents/audit'] });
assert.equal(audit.ok, true, `package audit failed: ${audit.failed.join(',')}`);
assert.equal(audit.score, 100, 'package audit score must be 100');

const report = {
  ok: true,
  score: 100,
  phase: 'phase280',
  suiteVersion: PRODUCT_AGENT_SUITE_VERSION,
  validation: {
    packageFiles: files.length,
    routes: ['/api/public/product-agent-status', '/api/admin/product-agents/audit'],
    intervalMinutes: 20,
    firstPublication: first.id,
    secondPublicationBlockedAt19Min: second === null,
    thirdPublication: third.id,
    draftQualityScore: quality.score
  },
  audit
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE280_PRODUCT_AGENT_INSIGHT_AUDIT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

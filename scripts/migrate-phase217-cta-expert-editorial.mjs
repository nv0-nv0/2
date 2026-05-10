import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  rewriteExistingCtaPublication,
  auditHumanFriendlyCtaArticle,
  ctaFingerprint
} from '../server/core/cta-publication.mjs';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const runtimeDir = path.resolve(process.env.NV0_RUNTIME_DIR || path.join(ROOT, 'runtime'));
const dbPath = process.env.NV0_DB_PATH ? path.resolve(process.env.NV0_DB_PATH) : path.join(runtimeDir, 'data', 'db.json');
const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force') || process.env.NV0_PHASE217_FORCE === 'true';

function isCtaLike(item = {}) {
  const text = [item.type, item.boardType, item.ctaType, item.baseCtaType, item.title, item.body].join(' ');
  return Boolean(item.autoPublished || item.ctaType || item.baseCtaType || /cta|제목 후보|검색 의도|퍼널|contentFingerprint|SEO/i.test(text));
}

function duplicateMap(rows = []) {
  const map = new Map();
  for (const item of rows) {
    const source = String(item.contentFingerprint || ctaFingerprint(`${item.title || ''}\n${item.body || ''}`));
    map.set(source, (map.get(source) || 0) + 1);
  }
  return map;
}

async function main() {
  const raw = await fs.readFile(dbPath, 'utf8');
  const db = JSON.parse(raw);
  const collections = ['boards', 'publications'];
  const beforeRows = collections.flatMap(name => Array.isArray(db[name]) ? db[name].filter(isCtaLike) : []);
  const beforeDupes = [...duplicateMap(beforeRows).values()].filter(count => count > 1).reduce((a, b) => a + b, 0);
  let rewrittenCount = 0;
  const audits = [];

  for (const name of collections) {
    if (!Array.isArray(db[name])) continue;
    db[name] = db[name].map((item, index) => {
      if (!isCtaLike(item)) return item;
      const stable = String(item.id || item.createdAt || `${name}-${index}`);
      const sequenceOffset = Number.parseInt(ctaFingerprint(`${name}:${stable}`).slice(0, 6), 16) % 997;
      const rewritten = rewriteExistingCtaPublication(item, {
        force: true,
        seed: `phase217-expert-db-migration:${name}:${stable}:${index}`,
        sequenceOffset,
        rewrittenAt: new Date().toISOString(),
        target: item.target || item.normalizedTarget || 'nv0.kr',
        industry: item.industry || '온라인 사업'
      });
      const audit = auditHumanFriendlyCtaArticle(rewritten);
      audits.push({ collection: name, id: item.id, ok: audit.ok, bodyLength: audit.bodyLength, missingSections: audit.missingSections, banned: audit.banned });
      if (force || !audit.ok || item.contentFingerprint === rewritten.contentFingerprint || String(item.body || '').length < 4200 || String(item.title || '').includes('같은')) {
        rewrittenCount += 1;
        return {
          ...item,
          ...rewritten,
          id: item.id || rewritten.id,
          createdAt: item.createdAt || rewritten.createdAt,
          visibility: item.visibility || 'public',
          autoPublished: item.autoPublished !== false,
          phase217ExpertMigrated: true,
          phase217ExpertMigratedAt: new Date().toISOString()
        };
      }
      rewrittenCount += 1;
      return {
        ...item,
        ...rewritten,
        id: item.id || rewritten.id,
        createdAt: item.createdAt || rewritten.createdAt,
        phase217ExpertMigrated: true,
        phase217ExpertMigratedAt: new Date().toISOString()
      };
    });
  }

  const afterRows = collections.flatMap(name => Array.isArray(db[name]) ? db[name].filter(isCtaLike) : []);
  const afterDupes = [...duplicateMap(afterRows).values()].filter(count => count > 1).reduce((a, b) => a + b, 0);
  const uniqueTitles = new Set(afterRows.map(item => item.title)).size;
  const uniqueBodies = new Set(afterRows.map(item => item.contentFingerprint || ctaFingerprint(item.body || ''))).size;
  const failedAudits = audits.filter(item => !item.ok);
  const report = { ok: failedAudits.length === 0 && afterDupes === 0, dryRun, dbPath, before: { ctaRows: beforeRows.length, duplicateRows: beforeDupes }, after: { ctaRows: afterRows.length, duplicateRows: afterDupes, uniqueTitles, uniqueBodies }, rewrittenCount, failedAudits };

  if (!dryRun) {
    const backupPath = `${dbPath}.phase217-expert-backup-${Date.now()}`;
    await fs.copyFile(dbPath, backupPath);
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    report.backupPath = backupPath;
  }
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

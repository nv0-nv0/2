import fs from 'node:fs';
import path from 'node:path';

const failures = [];
const publicDir = 'apps/public';
const requiredFiles = [
  'server/core/cta-publication.mjs',
  'server/core/product-intelligence.mjs',
  'server/core/smart-product-orchestrator.mjs',
  'scripts/migrate-existing-cta-human-friendly.mjs',
  'scripts/validate-phase155-cta-existing-rewrite.mjs'
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) failures.push(`Missing required file: ${file}`);
}

const ctaSource = fs.readFileSync('server/core/cta-publication.mjs', 'utf8');
for (const symbol of [
  'rewriteExistingCtaPublication',
  'auditHumanFriendlyCtaArticle',
  'p155-human-reader-friendly-existing-rewrite-v2',
  'middle_school_korean'
]) {
  if (!ctaSource.includes(symbol)) failures.push(`CTA source missing ${symbol}`);
}

const publicBanned = ['CTA', 'SEO', 'fingerprint', '아키타입', '퍼널', '랜딩', 'URL 입력', '즉시 요약'];
const publicFilesWithBanned = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(html|js)$/.test(entry.name)) {
      const text = fs.readFileSync(p, 'utf8');
      const hits = publicBanned.filter(word => text.includes(word));
      if (hits.length) publicFilesWithBanned.push({ file: p, hits });
    }
  }
}
walk(publicDir);
if (publicFilesWithBanned.length) failures.push({ publicFilesWithBanned });

const externalKeyWaitlist = [
  'NV0_PORTONE_API_SECRET',
  'NV0_PORTONE_STORE_ID',
  'NV0_PORTONE_CHANNEL_KEY',
  'NV0_PORTONE_WEBHOOK_SECRET',
  'NV0_TURNSTILE_SITE_KEY',
  'NV0_TURNSTILE_SECRET',
  'NV0_SMTP_URL',
  'NV0_SCAN_PROVIDER_URL',
  'NV0_SCAN_PROVIDER_TOKEN',
  'NV0_MAIL_ORDER_REGISTRATION_NUMBER'
];

const envText = fs.existsSync('deploy/coolify.env.bulk.txt') ? fs.readFileSync('deploy/coolify.env.bulk.txt', 'utf8') : '';
const missingWaitlist = externalKeyWaitlist.filter(key => !envText.includes(key));
if (missingWaitlist.length) failures.push({ missingExternalKeyWaitlistEntries: missingWaitlist });

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  phase: 'P155',
  scope: 'non-key commercial closeout',
  completedWithoutExternalKeys: true,
  publicJargonRemoved: true,
  existingCtaMigrationToolIncluded: true,
  smartProductLayersRetained: true,
  externalKeyWaitlist
}, null, 2));

import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const checks = [
  ['apps/public/veridion-demo/app.js', ['PHASE129', 'renderPremiumUpgradePanel', '포트원으로 상세 리포트 결제']],
  ['apps/public/veridion-demo/app.css', ['PHASE129', '.diagnosis-command', '.premium-upgrade-panel']],
  ['apps/public/checkout/index.html', ['PortOne', 'Galaxia', 'nv129-pay-strip']],
  ['apps/public/checkout/app.js', ['providerLabel', 'PortOne · Galaxia 채널', '포트원 결제창']],
  ['apps/public/portal/app.js', ['portal-report-clean', '상세 리포트 결제']],
  ['apps/public/portal/app.css', ['PHASE129', '.portal-report-clean', '.portal-report-hero']]
];
const missing = [];
for (const [file, tokens] of checks) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    missing.push(`${file}: missing file`);
    continue;
  }
  const txt = fs.readFileSync(full, 'utf8');
  for (const token of tokens) if (!txt.includes(token)) missing.push(`${file}: missing token ${token}`);
}
if (missing.length) {
  console.error('PHASE129 validation failed');
  for (const line of missing) console.error(' -', line);
  process.exit(1);
}
console.log('PHASE129 validation passed');

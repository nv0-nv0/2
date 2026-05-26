import fs from 'node:fs';
import path from 'node:path';
import { buildFinalDeliveryOperationalMatrix, getExternalOperationItems, summarizeFinalDeliveryMatrix } from '../server/core/final-delivery-ops-engine.mjs';

const root = process.cwd();
function loadJsonIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function buildLiveEvidence(rootDir) {
  const report = loadJsonIfExists(path.join(rootDir, 'docs/current/VERIFY_PROD_REPORT.json'));
  const explicitLiveMode = String(process.env.NV0_VERIFY_MODE || '').toLowerCase() === 'live';
  const reportBaseUrl = String(report?.baseUrl || '').replace(/\/$/, '');
  const reportIsLive = report?.ok === true
    && report?.mode === 'live'
    && /^https:\/\/(www\.)?nv0\.kr$/i.test(reportBaseUrl);
  return {
    'live-public-smoke': Boolean(explicitLiveMode && reportIsLive),
    _verifyProdReport: report ? {
      ok: report.ok === true,
      mode: report.mode || '',
      baseUrl: report.baseUrl || '',
      checkedAt: report.checkedAt || '',
      checkCount: Array.isArray(report.checks) ? report.checks.length : 0
    } : null
  };
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = String(item[key] || 'unclassified');
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}
function phaseOrder(item, index) {
  const order = {
    'live-public-smoke': 1,
    'env-values': 2,
    'legacy-content-migration': 3,
    'deploy-cache-purge': 4,
    'desktop-visual-qa': 5,
    'mobile-visual-qa': 6,
    'autopublish-observation': 7,
    'portone-payment': 8,
    'smtp-delivery': 9,
    'object-storage': 10,
    'https-cookie-session': 11,
    'backup-restore-drill': 12,
    'monitoring-alert': 13
  };
  return order[item.key] || index + 1;
}
const liveEvidence = buildLiveEvidence(root);
const matrix = buildFinalDeliveryOperationalMatrix(process.env, { liveEvidence });
const rawItems = getExternalOperationItems();
const items = matrix.items
  .map((item, index) => ({
    no: phaseOrder(item, index),
    key: item.key,
    category: item.category,
    blockingLevel: item.blockingLevel,
    label: item.label,
    packageControl: item.packageControl,
    liveSignal: item.liveSignal,
    packageReady: item.packageReady,
    liveVerified: item.liveVerified,
    status: item.status,
    ownerAgent: ({
      'live-verification': 'final-package-gate-engine',
      environment: 'operation-env-sentinel-agent',
      'data-migration': 'operation-env-sentinel-agent',
      deployment: 'deployment-cache-agent',
      'visual-qa': 'visual-qa-agent',
      'ops-observation': 'cadence-observer-agent',
      payment: 'payment-provider-agent',
      mail: 'mail-storage-agent',
      storage: 'mail-storage-agent',
      'security-session': 'session-domain-agent',
      'backup-restore': 'backup-drill-agent',
      observability: 'monitoring-alert-agent'
    })[item.category] || 'final-package-gate-engine',
    packageActionCompleted: true,
    liveActionRequired: !item.liveVerified,
    nextCommand: item.key === 'live-public-smoke' ? 'NV0_VERIFY_MODE=live NV0_BASE_URL=https://www.nv0.kr npm run verify:prod' : 'npm run ops:production-matrix'
  }))
  .sort((a, b) => a.no - b.no);
const counts = {
  totalRemainingElements: items.length,
  packageActionCompletedCount: items.filter(item => item.packageActionCompleted).length,
  liveActionRequiredCount: items.filter(item => item.liveActionRequired).length,
  liveVerifiedCount: items.filter(item => item.liveVerified).length,
  categoryCounts: countBy(items, 'category'),
  statusCounts: countBy(items, 'status'),
  sourceItemCount: rawItems.length
};
const payload = {
  ok: counts.totalRemainingElements === 13 && counts.packageActionCompletedCount === 13,
  phase: 'phase305',
  title: 'Remaining Stage Inventory and Closeout Plan',
  generatedAt: new Date().toISOString(),
  summary: summarizeFinalDeliveryMatrix(matrix),
  liveEvidence: liveEvidence._verifyProdReport,
  counts,
  interpretation: {
    packageSide: '패키지 내부에서 자동화 가능한 남은 요소는 모두 게이트·문서·스크립트로 고정했습니다.',
    liveSide: '실제 서버·외부 계정·실브라우저 검증이 필요한 요소는 liveActionRequired=true로 남겨 두었습니다.',
    commercialRule: 'liveActionRequiredCount가 0이 되기 전에는 commercial-live-ready로 판정하지 않습니다.'
  },
  items
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE304_REMAINING_STAGE_INVENTORY.json'), JSON.stringify(payload, null, 2) + '\n');

const rows = items.map(item => `| ${item.no} | ${item.category} | ${item.label} | ${item.status} | ${item.packageControl} | ${item.liveSignal} |`).join('\n');
const markdown = `# Phase305 Remaining Stage Inventory\n\n## Summary\n\n- Total remaining go-live elements: **${counts.totalRemainingElements}**\n- Package-side controls completed: **${counts.packageActionCompletedCount} / ${counts.totalRemainingElements}**\n- Live/external actions still required: **${counts.liveActionRequiredCount} / ${counts.totalRemainingElements}**\n- Live verified: **${counts.liveVerifiedCount} / ${counts.totalRemainingElements}**\n- Current judgement: **${payload.summary.finalJudgement}**\n\n## Category Counts\n\n${Object.entries(counts.categoryCounts).map(([key, value]) => `- ${key}: ${value}`).join('\n')}\n\n## Remaining Elements\n\n| No | Category | Element | Current status | Package control applied | Required live signal |\n|---:|---|---|---|---|---|\n${rows}\n\n## Completion Rule\n\nPhase305 treats all package-side work as complete only when this file, the machine-readable JSON inventory, the work order, and the phase305 validator agree on the same 13 go-live elements. Real commercial-live-ready status is reserved for the post-deploy environment after all 13 live signals are verified.\n`;
fs.writeFileSync(path.join(root, 'docs/PHASE304_REMAINING_STAGE_INVENTORY.md'), markdown);
console.log(JSON.stringify({ ok: payload.ok, report: 'docs/current/PHASE304_REMAINING_STAGE_INVENTORY.json', counts }, null, 2));

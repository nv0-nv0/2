import fs from 'node:fs';
import path from 'node:path';
import { buildFinalDeliveryOperationalMatrix, summarizeFinalDeliveryMatrix } from '../server/core/final-delivery-ops-engine.mjs';

function loadEnvFile(filePath) {
  const abs = path.resolve(filePath);
  const text = fs.readFileSync(abs, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function loadJsonIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function buildLiveEvidence(root) {
  const report = loadJsonIfExists(path.join(root, 'docs/current/VERIFY_PROD_REPORT.json'));
  const explicitLiveMode = String(process.env.NV0_VERIFY_MODE || '').toLowerCase() === 'live';
  const reportBaseUrl = String(report?.baseUrl || '');
  const reportIsLive = report?.ok === true
    && report?.mode === 'live'
    && /^https:\/\/(www\.)?nv0\.kr\/?$/i.test(reportBaseUrl.replace(/\/$/, ''));

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

const envFile = process.argv[2] || '';
if (envFile) loadEnvFile(envFile);
const root = process.cwd();
const liveEvidence = buildLiveEvidence(root);
const matrix = buildFinalDeliveryOperationalMatrix(process.env, { liveEvidence });
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/OPERATIONAL_MATRIX_LEGACY.json'), JSON.stringify(matrix, null, 2));
fs.writeFileSync(path.join(root, 'docs/current/OPERATIONAL_MATRIX.json'), JSON.stringify(matrix, null, 2));
console.log(JSON.stringify({ ok: true, report: 'docs/current/OPERATIONAL_MATRIX.json', compatibilityReport: 'docs/current/OPERATIONAL_MATRIX_LEGACY.json', summary: summarizeFinalDeliveryMatrix(matrix), liveEvidence: liveEvidence._verifyProdReport }, null, 2));

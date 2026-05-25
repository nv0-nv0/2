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

const envFile = process.argv[2] || '';
if (envFile) loadEnvFile(envFile);
const matrix = buildFinalDeliveryOperationalMatrix(process.env);
const root = process.cwd();
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE299_OPERATIONAL_MATRIX.json'), JSON.stringify(matrix, null, 2));
console.log(JSON.stringify({ ok: true, report: 'docs/current/PHASE299_OPERATIONAL_MATRIX.json', summary: summarizeFinalDeliveryMatrix(matrix) }, null, 2));

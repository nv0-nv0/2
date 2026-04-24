import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const PACKAGE_PATH = path.join(ROOT, 'package.json');
const serverText = await fs.readFile(path.join(ROOT, 'server', 'index.mjs'), 'utf8');
const pkg = JSON.parse(await fs.readFile(PACKAGE_PATH, 'utf8'));
const routeMatches = [...serverText.matchAll(/pathname === '([^']+)'/g)].map(m => m[1]);
const uniqueRoutes = [...new Set(routeMatches)].sort();
const manifest = {
  generatedAt: new Date().toISOString(),
  name: pkg.name,
  version: pkg.version,
  scripts: Object.keys(pkg.scripts),
  routeCount: uniqueRoutes.length,
  routeHash: crypto.createHash('sha256').update(uniqueRoutes.join(String.fromCharCode(10))).digest('hex'),
  runtimeStore: 'runtime/data/db.json',
  sessionStore: 'runtime/data/sessions.json',
  releaseReadiness: {
    localPackage: '실제 확인 완료',
    productionServer: '동작 확인 필요',
    productionDomain: '동작 확인 필요',
    externalIntegrations: '동작 확인 필요'
  }
};
await fs.writeFile(path.join(DOCS_DIR, 'RELEASE_MANIFEST_20260423.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));

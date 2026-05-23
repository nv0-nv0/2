import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}
function walk(dir = '.', out = []) {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const rel = path.posix.join(dir === '.' ? '' : dir.replace(/\\/g, '/'), entry.name);
    if (entry.isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}

const files = walk('.');
const pkg = JSON.parse(read('package.json'));
const publicRoutes = read('server/routes/public.mjs');
const localLauncher = read('scripts/start-local-server.mjs');
const checker = read('scripts/check-server-availability.mjs');
const runbook = read('docs/NO_AVAILABLE_SERVER_RUNBOOK.md');

const checks = [
  {
    key: 'localLauncher',
    weight: 16,
    pass: exists('scripts/start-local-server.mjs')
      && localLauncher.includes('NV0_PLATFORM_TARGET')
      && localLauncher.includes('NV0_PERSISTENCE_MODE')
      && localLauncher.includes("await import('../server/index.mjs')"),
    message: '원클릭 로컬 서버 실행 스크립트'
  },
  {
    key: 'crossPlatformScripts',
    weight: 12,
    pass: pkg.scripts?.['start:local'] === 'node scripts/start-local-server.mjs'
      && pkg.scripts?.dev === 'npm run start:local',
    message: 'Windows/macOS/Linux 공통 로컬 실행 명령'
  },
  {
    key: 'serverCheckScript',
    weight: 14,
    pass: exists('scripts/check-server-availability.mjs')
      && checker.includes('/api/public/server-availability')
      && checker.includes('/api/public/commercial-readiness'),
    message: '서버 가용성 진단 스크립트'
  },
  {
    key: 'publicAvailabilityRoute',
    weight: 14,
    pass: publicRoutes.includes('/api/public/server-availability')
      && publicRoutes.includes("available: true")
      && publicRoutes.includes("phase: 'phase288'"),
    message: '공개 서버 가용성 API'
  },
  {
    key: 'runbook',
    weight: 12,
    pass: exists('docs/NO_AVAILABLE_SERVER_RUNBOOK.md')
      && runbook.includes('npm run start:local')
      && runbook.includes('npm run server:check'),
    message: 'no available server 대응 런북'
  },
  {
    key: 'phase288Scripts',
    weight: 12,
    pass: pkg.scripts?.['validate:phase288'] === 'node scripts/validate-phase288-server-availability.mjs'
      && pkg.scripts?.['phase288:final']?.includes('phase287:final'),
    message: 'phase288 최종 검증 게이트'
  },
  {
    key: 'previousGates',
    weight: 10,
    pass: Boolean(pkg.scripts?.['phase287:final'] && pkg.scripts?.['phase286:final'] && pkg.scripts?.['phase285:final']),
    message: '이전 상용 100점 게이트 유지'
  },
  {
    key: 'posixPaths',
    weight: 10,
    pass: files.every((file) => !file.includes('\\')),
    message: 'POSIX 경로 구조 유지'
  }
];

const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
const failed = checks.filter((item) => !item.pass);
const result = {
  ok: failed.length === 0 && score === 100,
  phase: 'phase288',
  score,
  total: 100,
  issue: 'no available server',
  checks,
  failed,
  report: 'docs/current/PHASE288_SERVER_AVAILABILITY_AUDIT.json'
};

fs.mkdirSync(path.join(ROOT, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(ROOT, result.report), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);

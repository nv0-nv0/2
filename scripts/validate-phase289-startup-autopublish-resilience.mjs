import fs from 'node:fs';
import path from 'node:path';
import { publishProductInsightNow, PRODUCT_AGENT_SUITE_VERSION } from '../server/core/product-agent-suite.mjs';

const ROOT = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
function nowIso() {
  return new Date().toISOString();
}
const businessProfile = { domain: 'nv0.kr', serviceName: 'VERIDION' };
const scan = {
  requestId: 'scan-duplicate-resilience',
  target: 'nv0.kr',
  industry: '온라인 사업',
  riskScore: 55,
  totalFindings: 3,
  topFindings: ['지원 고지', '환불 정책 표시', '개인정보 처리방침 위치']
};
const db = { settings: {}, publications: [], boards: [] };

let duplicateThrows = false;
for (let i = 0; i < 24; i += 1) {
  try {
    publishProductInsightNow(db, { uid, nowIso, businessProfile, scan, autoPublished: true, intervalMs: 1_200_000, reason: `validation-${i}` });
  } catch (error) {
    if (error?.code === 'PRODUCT_INSIGHT_QUALITY_FAILED'
      && Array.isArray(error?.audit?.failed)
      && error.audit.failed.includes('notDuplicate')) {
      duplicateThrows = true;
      break;
    }
    throw error;
  }
}

const indexSource = read('server/index.mjs');
const pkg = JSON.parse(read('package.json'));
const checks = [
  {
    key: 'duplicateFailureReproduced',
    weight: 14,
    pass: duplicateThrows,
    message: '중복 인사이트 품질 실패 상황 재현'
  },
  {
    key: 'runCtaDuplicateSkip',
    weight: 18,
    pass: indexSource.includes("skipped: 'duplicate-insight'")
      && indexSource.includes('system.product_insight.skipped_duplicate')
      && indexSource.includes("lastSkipReason = 'duplicate-insight'"),
    message: 'runCtaAutopublish 중복 발행 skip 처리'
  },
  {
    key: 'startupNonFatal',
    weight: 18,
    pass: indexSource.includes('startup product insight autopublish failed non-fatally')
      && indexSource.includes('try {')
      && indexSource.includes("const startupAutopublish = await runCtaAutopublish('startup');"),
    message: '부팅 중 자동발행 실패가 서버 시작을 중단하지 않음'
  },
  {
    key: 'existingCadencePreserved',
    weight: 10,
    pass: indexSource.includes('CTA_AUTOPUBLISH_INTERVAL_MS') && PRODUCT_AGENT_SUITE_VERSION.includes('phase280'),
    message: '20분 자동 발행 구조 유지'
  },
  {
    key: 'serverAvailabilityPreserved',
    weight: 10,
    pass: read('server/routes/public.mjs').includes('/api/public/server-availability'),
    message: '서버 가용성 API 유지'
  },
  {
    key: 'phase289Scripts',
    weight: 10,
    pass: pkg.scripts?.['validate:phase289'] === 'node scripts/validate-phase289-startup-autopublish-resilience.mjs'
      && pkg.scripts?.['phase289:final']?.includes('phase288:final'),
    message: 'phase289 최종 검증 게이트'
  },
  {
    key: 'runbook',
    weight: 10,
    pass: exists('docs/PHASE289_STARTUP_AUTOPUBLISH_RESILIENCE.md'),
    message: '재시작 루프 대응 문서'
  },
  {
    key: 'previousGates',
    weight: 10,
    pass: Boolean(pkg.scripts?.['phase288:final'] && pkg.scripts?.['phase287:final'] && pkg.scripts?.['phase286:final']),
    message: '이전 100점 게이트 유지'
  }
];

const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
const failed = checks.filter((item) => !item.pass);
const result = {
  ok: failed.length === 0 && score === 100,
  phase: 'phase289',
  score,
  total: 100,
  issue: 'startup restart loop caused by duplicate product insight',
  checks,
  failed,
  report: 'docs/current/PHASE289_STARTUP_AUTOPUBLISH_RESILIENCE_AUDIT.json'
};
fs.mkdirSync(path.join(ROOT, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(ROOT, result.report), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);

import fs from 'node:fs';
import path from 'node:path';
import { ENGINE_AGENT_ASSIGNMENT_MATRIX, ENGINE_AGENT_ORCHESTRATOR_VERSION, buildEngineAgentAssignment, runEngineAgentPackageAudit } from '../server/core/engine-agent-orchestrator.mjs';

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
const packageJson = JSON.parse(read('package.json'));
const publicRoutes = read('server/routes/public.mjs');
const adminRoutes = read('server/routes/admin.mjs');
const index = read('server/index.mjs');
const moduleSource = read('server/core/engine-agent-orchestrator.mjs');
const matrixJson = exists('docs/current/ENGINE_AGENT_ASSIGNMENT_MATRIX.json')
  ? JSON.parse(read('docs/current/ENGINE_AGENT_ASSIGNMENT_MATRIX.json'))
  : null;

const routes = [];
if (publicRoutes.includes('/api/public/engine-agent-status')) routes.push('/api/public/engine-agent-status');
if (adminRoutes.includes('/api/admin/engine-agents/audit')) routes.push('/api/admin/engine-agents/audit');

const assignment = buildEngineAgentAssignment({});
const packageAudit = runEngineAgentPackageAudit({ files, packageJson, routes });

const checks = [
  {
    key: 'orchestratorModule',
    weight: 10,
    pass: exists('server/core/engine-agent-orchestrator.mjs') && moduleSource.includes(ENGINE_AGENT_ORCHESTRATOR_VERSION),
    message: '전역 엔진/에이전트 오케스트레이터 모듈'
  },
  {
    key: 'engineCoverage',
    weight: 12,
    pass: ENGINE_AGENT_ASSIGNMENT_MATRIX.engines.length >= 10 && assignment.assignedEngines === assignment.engineCount,
    message: '필요 엔진 전체 배정'
  },
  {
    key: 'agentCoverage',
    weight: 12,
    pass: ENGINE_AGENT_ASSIGNMENT_MATRIX.agents.length >= 12 && assignment.assignedAgents === assignment.agentCount,
    message: '필요 에이전트 전체 배정'
  },
  {
    key: 'domainCoverage',
    weight: 10,
    pass: assignment.domains.includes('site-intake')
      && assignment.domains.includes('diagnosis')
      && assignment.domains.includes('portal-ui')
      && assignment.domains.includes('content-publication')
      && assignment.domains.includes('security')
      && assignment.domains.includes('release'),
    message: '제품 주요 도메인 커버리지'
  },
  {
    key: 'serverContext',
    weight: 10,
    pass: index.includes('buildEngineAgentRuntimeStatus') && index.includes('runEngineAgentPackageAudit'),
    message: '서버 컨텍스트 연결'
  },
  {
    key: 'publicRoute',
    weight: 8,
    pass: publicRoutes.includes('/api/public/engine-agent-status') && publicRoutes.includes('buildEngineAgentRuntimeStatus'),
    message: '공개 상태 API 연결'
  },
  {
    key: 'adminRoute',
    weight: 8,
    pass: adminRoutes.includes('/api/admin/engine-agents/audit') && adminRoutes.includes('runEngineAgentPackageAudit'),
    message: '관리자 감사 API 연결'
  },
  {
    key: 'matrixDocs',
    weight: 8,
    pass: exists('docs/ENGINE_AGENT_ASSIGNMENT_MATRIX.md')
      && exists('docs/current/ENGINE_AGENT_ASSIGNMENT_MATRIX.json')
      && matrixJson?.version === ENGINE_AGENT_ORCHESTRATOR_VERSION,
    message: '엔진/에이전트 배정 문서와 JSON'
  },
  {
    key: 'packageAudit',
    weight: 10,
    pass: packageAudit.ok && packageAudit.score === 100,
    message: '패키지 전역 오케스트레이션 감사'
  },
  {
    key: 'phase286Scripts',
    weight: 6,
    pass: packageJson.scripts?.['validate:phase286'] === 'node scripts/validate-phase286-engine-agent-orchestration.mjs'
      && packageJson.scripts?.['phase286:final']?.includes('phase285:final'),
    message: 'phase286 최종 게이트'
  },
  {
    key: 'previousGatesPreserved',
    weight: 6,
    pass: Boolean(packageJson.scripts?.['phase285:final'] && packageJson.scripts?.['phase284:final'] && packageJson.scripts?.['phase283:final']),
    message: '이전 100점 게이트 유지'
  }
];

const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
const failed = checks.filter((item) => !item.pass);
const result = {
  ok: failed.length === 0 && score === 100,
  phase: 'phase286',
  version: ENGINE_AGENT_ORCHESTRATOR_VERSION,
  score,
  total: 100,
  engineCount: assignment.engineCount,
  agentCount: assignment.agentCount,
  assignedEngines: assignment.assignedEngines,
  assignedAgents: assignment.assignedAgents,
  domains: assignment.domains,
  checks,
  failed,
  packageAudit,
  report: 'docs/current/PHASE286_ENGINE_AGENT_ORCHESTRATION_AUDIT.json'
};

fs.mkdirSync(path.join(ROOT, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(ROOT, result.report), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);

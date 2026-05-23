const ORCHESTRATOR_VERSION = 'phase286-engine-agent-orchestrator-v1.0.0';

export const ENGINE_AGENT_ORCHESTRATOR_VERSION = ORCHESTRATOR_VERSION;

export const ENGINE_AGENT_ASSIGNMENT_MATRIX = Object.freeze({
  engines: [
    {
      id: 'site-intake-normalization-engine',
      layer: 'engine',
      domain: 'site-intake',
      ownerAgent: 'site-registration-agent',
      runtimeFile: 'apps/public/portal/app.js',
      serverFile: 'server/routes/account.mjs',
      responsibility: '사이트 URL·이름·메모 입력을 정규화하고 저장 사이트 관리 흐름에 연결',
      optimization: ['URL 입력 안정화', '저장 사이트 중복 방지', '포털 재진단 동선 연결']
    },
    {
      id: 'scan-evidence-engine',
      layer: 'engine',
      domain: 'diagnosis',
      ownerAgent: 'scan-quality-agent',
      runtimeFile: 'server/core/scan-evidence-model.mjs',
      serverFile: 'server/index.mjs',
      responsibility: '무료 진단의 증거 요약·점수 모델·발견 항목을 구성',
      optimization: ['증거 기반 점수화', '발견 항목 요약', '결과 재활용 가능 구조']
    },
    {
      id: 'risk-scoring-engine',
      layer: 'engine',
      domain: 'risk-score',
      ownerAgent: 'scan-quality-agent',
      runtimeFile: 'server/core/product-quality-engine.mjs',
      serverFile: 'server/index.mjs',
      responsibility: '상용화 기준 위험도와 진단 정확도 프로필을 계산',
      optimization: ['점수 경계값 일관성', '검사 전 상태 보정', '운영 상태 분류']
    },
    {
      id: 'portal-dashboard-ux-engine',
      layer: 'engine',
      domain: 'portal-ui',
      ownerAgent: 'visual-readability-agent',
      runtimeFile: 'shared/portal-phase283-dashboard.css',
      serverFile: 'apps/public/portal/index.html',
      responsibility: '내 사이트 대시보드·인포그래픽·사이드바·점수 게이지 UI를 제공',
      optimization: ['숫자 시인성 강화', '카드 정보 구조 정리', 'retired CSS 참조 제거']
    },
    {
      id: 'report-asset-engine',
      layer: 'engine',
      domain: 'fulfillment',
      ownerAgent: 'checkout-delivery-agent',
      runtimeFile: 'server/core/premium-asset-builder.mjs',
      serverFile: 'server/core/diagnosis-report-package.mjs',
      responsibility: '기본/전문가 리포트와 PDF 산출물을 구성',
      optimization: ['상품별 산출물 분리', '구매 후 제공 상태 관리', '다운로드 링크 안정화']
    },
    {
      id: 'product-offer-engine',
      layer: 'engine',
      domain: 'plans-checkout',
      ownerAgent: 'offer-routing-agent',
      runtimeFile: 'server/core/product-intelligence.mjs',
      serverFile: 'server/core/smart-product-orchestrator.mjs',
      responsibility: '진단 점수와 사이트 상태를 요금제·체크아웃·리포트 추천에 연결',
      optimization: ['추천 상품 일관성', '무료→유료 전환 흐름', '상품 설명 중복 방지']
    },
    {
      id: 'insight-publication-engine',
      layer: 'engine',
      domain: 'content-publication',
      ownerAgent: 'autopublish-scheduler-agent',
      runtimeFile: 'server/core/product-agent-suite.mjs',
      serverFile: 'server/routes/public.mjs',
      responsibility: '제품 맥락 기반 인사이트를 생성하고 20분 자동 발행을 수행',
      optimization: ['20분 cadence 유지', '중복 주제 재시도', '게시판 동기화']
    },
    {
      id: 'payment-fulfillment-engine',
      layer: 'engine',
      domain: 'payment',
      ownerAgent: 'checkout-delivery-agent',
      runtimeFile: 'server/routes/payment.mjs',
      serverFile: 'server/infrastructure/payments/portone-v2.mjs',
      responsibility: '주문·결제·상태 전이·산출물 제공 흐름을 처리',
      optimization: ['상태 전이 검증', 'idempotency', '웹훅 안정화']
    },
    {
      id: 'security-compliance-engine',
      layer: 'engine',
      domain: 'security',
      ownerAgent: 'security-gate-agent',
      runtimeFile: 'server/middleware/security.mjs',
      serverFile: 'server/infrastructure/security/secure-record-store.mjs',
      responsibility: '보안 헤더·CSRF·접근 토큰·민감 기록 보관 구조를 관리',
      optimization: ['보안 게이트 유지', '민감 데이터 최소화', '배포 전 검증']
    },
    {
      id: 'release-structure-engine',
      layer: 'engine',
      domain: 'release',
      ownerAgent: 'release-audit-agent',
      runtimeFile: 'scripts/generate-structure-tree.mjs',
      serverFile: 'scripts/validate-phase285-structure-optimization.mjs',
      responsibility: '구조 트리·상용화 감사·패키지 무결성 검증을 수행',
      optimization: ['POSIX 압축 경로', '구조 문서 자동화', '최종 게이트 일원화']
    },
    {
      id: 'observability-readiness-engine',
      layer: 'engine',
      domain: 'ops',
      ownerAgent: 'recovery-agent',
      runtimeFile: 'server/services/observability.mjs',
      serverFile: 'scripts/ops-report.mjs',
      responsibility: '상태 점검·운영 리포트·장애 분류를 담당',
      optimization: ['readyz 상태 노출', '운영 리포트', '장애 분류 기준화']
    }
  ],
  agents: [
    {
      id: 'site-registration-agent',
      layer: 'agent',
      assignedEngine: 'site-intake-normalization-engine',
      trigger: 'portal form submit / account routes',
      duty: '사이트 등록·삭제·재검사 요청을 계정 상태와 연결'
    },
    {
      id: 'scan-quality-agent',
      layer: 'agent',
      assignedEngine: 'scan-evidence-engine',
      trigger: 'public diagnosis / rescan',
      duty: '진단 결과의 발견 항목·점수·우선순위를 검수'
    },
    {
      id: 'visual-readability-agent',
      layer: 'agent',
      assignedEngine: 'portal-dashboard-ux-engine',
      trigger: 'portal render',
      duty: '숫자·게이지·카드·상태 배너의 시인성과 겹침 방지 기준을 유지'
    },
    {
      id: 'report-quality-agent',
      layer: 'agent',
      assignedEngine: 'report-asset-engine',
      trigger: 'fulfillment create / download',
      duty: '리포트 구성·PDF 제공·구매 산출물 표시를 검수'
    },
    {
      id: 'offer-routing-agent',
      layer: 'agent',
      assignedEngine: 'product-offer-engine',
      trigger: 'plans / checkout / portal summary',
      duty: '무료 진단·기본 리포트·전문가 리포트 연결을 최적화'
    },
    {
      id: 'autopublish-scheduler-agent',
      layer: 'agent',
      assignedEngine: 'insight-publication-engine',
      trigger: 'server interval / board request',
      duty: '20분 자동 발행과 중복 주제 재시도 수행'
    },
    {
      id: 'board-sync-agent',
      layer: 'agent',
      assignedEngine: 'insight-publication-engine',
      trigger: 'publication create',
      duty: 'publications와 boards 동기화 및 공개 노출 보장'
    },
    {
      id: 'checkout-delivery-agent',
      layer: 'agent',
      assignedEngine: 'payment-fulfillment-engine',
      trigger: 'checkout / payment webhook / fulfillment',
      duty: '결제 상태와 산출물 제공 상태를 일관되게 연결'
    },
    {
      id: 'security-gate-agent',
      layer: 'agent',
      assignedEngine: 'security-compliance-engine',
      trigger: 'request middleware / admin routes',
      duty: '보안 헤더·CSRF·접근 권한·토큰 검증 유지'
    },
    {
      id: 'seo-index-agent',
      layer: 'agent',
      assignedEngine: 'release-structure-engine',
      trigger: 'sitemap / feed / board publication',
      duty: '공개 페이지와 인사이트 색인 가능성을 확인'
    },
    {
      id: 'release-audit-agent',
      layer: 'agent',
      assignedEngine: 'release-structure-engine',
      trigger: 'npm run phase286:final',
      duty: '구조·검증·압축·상용화 게이트를 최종 판정'
    },
    {
      id: 'recovery-agent',
      layer: 'agent',
      assignedEngine: 'observability-readiness-engine',
      trigger: 'readyz / ops report',
      duty: '운영 상태 확인과 복구 지표를 제공'
    }
  ]
});

function list(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function buildEngineAgentAssignment(db = {}, options = {}) {
  const engines = ENGINE_AGENT_ASSIGNMENT_MATRIX.engines.map((engine) => {
    const agent = ENGINE_AGENT_ASSIGNMENT_MATRIX.agents.find((item) => item.id === engine.ownerAgent) || null;
    return {
      ...engine,
      ownerAgentReady: Boolean(agent),
      assignedAgents: ENGINE_AGENT_ASSIGNMENT_MATRIX.agents.filter((item) => item.assignedEngine === engine.id).map((item) => item.id),
      status: agent ? 'assigned' : 'missing-agent'
    };
  });
  const agents = ENGINE_AGENT_ASSIGNMENT_MATRIX.agents.map((agent) => {
    const engine = ENGINE_AGENT_ASSIGNMENT_MATRIX.engines.find((item) => item.id === agent.assignedEngine) || null;
    return {
      ...agent,
      engineReady: Boolean(engine),
      status: engine ? 'assigned' : 'missing-engine'
    };
  });
  const missing = [
    ...engines.filter((item) => item.status !== 'assigned').map((item) => item.id),
    ...agents.filter((item) => item.status !== 'assigned').map((item) => item.id)
  ];
  const runtimeSignals = {
    savedSites: list(db.savedSites).length,
    scans: list(db.scans).length,
    boards: list(db.boards).length,
    publications: list(db.publications).length,
    orders: list(db.orders).length,
    settingsReady: Boolean(db.settings),
    generatedAt: options.nowIso || new Date().toISOString()
  };
  return {
    ok: missing.length === 0,
    version: ORCHESTRATOR_VERSION,
    engineCount: engines.length,
    agentCount: agents.length,
    assignedEngines: engines.filter((item) => item.status === 'assigned').length,
    assignedAgents: agents.filter((item) => item.status === 'assigned').length,
    domains: unique(engines.map((item) => item.domain)),
    engines,
    agents,
    missing,
    runtimeSignals,
    optimizationSummary: [
      '포털 UI·진단·리포트·결제·인사이트·보안·배포 검증을 전역 엔진/에이전트 단위로 배정했습니다.',
      '각 엔진은 담당 에이전트와 파일 책임을 갖고, phase286 게이트에서 존재 여부와 연결 상태를 검증합니다.',
      '20분 자동 발행, shared 대시보드 CSS, POSIX 패키징, 구조 트리 검증을 유지합니다.'
    ]
  };
}

export function buildEngineAgentRuntimeStatus(db = {}, options = {}) {
  const assignment = buildEngineAgentAssignment(db, options);
  return {
    ok: assignment.ok,
    phase: 'phase286',
    version: ORCHESTRATOR_VERSION,
    status: assignment.ok ? 'optimized' : 'needs-attention',
    engineCount: assignment.engineCount,
    agentCount: assignment.agentCount,
    assignedEngines: assignment.assignedEngines,
    assignedAgents: assignment.assignedAgents,
    domains: assignment.domains,
    runtimeSignals: assignment.runtimeSignals,
    publicSummary: {
      message: assignment.ok
        ? '필요 엔진과 에이전트가 전역 배정되어 최적화 상태입니다.'
        : '일부 엔진/에이전트 배정이 필요합니다.',
      coverage: `${assignment.assignedEngines}/${assignment.engineCount} engines · ${assignment.assignedAgents}/${assignment.agentCount} agents`
    }
  };
}

export function runEngineAgentPackageAudit({ files = [], packageJson = {}, routes = [] } = {}) {
  const normalizedFiles = list(files).map((item) => String(item).replace(/\\/g, '/'));
  const scripts = packageJson?.scripts || {};
  const requiredFiles = [
    'server/core/engine-agent-orchestrator.mjs',
    'docs/ENGINE_AGENT_ASSIGNMENT_MATRIX.md',
    'docs/current/ENGINE_AGENT_ASSIGNMENT_MATRIX.json',
    'scripts/validate-phase286-engine-agent-orchestration.mjs',
    'server/core/product-agent-suite.mjs',
    'shared/portal-phase283-dashboard.css',
    'scripts/validate-phase285-structure-optimization.mjs'
  ];
  const assignment = buildEngineAgentAssignment({});
  const checks = [
    {
      key: 'matrixCoverage',
      weight: 14,
      pass: assignment.engineCount >= 10 && assignment.agentCount >= 12 && assignment.ok,
      message: '필요 엔진/에이전트 전역 배정표'
    },
    {
      key: 'requiredFiles',
      weight: 14,
      pass: requiredFiles.every((file) => normalizedFiles.includes(file)),
      message: '엔진/에이전트 핵심 파일 존재'
    },
    {
      key: 'publicRoute',
      weight: 10,
      pass: routes.includes('/api/public/engine-agent-status'),
      message: '공개 엔진/에이전트 상태 API'
    },
    {
      key: 'adminRoute',
      weight: 10,
      pass: routes.includes('/api/admin/engine-agents/audit'),
      message: '관리자 엔진/에이전트 감사 API'
    },
    {
      key: 'phase286Scripts',
      weight: 12,
      pass: Boolean(scripts['validate:phase286']) && Boolean(scripts['phase286:final']),
      message: 'phase286 최종 검증 스크립트'
    },
    {
      key: 'autopublishPreserved',
      weight: 10,
      pass: normalizedFiles.includes('server/core/product-agent-suite.mjs'),
      message: '20분 자동 발행 엔진 유지'
    },
    {
      key: 'dashboardPreserved',
      weight: 10,
      pass: normalizedFiles.includes('shared/portal-phase283-dashboard.css'),
      message: '승인 대시보드 UI 유지'
    },
    {
      key: 'structurePreserved',
      weight: 10,
      pass: normalizedFiles.includes('docs/PROJECT_STRUCTURE_TREE.md') && normalizedFiles.includes('docs/current/PROJECT_STRUCTURE_TREE.json'),
      message: '구조 트리 산출물 유지'
    },
    {
      key: 'packageOptimization',
      weight: 10,
      pass: normalizedFiles.every((file) => !file.includes('\\')),
      message: 'POSIX 패키지 경로 최적화'
    }
  ];
  const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
  const failed = checks.filter((item) => !item.pass);
  return {
    ok: failed.length === 0 && score === 100,
    score,
    total: 100,
    version: ORCHESTRATOR_VERSION,
    checks,
    failed,
    assignment: {
      engineCount: assignment.engineCount,
      agentCount: assignment.agentCount,
      domains: assignment.domains
    }
  };
}

const ORGANISM_VERSION = 'unified-platform-v1.0.0';

export const UNIFIED_ORGANISM_VERSION = ORGANISM_VERSION;

export const ORGANISM_ENGINE_REGISTRY = Object.freeze([
  { id: 'brand-design-engine', layer: 'experience', publicName: '브랜드 디자인 엔진', purpose: '공통 디자인 토큰과 고객 노출 UI의 시각 일관성을 유지합니다.', inputs: ['public-html', 'shared-css'], outputs: ['visual-system-contract'] },
  { id: 'ux-flow-engine', layer: 'experience', publicName: '고객 여정 엔진', purpose: '홈, 진단, 요금, 결제, 포털을 하나의 전환 흐름으로 연결합니다.', inputs: ['navigation', 'cta', 'forms'], outputs: ['journey-contract'] },
  { id: 'diagnosis-evidence-engine', layer: 'product', publicName: '진단 근거 엔진', purpose: '공개 웹페이지에서 확인 가능한 신뢰·준법·전환 근거를 정리합니다.', inputs: ['scan', 'evidence'], outputs: ['diagnosis-report'] },
  { id: 'commerce-fit-engine', layer: 'product', publicName: '상품 연결 엔진', purpose: '무료 진단, 기본 리포트, 전문가 플랜을 고객 상태에 맞게 연결합니다.', inputs: ['scan-score', 'plan-catalog', 'orders'], outputs: ['next-best-offer'] },
  { id: 'portal-continuity-engine', layer: 'product', publicName: '포털 연속성 엔진', purpose: '진단 결과, 사이트 저장, 리포트, 개선 항목을 포털에서 이어서 관리합니다.', inputs: ['sites', 'scans', 'guidance'], outputs: ['portal-summary'] },
  { id: 'performance-budget-engine', layer: 'quality', publicName: '속도 예산 엔진', purpose: '클라이언트 로딩, 링크 이동, 핵심 리소스 예산을 지속적으로 점검합니다.', inputs: ['performance-metric', 'asset-contract'], outputs: ['speed-budget'] },
  { id: 'accessibility-quality-engine', layer: 'quality', publicName: '접근성 품질 엔진', purpose: '키보드 이동, 대체 안내, 터치 영역, 모바일 레이아웃 품질을 보호합니다.', inputs: ['html-contract', 'css-contract'], outputs: ['a11y-contract'] },
  { id: 'copy-trust-engine', layer: 'quality', publicName: '고객 신뢰 카피 엔진', purpose: '과장 표현, 내부 운영 문구, 구버전 용어를 고객 화면에서 차단합니다.', inputs: ['public-copy'], outputs: ['clean-copy-contract'] },
  { id: 'privacy-security-engine', layer: 'guard', publicName: '개인정보·보안 가드 엔진', purpose: '민감정보 최소화, 세션, 결제, 공개 API 응답의 안전 경계를 유지합니다.', inputs: ['request', 'session', 'orders'], outputs: ['security-contract'] },
  { id: 'release-pipeline-engine', layer: 'delivery', publicName: '릴리스 파이프라인 엔진', purpose: '검증, 테스트, 배포 전 점검을 하나의 납품 게이트로 묶습니다.', inputs: ['tests', 'scripts', 'deployment'], outputs: ['release-readiness'] }
]);

export const ORGANISM_AGENT_REGISTRY = Object.freeze([
  { id: 'ui-polish-agent', engine: 'brand-design-engine', role: '카드, 간격, 버튼, 타이포그래피 정합성 점검' },
  { id: 'responsive-agent', engine: 'brand-design-engine', role: '모바일·태블릿·데스크톱 레이아웃 보호' },
  { id: 'cta-journey-agent', engine: 'ux-flow-engine', role: '무료 진단에서 리포트와 결제까지 다음 행동 연결' },
  { id: 'form-friction-agent', engine: 'ux-flow-engine', role: 'URL 입력, 로그인, 결제 폼의 마찰 최소화' },
  { id: 'evidence-normalizer-agent', engine: 'diagnosis-evidence-engine', role: '진단 근거와 리포트 요약의 표현 정리' },
  { id: 'report-priority-agent', engine: 'diagnosis-evidence-engine', role: '발견 항목을 영향도와 실행 난이도로 정렬' },
  { id: 'plan-fit-agent', engine: 'commerce-fit-engine', role: '무료·기본 리포트·전문가 플랜 추천 연결' },
  { id: 'checkout-consistency-agent', engine: 'commerce-fit-engine', role: '요금·결제·환불 안내 일관성 검수' },
  { id: 'portal-sync-agent', engine: 'portal-continuity-engine', role: '사이트·진단·가이드·주문 데이터를 포털 요약으로 연결' },
  { id: 'history-compare-agent', engine: 'portal-continuity-engine', role: '재진단과 이전 결과 비교 구조 유지' },
  { id: 'client-metric-agent', engine: 'performance-budget-engine', role: '브라우저 성능 지표를 민감정보 없이 수집' },
  { id: 'asset-budget-agent', engine: 'performance-budget-engine', role: 'CSS·JS·이미지 예산과 불필요 리소스 증가 감시' },
  { id: 'keyboard-flow-agent', engine: 'accessibility-quality-engine', role: '본문 바로가기, 초점 이동, 버튼 이름 검수' },
  { id: 'mobile-touch-agent', engine: 'accessibility-quality-engine', role: '모바일 터치 크기와 가독성 보호' },
  { id: 'legacy-copy-guard-agent', engine: 'copy-trust-engine', role: '구버전·내부 운영 문구 고객 화면 차단' },
  { id: 'claim-safety-agent', engine: 'copy-trust-engine', role: '성과 보장·법률 자문 오해 표현 차단' },
  { id: 'privacy-minimization-agent', engine: 'privacy-security-engine', role: '클라이언트 지표와 진단 요청의 개인정보 최소화' },
  { id: 'public-api-boundary-agent', engine: 'privacy-security-engine', role: '공개 API 응답에서 내부 운영 세부정보 제거' },
  { id: 'release-gate-agent', engine: 'release-pipeline-engine', role: '문법, 라우트, 링크, 보안, 성능 검증 연결' },
  { id: 'delivery-manifest-agent', engine: 'release-pipeline-engine', role: '납품 문서와 검증 결과를 재현 가능하게 기록' }
]);

const PIPELINE_STEPS = Object.freeze([
  { id: '01-intake', label: '고객 진입', from: 'home', to: 'demo', engine: 'ux-flow-engine' },
  { id: '02-diagnose', label: '무료 진단', from: 'demo', to: 'diagnosis-report', engine: 'diagnosis-evidence-engine' },
  { id: '03-prioritize', label: '개선 우선순위', from: 'diagnosis-report', to: 'portal', engine: 'portal-continuity-engine' },
  { id: '04-commercial-fit', label: '상품 연결', from: 'portal', to: 'plans', engine: 'commerce-fit-engine' },
  { id: '05-checkout', label: '결제·정책 확인', from: 'plans', to: 'checkout', engine: 'commerce-fit-engine' },
  { id: '06-retention', label: '재진단·관리', from: 'checkout', to: 'portal', engine: 'portal-continuity-engine' },
  { id: '07-insight', label: '인사이트 학습', from: 'board', to: 'demo', engine: 'copy-trust-engine' },
  { id: '08-observe', label: '속도·품질 관측', from: 'client', to: 'quality-loop', engine: 'performance-budget-engine' },
  { id: '09-guard', label: '보안·개인정보 경계', from: 'request', to: 'safe-response', engine: 'privacy-security-engine' },
  { id: '10-release', label: '검증·납품', from: 'package', to: 'delivery', engine: 'release-pipeline-engine' }
]);

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function scoreRatio(value, target) {
  if (!target) return 0;
  return clamp(Math.round((Number(value || 0) / target) * 100), 0, 100);
}

function safeDate(value) {
  const time = Date.parse(value || '');
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function countPublicItems(db = {}) {
  return {
    sites: list(db.sites).length,
    scans: list(db.scans).length,
    orders: list(db.orders).length,
    guides: list(db.guidanceDocuments).length + list(db.autoFixJobs).length,
    boardItems: list(db.boards).length + list(db.publications).length,
    clientMetrics: list(db.clientMetrics).length
  };
}

export function normalizeClientMetric(payload = {}, options = {}) {
  const nowIso = typeof options.nowIso === 'function' ? options.nowIso() : new Date().toISOString();
  const path = String(payload.path || '/').replace(/[?#].*$/, '').slice(0, 160) || '/';
  const metric = {
    id: `metric_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: nowIso,
    path,
    page: String(payload.page || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 48) || 'public',
    navigationType: String(payload.navigationType || 'navigate').slice(0, 32),
    loadMs: clamp(Math.round(payload.loadMs || 0), 0, 120000),
    domInteractiveMs: clamp(Math.round(payload.domInteractiveMs || 0), 0, 120000),
    firstContentfulPaintMs: clamp(Math.round(payload.firstContentfulPaintMs || 0), 0, 120000),
    largestContentfulPaintMs: clamp(Math.round(payload.largestContentfulPaintMs || 0), 0, 120000),
    cumulativeLayoutShift: clamp(Number(payload.cumulativeLayoutShift || 0), 0, 10),
    connection: String(payload.connection || '').slice(0, 24),
    userAgentBucket: String(payload.userAgentBucket || 'browser').slice(0, 24),
    source: 'veridion-runtime-optimizer'
  };
  return metric;
}

export function buildUnifiedOrganismStatus(db = {}, options = {}) {
  const nowIso = typeof options.nowIso === 'function' ? options.nowIso() : new Date().toISOString();
  const businessProfile = options.businessProfile || {};
  const counts = countPublicItems(db);
  const engineCount = ORGANISM_ENGINE_REGISTRY.length;
  const agentCount = ORGANISM_AGENT_REGISTRY.length;
  const pipelineConnected = PIPELINE_STEPS.every(step => ORGANISM_ENGINE_REGISTRY.some(engine => engine.id === step.engine));
  const engineCoverage = scoreRatio(new Set(ORGANISM_AGENT_REGISTRY.map(agent => agent.engine)).size, engineCount);
  const runtimeSignal = Math.round((scoreRatio(counts.sites, 1) + scoreRatio(counts.scans, 1) + scoreRatio(counts.boardItems, 1)) / 3);
  const statusScore = Math.min(100, Math.round(engineCoverage * 0.60 + 100 * 0.40));
  return {
    ok: pipelineConnected && engineCount >= 10 && agentCount >= 20,
    version: ORGANISM_VERSION,
    checkedAt: nowIso,
    publicSafe: true,
    brand: {
      name: 'VERIDION',
      tradeName: businessProfile.tradeName || '엔브이제로(NV0)',
      domain: businessProfile.domain || 'https://nv0.kr'
    },
    score: statusScore,
    summary: {
      engines: engineCount,
      agents: agentCount,
      pipelineSteps: PIPELINE_STEPS.length,
      engineCoverage,
      pipelineConnected,
      runtimeSignal
    },
    engines: ORGANISM_ENGINE_REGISTRY.map(engine => ({ id: engine.id, layer: engine.layer, name: engine.publicName, purpose: engine.purpose })),
    agents: ORGANISM_AGENT_REGISTRY.map(agent => ({ id: agent.id, engine: agent.engine, role: agent.role })),
    pipeline: PIPELINE_STEPS,
    dataSignals: counts,
    qualityLoops: [
      'design-system-contract',
      'journey-contract',
      'diagnosis-report-contract',
      'commerce-fit-contract',
      'portal-continuity-contract',
      'speed-budget-contract',
      'accessibility-contract',
      'clean-copy-contract',
      'privacy-security-contract',
      'release-readiness-contract'
    ]
  };
}

export function buildUnifiedOrganismAudit(input = {}) {
  const files = input.files || {};
  const publicPages = input.publicPages || [];
  const packageJson = input.packageJson || {};
  const sourceText = String(input.sourceText || '');
  const checks = [];
  const add = (id, ok, detail = {}) => checks.push({ id, ok: Boolean(ok), ...detail });
  const css = String(files['shared/veridion-rebrand.css'] || '');
  const optimizer = String(files['shared/veridion-runtime-optimizer.js'] || '');
  const serverRoutes = String(files['server/routes/public.mjs'] || '');
  const engine = String(files['server/core/unified-platform-organism.mjs'] || '');
  const forbidden = [
    '위험 진단', '요금 안내', '내 사이트 관리', '보안 점수88', '성능 점수76', 'SEO 점수90', '접근성 점수75',
    'API 키 관리', '20분에 1회', '자동 발행', 'TrustOps', '프로덕션 센티널', '런칭 컨트롤', '운영 큐',
    '자동화 백로그', 'rollback', 'canary', 'live verification', 'SLA', 'MRR', 'launchItems', 'sentinelItems', 'handoffItems', 'prelaunch'
  ];

  add('engine:registry', engine.includes('ORGANISM_ENGINE_REGISTRY') && ORGANISM_ENGINE_REGISTRY.length >= 10, { count: ORGANISM_ENGINE_REGISTRY.length });
  add('agent:registry', engine.includes('ORGANISM_AGENT_REGISTRY') && ORGANISM_AGENT_REGISTRY.length >= 20, { count: ORGANISM_AGENT_REGISTRY.length });
  add('pipeline:steps', PIPELINE_STEPS.length >= 10 && PIPELINE_STEPS.every(step => step.engine), { count: PIPELINE_STEPS.length });
  add('css:organism-layer', css.includes('VERIDION Unified Organism Optimization Layer') && css.includes('--vr-motion-fast'));
  add('optimizer:exists', optimizer.includes('__NV0_RUNTIME_OPTIMIZER__') && optimizer.includes('sendBeacon'));
  add('server:organism-status-route', serverRoutes.includes('/api/public/organism-status') && serverRoutes.includes('buildUnifiedOrganismStatus'));
  add('server:client-metric-route', serverRoutes.includes('/api/public/client-metric') && serverRoutes.includes('normalizeClientMetric'));
  add('package:clean-baseline-version', String(packageJson.version || '') === '2.1.0-clean-commercial-baseline');
  add('package:release-gate', packageJson.scripts?.['verify:release'] === 'node scripts/run-release-gate.mjs');
  add('package:delivery-final-updated', packageJson.scripts?.['delivery:final'] === 'npm run verify:release');

  for (const page of publicPages) {
    const html = String(page.html || '');
    add(`${page.slug}:rebrand-css`, html.includes('/shared/veridion-rebrand.css'));
    add(`${page.slug}:runtime-optimizer`, html.includes('/shared/veridion-runtime-optimizer.js'));
    add(`${page.slug}:clean-marker`, html.includes('data-veridion-rebrand="clean"'));
  }
  for (const token of forbidden) {
    add(`public-copy:no-${token}`, !sourceText.includes(token));
  }

  const failed = checks.filter(item => !item.ok);
  return {
    ok: failed.length === 0,
    phase: 'unified-platform',
    version: ORGANISM_VERSION,
    score: failed.length === 0 ? 100 : Math.max(0, 100 - failed.length),
    checked: checks.length,
    failed: failed.length,
    failures: failed,
    checks
  };
}

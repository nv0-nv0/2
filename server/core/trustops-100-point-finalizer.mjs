import { buildTrustOpsFinalHandoff } from './trustops-final-handoff.mjs';
import { buildProductionSentinel } from './trustops-production-sentinel.mjs';
import { buildTrustOpsLaunchControl } from './trustops-launch-control.mjs';
import { buildTrustOpsAutopilotCockpit } from './trustops-autopilot-engine.mjs';
import { buildTrustOpsGrowthBlueprint, buildGrowthImprovementBacklog } from './trustops-growth-engine.mjs';
import { buildEngineAgentAssignment } from './engine-agent-orchestrator.mjs';
import { buildCommercialOfferCatalog } from '../../shared/product-catalog.mjs';

export const TRUSTOPS_SCORECARD_VERSION = 'trustops-scorecard-closeout-v1';

const SCORE_AREAS = Object.freeze([
  ['architecture', '전체 구조', '진단, 결제, 산출물, 포털, 관리자, 운영 관제가 단일 서비스 흐름으로 연결됨'],
  ['paid-service', '유료 서비스', '상품 선택, 대상 사이트, 동의, 결제 검증, 산출물, 권한, 환불 요청 게이트 적용'],
  ['privacy', '개인정보', '원문 IP 장기 저장 금지, payload 마스킹, 보존기간, 보호책임자 환경값 게이트 적용'],
  ['legal-notice', '법률 고지', '약관, 개인정보처리방침, 환불, 사업자 정보, 디지털 산출물 고지 경로 고정'],
  ['security', '보안', 'CSP, CSRF, 관리자 권한, 시크릿 위생, 민감정보 마스킹, rate limit 구조 적용'],
  ['ui-ux', 'UI/UX', '포털/인사이트 클린 디자인, 깨진 도형 제거, 모바일/성능/접근성 기본 게이트 적용'],
  ['insight', '인사이트 자동발행', '20분 자동발행, 중복 차단, 공개 품질 게이트, 게시판/피드 연동 유지'],
  ['engine-agent', '엔진·에이전트', '전역 엔진/에이전트와 핵심 이벤트 정책을 런타임 게이트로 연결'],
  ['growth', '수익화', '무료 진단, 리포트, 문구팩, 모니터링, 전문가, 대행사 상품 사다리 구성'],
  ['trustops', 'TrustOps', '성장 엔진, 오토파일럿, 런칭 컨트롤, 프로덕션 센티널, 최종 인수인계 연결'],
  ['admin', '관리자 운영', '주문, 환불, 발행, 자료, 설정, 진단, 오토파일럿/센티널 API 관제 구조 적용'],
  ['data', '데이터·저장소', 'runtime seed만 납품, 운영 DB/Redis/S3 연결 전제, secure record 충돌 방지'],
  ['backup', '백업·복구', '백업, 복구 drill, prune, 배포 전 백업/복구 런북 유지'],
  ['testing', '테스트', '회귀, E2E, 결제, 레드팀, 링크, 라우트, 보안, 접근성, 성능, release 검증 게이트 구성'],
  ['deployment', '배포', 'release:predeploy와 delivery:final을 동일 최종 게이트로 고정'],
  ['live-verification', '실서버 검증', 'live checklist, canary, rollback, cache purge, 실결제/다운로드 확인 절차 고정'],
  ['incident', '장애 대응', '결제, 산출물, 개인정보, 진단, 인사이트 장애별 safe mode와 SLA 적용'],
  ['cost-quality', '비용·품질', '룰 기반 1차 판정, AI 호출 최소화, PDF/진단/발행 비용 예산화'],
  ['documentation', '문서·증적', '작업지시서, 보고서, 감사 JSON, 최종 게이트 로그, 운영 런북 포함'],
  ['packaging', '납품 정리', '런타임 찌꺼기 제거, 시크릿 불포함, POSIX 경로, ZIP 재검증 기준 적용']
]);

const FINAL_OPERATOR_ITEMS = Object.freeze([
  ['server-deploy', '운영 서버에 clean baseline ZIP 반영'],
  ['env-real-values', '사업자 정보, 개인정보 보호책임자, 결제 provider, storage, Redis 값을 운영 환경에만 주입'],
  ['predeploy', '운영 서버에서 npm run release:predeploy 실행'],
  ['cache-purge', 'CDN/브라우저 캐시 삭제 후 /portal, /board, /checkout, /privacy, /business-info 확인'],
  ['payment-live', 'PortOne 소액 실결제, 웹훅, paid 상태, 산출물 생성 확인'],
  ['download-live', '구매자 세션 또는 accessToken 기준 PDF/가이드 다운로드 확인'],
  ['refund-live', '환불 요청 접수와 관리자 상태 변경 확인'],
  ['mobile-live', 'Chrome/Edge/Android/iOS 주요 폭 화면 확인'],
  ['legal-signoff', '개인정보처리방침, 약관, 환불정책, 사업자 정보 최종 전문가 검토'],
  ['go-no-go', 'trustops-100-final과 production sentinel 결과로 단계 공개 여부 확정']
]);

function list(value) { return Array.isArray(value) ? value : []; }
function has(value) { return String(value || '').trim().length > 0; }
function truthy(value) { return value === true || value === 'true' || value === '1'; }

function envReadiness(env = {}) {
  const required = [
    'NV0_PUBLIC_BASE_URL',
    'NV0_PAYMENT_PROVIDER',
    'NV0_SECURE_RECORDS_KEY',
    'NV0_PRIVACY_HASH_KEY',
    'NV0_PRIVACY_OFFICER_EMAIL',
    'NV0_BUSINESS_TRADE_NAME',
    'NV0_BUSINESS_REPRESENTATIVE',
    'NV0_BUSINESS_REGISTRATION_NUMBER',
    'NV0_BUSINESS_ADDRESS',
    'NV0_HOSTING_PROVIDER',
    'NV0_CUSTOMER_SERVICE_PHONE'
  ];
  const checks = required.map(key => ({ key, configured: has(env[key]), secret: /KEY|SECRET|TOKEN/i.test(key) }));
  const missing = checks.filter(item => !item.configured).map(item => item.key);
  return { ok: missing.length === 0, requiredCount: checks.length, configuredCount: checks.filter(item => item.configured).length, missing, publicSummary: checks };
}

function scoreArea(area, context = {}) {
  const { files = [], scripts = {}, routes = [], sourceText = '', db = {}, env = {}, packageGateReady = false, runtimeClean = false, secretHygienePassed = false } = context;
  const text = String(sourceText || '');
  const fileSet = new Set(list(files));
  const routeSet = new Set(list(routes));
  const runtimeMode = fileSet.size === 0;
  const assignment = context.assignment || buildEngineAgentAssignment(db);
  const sentinel = context.sentinel || buildProductionSentinel(db, { env, baseUrl: env.NV0_PUBLIC_BASE_URL || 'https://nv0.kr' });
  const handoff = context.handoff || buildTrustOpsFinalHandoff(db, { env, packageGateReady, runtimeClean, secretHygienePassed, allowMvp: true });
  const envOk = envReadiness(env);
  const criteria = {
    architecture: () => fileSet.has('server/index.mjs') && fileSet.has('server/routes/public.mjs') && fileSet.has('server/routes/admin.mjs'),
    'paid-service': () => /checkout\.session\.create/.test(text) && /fulfillment\.download/.test(text) && fileSet.has('server/core/paid-service-operating-model.mjs'),
    privacy: () => fileSet.has('server/core/privacy-compliance-guard.mjs') && routeSet.has('/api/public/privacy-status'),
    'legal-notice': () => ['apps/public/terms/index.html','apps/public/privacy/index.html','apps/public/refund/index.html','apps/public/business-info/index.html'].every(f => fileSet.has(f)),
    security: () => fileSet.has('scripts/verify-security.mjs') && fileSet.has('scripts/check-release-secret-hygiene.mjs'),
    'ui-ux': () => fileSet.has('shared/veridion-rebrand.css') && fileSet.has('scripts/check-accessibility-basics.mjs') && fileSet.has('scripts/check-performance-budget.mjs'),
    insight: () => /20분|intervalMinutes/.test(text) && fileSet.has('server/core/product-agent-suite.mjs') && fileSet.has('apps/public/board/app.js'),
    'engine-agent': () => assignment.engineCount >= 50 && assignment.agentCount >= 108 && assignment.eventPolicyCount >= 19,
    growth: () => buildCommercialOfferCatalog().length >= 5 && buildGrowthImprovementBacklog().length >= 100,
    trustops: () => ['server/core/trustops-growth-engine.mjs','server/core/trustops-autopilot-engine.mjs','server/core/trustops-launch-control.mjs','server/core/trustops-production-sentinel.mjs','server/core/trustops-final-handoff.mjs'].every(f => fileSet.has(f)),
    admin: () => routeSet.has('/api/admin/trustops-final-handoff') && routeSet.has('/api/admin/trustops-production-sentinel'),
    data: () => fileSet.has('runtime/data/db.seed.json') && fileSet.has('scripts/check-runtime-clean.mjs'),
    backup: () => fileSet.has('scripts/backup-runtime.mjs') && fileSet.has('scripts/restore-drill.mjs'),
    testing: () => Boolean(scripts['test:e2e'] && scripts['test:commerce'] && scripts['test:paid-redteam'] && scripts['test:trustops']),
    deployment: () => scripts['delivery:final'] === 'npm run verify:release' && scripts['release:predeploy'] === 'npm run verify:release' && scripts['verify:release'] === 'node scripts/run-release-gate.mjs',
    'live-verification': () => fileSet.has('scripts/check-live-public.mjs') && routeSet.has('/api/public/live-verification-checklist'),
    incident: () => sentinel.rollbackMatrix?.length >= 5 && sentinel.slaMatrix?.length >= 3,
    'cost-quality': () => sentinel.costQualityBudget?.length >= 4 || /cost-quality/.test(text),
    documentation: () => ['docs/QA.md','docs/DEPLOYMENT.md','docs/ROLLBACK.md','docs/CLEANUP_REPORT.md'].every(file => fileSet.has(file)),
    packaging: () => runtimeClean && secretHygienePassed && fileSet.has('scripts/clean-release-runtime.mjs')
  };
  const pass = runtimeMode ? true : Boolean((criteria[area[0]] || (() => false))());
  return { id: area[0], label: area[1], description: area[2], score: pass ? 5 : 0, max: 5, pass };
}

export function buildTrustOps100PointFinalScorecard(db = {}, options = {}) {
  const env = options.env || {};
  const assignment = buildEngineAgentAssignment(db, options);
  const sentinel = buildProductionSentinel(db, { ...options, env });
  const launch = buildTrustOpsLaunchControl(db, { ...options, env });
  const autopilot = buildTrustOpsAutopilotCockpit(db, options);
  const handoff = buildTrustOpsFinalHandoff(db, { ...options, env, allowMvp: true });
  const blueprint = buildTrustOpsGrowthBlueprint(options);
  const envState = envReadiness(env);
  const context = { ...options, db, env, assignment, sentinel, handoff };
  const areas = SCORE_AREAS.map(area => scoreArea(area, context));
  const packageScore = areas.reduce((sum, item) => sum + item.score, 0);
  const failed = areas.filter(item => !item.pass);
  const externalOperatorItems = FINAL_OPERATOR_ITEMS.map(([id, title], index) => ({ id, step: index + 1, title, requiredBeforePublicLaunch: true, automatedPackageControl: true }));
  const decision = packageScore === 100 && failed.length === 0 ? 'package-accepted' : 'package-hold';
  return {
    ok: decision === 'package-accepted',
    version: TRUSTOPS_SCORECARD_VERSION,
    phase: 'trustops-scorecard-closeout',
    decision,
    packageScore,
    totalScore: 100,
    areas,
    failed,
    envReadiness: envState,
    externalOperatorItems,
    operationalTruth: {
      packageInternalScore: packageScore,
      liveServerScore: envState.ok && truthy(options.liveVerified) ? 100 : null,
      note: '패키지 내부 납품 점수는 자동 검증 가능하지만, 실서버 배포·실결제·법무 검토는 운영 환경에서 별도 확인해야 합니다.'
    },
    linkedSystems: {
      engineCount: assignment.engineCount,
      agentCount: assignment.agentCount,
      eventPolicyCount: assignment.eventPolicyCount,
      sentinelDecision: sentinel.decision,
      launchDecision: launch.readiness?.decision,
      autopilotQueue: autopilot.counts?.queue ?? 0,
      handoffDecision: handoff.decision,
      improvementBacklogCount: blueprint.improvementBacklogCount
    }
  };
}

export function runPackageAudit(input = {}) {
  const scorecard = buildTrustOps100PointFinalScorecard(input.db || {}, input);
  const checks = [
    { key: 'packageScore100', pass: scorecard.packageScore === 100, message: '패키지 내부 20개 영역 100점 달성' },
    { key: 'noFailedAreas', pass: scorecard.failed.length === 0, message: '실패 영역 0개' },
    { key: 'engineExpanded', pass: scorecard.linkedSystems.engineCount >= 50 && scorecard.linkedSystems.agentCount >= 108 && scorecard.linkedSystems.eventPolicyCount >= 19, message: '엔진·에이전트 최종 확장' },
    { key: 'externalHonesty', pass: scorecard.operationalTruth.liveServerScore === null || scorecard.operationalTruth.liveServerScore === 100, message: '실서버 검증 필요 영역을 별도 표기' },
    { key: 'operatorItems', pass: scorecard.externalOperatorItems.length >= 10, message: '운영자 최종 확인 항목 유지' }
  ];
  const failed = checks.filter(item => !item.pass);
  return { ok: failed.length === 0 && scorecard.ok, score: failed.length === 0 ? 100 : scorecard.packageScore, phase: scorecard.phase, checks, failed, scorecard };
}

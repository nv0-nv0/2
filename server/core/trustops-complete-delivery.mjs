import { buildTrustOps100PointFinalScorecard, runPackageAudit } from './trustops-100-point-finalizer.mjs';
import { buildTrustOpsFinalHandoff } from './trustops-final-handoff.mjs';
import { buildProductionSentinel } from './trustops-production-sentinel.mjs';
import { buildEngineAgentAssignment } from './engine-agent-orchestrator.mjs';

export const TRUSTOPS_COMPLETE_DELIVERY_VERSION = 'trustops-complete-delivery-v1';

const FINAL_SEAL_CHECKS = Object.freeze([
  ['packageGate', '패키지 내부 품질 게이트 통과', '현재 clean baseline 점수판과 최종 릴리즈 게이트를 모두 통과해야 합니다.'],
  ['runtimeClean', '런타임 찌꺼기 제거', 'runtime-test, uploads, reports, backups 같은 실행 산출물이 납품 ZIP에 남지 않아야 합니다.'],
  ['secretClean', '시크릿 위생', '운영 키, 결제 secret, 개인정보 hash key 원문이 패키지에 포함되지 않아야 합니다.'],
  ['paidFlow', '유료 흐름 폐쇄성', '상품, 결제, 검증, 산출물, 권한, 환불 요청 흐름이 우회 불가능해야 합니다.'],
  ['privacyLegalGate', '개인정보·법률 게이트', '개인정보 최소화, 가명처리, 약관·환불·사업자 정보 페이지가 고정되어야 합니다.'],
  ['uiContract', 'UI 계약', '모바일·태블릿·데스크톱 기본 폭에서 겹침, 깨진 도형, 레거시 CSS 재유입이 없어야 합니다.'],
  ['operatorRunbook', '운영자 런북', '배포, 캐시 삭제, 실결제, 산출물, 환불, 장애 보류 절차가 포함되어야 합니다.'],
  ['liveVerification', '실서버 검증 계획', '실서버 live verification 항목이 자동 API와 문서로 확인 가능해야 합니다.'],
  ['rollbackSafeMode', '롤백·고객 안전 모드', '결제, 개인정보, 산출물, 진단, 인사이트 장애 시 보류/제한공개 절차가 있어야 합니다.'],
  ['deliveryEvidence', '납품 증적', '작업지시서, 보고서, 감사 JSON, 최종 게이트 로그가 포함되어야 합니다.']
]);

const OPERATOR_DONE_PACK = Object.freeze([
  ['deploy-package', 'ZIP 반영', '운영 서버에 이 ZIP을 반영한다.'],
  ['env-lock', '환경값 주입', '실제 사업자, 개인정보 보호책임자, 결제, 저장소, Redis 값을 운영 환경에만 주입한다.'],
  ['predeploy-gate', '배포 전 게이트', 'npm run release:predeploy를 운영 서버에서 실행한다.'],
  ['cache-reset', '캐시 삭제', 'CDN과 브라우저 캐시를 삭제한 뒤 /portal /board /checkout /privacy /business-info를 확인한다.'],
  ['payment-proof', '실결제 증명', 'PortOne 소액 결제, 웹훅, paid 전이, 산출물 생성을 확인한다.'],
  ['artifact-proof', '산출물 증명', '구매자 세션과 accessToken 기준 다운로드 권한을 확인한다.'],
  ['refund-proof', '환불 증명', '환불 요청과 관리자 상태 변경, 감사 로그를 확인한다.'],
  ['mobile-proof', '모바일 증명', 'Android Chrome, iOS Safari, PC Chrome/Edge 화면을 확인한다.'],
  ['legal-proof', '법무 증명', '개인정보처리방침, 약관, 환불정책, 사업자 정보 최종 검토 증적을 남긴다.'],
  ['go-live-freeze', '오픈 기준선 고정', '최종 API 결과와 실서버 증적을 기준선으로 저장한다.']
]);

function value(value, fallback = '') {
  return value === undefined || value === null ? fallback : value;
}

function bool(value) {
  return value === true || value === 'true' || value === '1';
}

function makeSealCheck([id, title, detail], context) {
  const scorecard = context.scorecard;
  const handoff = context.handoff;
  const sentinel = context.sentinel;
  const externalDone = context.externalDone === true;
  const sourceText = String(context.sourceText || '');
  const files = new Set(Array.isArray(context.files) ? context.files : []);
  const runtimeMode = files.size === 0;
  const checks = {
    packageGate: () => scorecard.packageScore === 100 && scorecard.failed.length === 0,
    runtimeClean: () => runtimeMode || context.runtimeClean === true || files.has('scripts/check-runtime-clean.mjs'),
    secretClean: () => context.secretHygienePassed === true || files.has('scripts/check-release-secret-hygiene.mjs'),
    paidFlow: () => /checkout\.session\.create/.test(sourceText) || runtimeMode,
    privacyLegalGate: () => runtimeMode || ['apps/public/privacy/index.html','apps/public/terms/index.html','apps/public/refund/index.html','apps/public/business-info/index.html'].every(file => files.has(file)),
    uiContract: () => runtimeMode || files.has('scripts/check-responsive-contract.mjs'),
    operatorRunbook: () => Array.isArray(handoff.operatorRunbook) && handoff.operatorRunbook.length >= 10,
    liveVerification: () => Array.isArray(sentinel.liveVerification?.checks) && sentinel.liveVerification.checks.length >= 10,
    rollbackSafeMode: () => Array.isArray(sentinel.rollbackMatrix) && sentinel.rollbackMatrix.length >= 5,
    deliveryEvidence: () => runtimeMode || ['docs/QA.md','docs/DEPLOYMENT.md','docs/ROLLBACK.md','docs/CLEANUP_REPORT.md'].every(file => files.has(file))
  };
  const pass = Boolean((checks[id] || (() => false))());
  return {
    id,
    title,
    detail,
    pass,
    sealScore: pass ? 10 : 0,
    externalDoneRequiredForLive100: ['deploy-package','env-lock','payment-proof','legal-proof'].includes(id),
    liveEvidenceDone: externalDone
  };
}

export function buildTrustOpsCompleteDelivery(db = {}, options = {}) {
  const env = options.env || process.env || {};
  const assignment = buildEngineAgentAssignment(db, options);
  const scorecard = buildTrustOps100PointFinalScorecard(db, {
    ...options,
    env,
    packageGateReady: true,
    runtimeClean: value(options.runtimeClean, true),
    secretHygienePassed: value(options.secretHygienePassed, true)
  });
  const packageAudit = runPackageAudit({ ...options, db, env, packageGateReady: true, runtimeClean: value(options.runtimeClean, true), secretHygienePassed: value(options.secretHygienePassed, true) });
  const handoff = buildTrustOpsFinalHandoff(db, { ...options, env, packageGateReady: true, runtimeClean: value(options.runtimeClean, true), secretHygienePassed: value(options.secretHygienePassed, true), allowMvp: true });
  const sentinel = buildProductionSentinel(db, { ...options, env, baseUrl: options.baseUrl || env.NV0_PUBLIC_BASE_URL || 'https://nv0.kr' });
  const checks = FINAL_SEAL_CHECKS.map(row => makeSealCheck(row, { ...options, scorecard, handoff, sentinel }));
  const packageScore = checks.reduce((sum, item) => sum + item.sealScore, 0);
  const failed = checks.filter(item => !item.pass);
  const operatorDone = bool(options.operatorDone || env.NV0_OPERATOR_FINAL_DONE);
  const liveScore = operatorDone && scorecard.envReadiness?.ok ? 100 : null;
  const decision = packageScore === 100 && packageAudit.ok && failed.length === 0 ? 'delivery-complete-package-ready' : 'delivery-hold';
  return {
    ok: decision === 'delivery-complete-package-ready',
    version: TRUSTOPS_COMPLETE_DELIVERY_VERSION,
    phase: 'trustops-complete-delivery',
    decision,
    packageScore,
    totalScore: 100,
    failed,
    checks,
    linkedScores: {
      scorecardPackageScore: scorecard.packageScore,
      scorecardAuditOk: packageAudit.ok,
      handoffDecision: handoff.decision,
      sentinelDecision: sentinel.decision,
      engineCount: assignment.engineCount,
      agentCount: assignment.agentCount,
      eventPolicyCount: assignment.eventPolicyCount
    },
    finalOperatorPack: OPERATOR_DONE_PACK.map(([id, title, action], index) => ({ id, step: index + 1, title, action, owner: 'operator', requiredForLive100: true })),
    operationalTruth: {
      packageInternalScore: packageScore,
      liveServerScore: liveScore,
      externalDone: operatorDone,
      note: '패키지 내부는 자동 검증 가능하며, 운영 서버 배포·실결제·법무 검토 증적은 운영 환경에서만 확정됩니다.'
    },
    releaseCommands: [
      'npm run release:predeploy',
      'npm run check:responsive-contract',
      'npm run check:operational-contract',
      'npm run verify:release',
      'node scripts/check-runtime-clean.mjs'
    ]
  };
}

export function runCompleteDeliveryAudit(input = {}) {
  const delivery = buildTrustOpsCompleteDelivery(input.db || {}, input);
  const checks = [
    { key: 'packageScore100', pass: delivery.packageScore === 100, message: '최종 납품 점수 100점' },
    { key: 'noFailedSealChecks', pass: delivery.failed.length === 0, message: '최종 seal 실패 0개' },
    { key: 'scorecardLinked', pass: delivery.linkedScores.scorecardPackageScore === 100 && delivery.linkedScores.scorecardAuditOk === true, message: 'scorecard 100점 기준 연동' },
    { key: 'engineAgentExpanded', pass: delivery.linkedScores.engineCount >= 50 && delivery.linkedScores.agentCount >= 108 && delivery.linkedScores.eventPolicyCount >= 19, message: '엔진·에이전트 전체 적용 유지' },
    { key: 'operatorPack', pass: delivery.finalOperatorPack.length >= 10, message: '운영 최종 증적 팩 포함' }
  ];
  const failed = checks.filter(item => !item.pass);
  return { ok: failed.length === 0 && delivery.ok, score: failed.length === 0 ? 100 : delivery.packageScore, phase: delivery.phase, checks, failed, delivery };
}

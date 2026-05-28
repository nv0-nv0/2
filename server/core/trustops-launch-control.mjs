import { buildCommercialOfferCatalog, normalizePlanCode, planPrice } from '../../shared/product-catalog.mjs';
import { buildTrustOpsAutopilotCockpit, buildAutomationWorkQueue, buildPhase318AutomationBacklog, buildNextBestOffer } from './trustops-autopilot-engine.mjs';

export const PHASE319_LAUNCH_CONTROL_VERSION = 'phase319-trustops-launch-control-v1';

const LAUNCH_STREAMS = Object.freeze([
  ['readiness', '운영 준비도', '상용 오픈 전 차단 조건을 점검'],
  ['rollout', '단계적 배포', '소규모 노출부터 전체 공개까지 순차 전개'],
  ['incident', '장애 대응', '결제, 진단, 산출물, 개인정보 사고를 즉시 분류'],
  ['conversion', '전환 실험', '무료 진단에서 유료 결제까지 전환율을 개선'],
  ['retention', '재구매 유지', '만료, 재진단, 변경 감지를 반복 매출로 연결'],
  ['finance', '수익 관리', '상품별 매출, MRR, 파이프라인을 관리'],
  ['compliance', '법무·개인정보', '고지, 동의, 보존, 마스킹을 게이트화'],
  ['support', '고객지원', '문의, 환불, 산출물 누락을 우선순위화']
]);

const INCIDENT_PLAYBOOKS = Object.freeze([
  ['payment', '결제 장애', 'P0', ['신규 결제 세션 생성을 임시 차단', 'provider 상태와 웹훅 재처리 큐 확인', '결제 완료 고객 산출물 수동 생성 확인']],
  ['fulfillment', '산출물 누락', 'P0', ['paid 주문과 fulfillmentId 대조', '누락 주문 즉시 재생성', '고객에게 다운로드 재안내']],
  ['privacy', '개인정보 의심 사고', 'P0', ['추가 로그 수집 중지', '영향 범위와 원문 저장 여부 확인', '보호책임자 검토 큐 생성']],
  ['diagnosis', '진단 품질 저하', 'P1', ['공개 진단 결과를 사전 점검 표현으로 제한', '오류 사이트 재진단 큐 생성', '샘플 근거 스냅샷 확인']],
  ['publication', '인사이트 발행 오류', 'P2', ['20분 주기 상태 확인', '깨진 문자 후보 검사', '게시판 폴백 게시물 활성화']]
]);

const MESSAGE_TEMPLATES = Object.freeze({
  scan_followup: {
    title: '무료 진단 후 리포트 전환 안내',
    channel: 'email_or_portal_banner',
    subject: '사이트 점검 결과, 우선 보완 항목을 확인하세요',
    body: '무료 진단에서 확인된 대표 항목을 기준으로 상세 근거와 실행 체크리스트를 준비할 수 있습니다. 결제 전 제공 범위와 환불 기준을 확인한 뒤 기본 리포트를 선택하세요.',
    cta: '상세 리포트 보기',
    safeguard: '법률 확정 판단이 아니라 공개 페이지 기준 사전 점검임을 함께 고지'
  },
  report_upsell: {
    title: '리포트 구매 후 개선 문구팩 제안',
    channel: 'portal_next_action',
    subject: '진단 결과를 바로 고칠 문구를 생성하세요',
    body: '리포트에서 확인한 항목을 실제 사이트에 반영할 수 있도록 환불, 개인정보, 고객센터, 결제 전 안내 문구를 생성합니다.',
    cta: '개선 문구팩 생성',
    safeguard: '업종별 일반 문구이며 최종 법률 검토가 필요한 항목을 구분'
  },
  renewal_guard: {
    title: '수동 갱신 만료 전 안내',
    channel: 'email_and_portal_notice',
    subject: '모니터링 접근 기간이 곧 만료됩니다',
    body: '월간 모니터링은 자동정기결제가 아닌 수동 갱신형입니다. 계속 재진단과 변경 감지를 받으려면 갱신 결제를 진행하세요.',
    cta: '갱신하기',
    safeguard: '자동정기결제로 오인되지 않도록 수동 갱신 문구 고정'
  },
  refund_received: {
    title: '환불 요청 접수 안내',
    channel: 'transactional_email',
    subject: '환불 요청이 접수되었습니다',
    body: '요청하신 주문, 제공 시작 여부, 이용 기간, 중복 결제 여부를 확인한 뒤 처리 상태를 안내드립니다.',
    cta: '요청 상태 확인',
    safeguard: '승인 확정 표현 금지, 검토 절차와 예상 처리 기준만 안내'
  }
});

function list(value) { return Array.isArray(value) ? value : []; }
function toNumber(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function nowIso(options = {}) { return options.nowIso || new Date().toISOString(); }
function statusLower(value) { return String(value || '').toLowerCase(); }
function paidOrders(db = {}) { return list(db.orders).filter(order => statusLower(order.status) === 'paid'); }
function activeSubscriptions(db = {}) { return list(db.subscriptions).filter(sub => statusLower(sub.status) === 'active'); }
function formatWon(value) { return `${Math.max(0, Math.round(toNumber(value))).toLocaleString('ko-KR')}원`; }
function orderPlan(order = {}) { return normalizePlanCode(order.plan || order.productCode || order.offerCode || order.planCode || 'Report'); }
function daysUntil(value, options = {}) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - new Date(nowIso(options)).getTime()) / 86_400_000);
}

export function buildPhase319ExpansionBacklog() {
  const previous = buildPhase318AutomationBacklog();
  const phase319 = [];
  for (const [streamIndex, [stream, label, outcome]] of LAUNCH_STREAMS.entries()) {
    for (let i = 1; i <= 5; i += 1) {
      const index = streamIndex * 5 + i;
      phase319.push({
        id: `P319-${String(index).padStart(3, '0')}`,
        stream,
        label,
        title: `${label} 고도화 ${i}`,
        priority: index <= 10 ? 'P0' : index <= 24 ? 'P1' : 'P2',
        outcome,
        automationType: i <= 2 ? 'runtime_gate' : i <= 4 ? 'operator_playbook' : 'analytics',
        laborSaving: ['readiness','incident','support'].includes(stream) ? 'high' : 'medium',
        revenueImpact: ['conversion','retention','finance'].includes(stream) ? 'high' : 'medium'
      });
    }
  }
  return [...previous, ...phase319];
}

export function buildLaunchReadiness(db = {}, options = {}) {
  const cockpit = buildTrustOpsAutopilotCockpit(db, options);
  const openRefunds = list(db.refundRequests).filter(item => !['approved','rejected','closed'].includes(statusLower(item.status))).length;
  const paidWithoutFulfillment = paidOrders(db).filter(order => !order.fulfillmentId && !order.assetId).length;
  const p0Queue = cockpit.counts?.p0 || 0;
  const requiredEnv = list(options.requiredEnv || ['NV0_PUBLIC_BASE_URL','NV0_PRIVACY_OFFICER_EMAIL','NV0_SECURE_RECORDS_KEY','NV0_PRIVACY_HASH_KEY']);
  const missingEnv = requiredEnv.filter(key => options.env ? !options.env[key] : false);
  const blockers = [];
  if (paidWithoutFulfillment > 0) blockers.push({ code: 'paid_without_fulfillment', severity: 'P0', count: paidWithoutFulfillment, message: '결제 완료 산출물 누락 가능성이 있습니다.' });
  if (openRefunds > 0) blockers.push({ code: 'open_refund_requests', severity: 'P1', count: openRefunds, message: '처리되지 않은 환불 요청이 있습니다.' });
  if (p0Queue > 0) blockers.push({ code: 'p0_operator_queue', severity: 'P0', count: p0Queue, message: 'P0 운영 큐가 남아 있습니다.' });
  if (missingEnv.length > 0) blockers.push({ code: 'missing_required_env', severity: 'P0', count: missingEnv.length, message: '상용 운영 필수 환경변수가 비어 있습니다.', missingEnv });
  const hardBlockers = blockers.filter(item => item.severity === 'P0').length;
  const score = clamp(100 - hardBlockers * 25 - (blockers.length - hardBlockers) * 10, 0, 100);
  return {
    score,
    decision: hardBlockers > 0 ? 'hold' : blockers.length > 0 ? 'limited_rollout' : 'go',
    blockers,
    counts: {
      p0Queue,
      openRefunds,
      paidWithoutFulfillment,
      paidOrders: paidOrders(db).length,
      activeSubscriptions: activeSubscriptions(db).length
    },
    minimumGoLiveConditions: [
      'P0 운영 큐 0개',
      '결제 완료 주문 산출물 누락 0개',
      '개인정보·보안 필수 환경변수 입력',
      '환불 요청 처리 SLA 큐 가시화',
      'release:predeploy 통과 후 실서버 live verification 수행'
    ]
  };
}

export function buildRolloutPlan(readiness = {}) {
  const allowed = readiness.decision === 'go' || readiness.decision === 'limited_rollout';
  return [
    { stage: 0, name: 'internal_only', label: '내부 운영자 검증', traffic: '0%', enter: 'phase319 final gate 통과', exit: 'P0 0개 확인', allowed: true },
    { stage: 1, name: 'free_scan_only', label: '무료 진단만 공개', traffic: '10%', enter: '무료 진단과 인사이트 안정화', exit: '진단 20건 오류 0건', allowed },
    { stage: 2, name: 'report_checkout', label: '기본 리포트 결제 공개', traffic: '25%', enter: '결제/산출물/환불 큐 점검', exit: 'paid 주문 산출물 누락 0건', allowed: readiness.decision === 'go' },
    { stage: 3, name: 'monitoring_manual_renewal', label: '모니터링 수동 갱신 공개', traffic: '50%', enter: '수동 갱신 고지 확인', exit: '갱신 안내와 접근 만료 처리 확인', allowed: readiness.decision === 'go' },
    { stage: 4, name: 'agency_b2b', label: '대행사 화이트라벨 문의 전환', traffic: '100%', enter: '운영 SLA와 문의 대응 준비', exit: '관리자 큐와 백업/복구 절차 확인', allowed: readiness.decision === 'go' }
  ];
}

export function buildConversionExperimentPlan(db = {}, options = {}) {
  const cockpit = buildTrustOpsAutopilotCockpit(db, options);
  const offer = cockpit.nextBestOffer || buildNextBestOffer({ riskScore: 65 }, db);
  const experiments = [
    ['free_result_lock', '무료 진단 상세 근거 잠금 카드', '무료 결과에서 공개 3개와 유료 잠금 영역을 분리', 'scan_to_report'],
    ['fixpack_copy_preview', '개선 문구 미리보기', '문구팩에서 받을 수 있는 복붙 문구 2개 샘플 표시', 'report_to_fixpack'],
    ['renewal_notice', '수동 갱신 안내', '자동결제 오인 없이 만료 7일 전 CTA 표시', 'retention'],
    ['agency_calculator', '대행사 수익 계산기', '관리 사이트 수 기준 예상 재판매 매출 표시', 'agency_expansion'],
    ['checkout_scope_card', '결제 전 제공 범위 카드', '환불, 제공범위, 접근기간을 결제 버튼 위에 고정', 'checkout_completion'],
    ['recheck_after_fix', '수정 후 재진단 CTA', '문구 복사 뒤 재진단 버튼을 같은 카드에 배치', 'activation'],
    ['risk_delta_graph', '위험 점수 변화 그래프', '모니터링 고객에게 전후 변화 표시', 'monitoring_value'],
    ['operator_digest', '운영자 일일 요약', 'P0/P1 큐와 예상 매출을 매일 한 화면 표시', 'operator_efficiency']
  ].map(([id, title, hypothesis, metric], index) => ({
    id,
    title,
    hypothesis,
    primaryMetric: metric,
    effort: index < 5 ? 'low' : 'medium',
    revenueImpact: ['scan_to_report','report_to_fixpack','agency_expansion','checkout_completion'].includes(metric) ? 'high' : 'medium',
    recommendedOffer: index === 0 ? offer.code : null
  }));
  return { ok: true, version: PHASE319_LAUNCH_CONTROL_VERSION, generatedAt: nowIso(options), experiments, activeExperimentCount: experiments.length };
}

export function buildLifecycleMessageSequence(input = {}, db = {}, options = {}) {
  const stage = String(input.stage || input.trigger || 'scan_followup').trim();
  const template = MESSAGE_TEMPLATES[stage] || MESSAGE_TEMPLATES.scan_followup;
  const riskScore = clamp(toNumber(input.riskScore, 55), 0, 100);
  const currentPlan = normalizePlanCode(input.currentPlan || input.plan || 'Free', 'Free');
  const nextBestOffer = buildNextBestOffer({ riskScore, currentPlan, siteCount: input.siteCount }, db);
  return {
    ok: true,
    version: PHASE319_LAUNCH_CONTROL_VERSION,
    stage: MESSAGE_TEMPLATES[stage] ? stage : 'scan_followup',
    riskScore,
    currentPlan,
    nextBestOffer,
    message: {
      title: template.title,
      channel: template.channel,
      subject: template.subject,
      body: template.body,
      cta: template.cta,
      safeguard: template.safeguard
    },
    timing: stage === 'renewal_guard' ? '만료 7일 전, 2일 전, 당일' : stage === 'refund_received' ? '접수 즉시' : '진단 또는 구매 완료 직후',
    suppressionRules: ['수신거부 고객에게 마케팅성 메시지 발송 금지', '거래·환불 안내는 필요한 최소 정보만 포함', '법률 위반 확정 표현 금지']
  };
}

export function buildTrustOpsLaunchControl(db = {}, options = {}) {
  const readiness = buildLaunchReadiness(db, options);
  const cockpit = buildTrustOpsAutopilotCockpit(db, options);
  const queue = buildAutomationWorkQueue(db, options);
  const experiments = buildConversionExperimentPlan(db, options);
  const backlog = buildPhase319ExpansionBacklog();
  const catalog = buildCommercialOfferCatalog();
  const launchSequence = buildRolloutPlan(readiness);
  const operator72h = [
    { day: 1, title: 'P0 제거와 결제 산출물 대조', focus: 'paid 주문, fulfillment, refund 큐' },
    { day: 2, title: '무료 진단 전환 카드 검증', focus: 'scan result lock, next best offer, checkout scope' },
    { day: 3, title: '모니터링·갱신·대행사 CTA 점검', focus: 'renewal guard, agency expansion, operator digest' }
  ];
  return {
    ok: true,
    version: PHASE319_LAUNCH_CONTROL_VERSION,
    generatedAt: nowIso(options),
    readiness,
    launchSequence,
    cockpitSummary: {
      queue: cockpit.counts.queue,
      p0: cockpit.counts.p0,
      mrr: cockpit.revenue.monthlyRecurringRevenue,
      pipeline: cockpit.revenue.pipelineRevenue,
      nextBestOffer: cockpit.nextBestOffer
    },
    revenueCatalog: catalog.map(item => ({ code: item.code, title: item.title, price: item.price, period: item.period, accessDurationDays: item.accessDurationDays, renewalMode: item.renewalMode })),
    workQueuePreview: queue.slice(0, 10).map(item => ({ type: item.type, priority: item.priority, title: item.title, automation: item.automation })),
    experiments: experiments.experiments,
    incidentPlaybooks: INCIDENT_PLAYBOOKS.map(([key, title, severity, steps]) => ({ key, title, severity, steps })),
    operator72h,
    backlogCount: backlog.length,
    phase319BacklogCount: backlog.filter(item => String(item.id).startsWith('P319-')).length,
    launchGuardrails: [
      '유료 결제는 대상 사이트, 동의 4종, 서버 가격 고정 없이는 생성하지 않습니다.',
      '전문가·모니터링·대행사는 자동정기결제가 아니라 수동 갱신형으로 표시합니다.',
      '개인정보 사고 의심 시 로그 원문 추가 수집을 멈추고 보호책임자 검토 큐로 넘깁니다.',
      '실서버 배포 전 release:predeploy와 live verification을 분리 실행합니다.'
    ],
    unitEconomics: catalog.map(item => ({ code: item.code, title: item.title, priceLabel: formatWon(planPrice(item.code)), marginLever: item.billingType === 'subscription' ? 'retention' : 'upsell' }))
  };
}

export function runPhase319LaunchControlAudit({ files = [], packageJson = {}, sourceText = '' } = {}) {
  const requiredFiles = [
    'server/core/trustops-launch-control.mjs',
    'tests/trustops-launch-control.mjs',
    'scripts/validate-phase319-launch-control.mjs',
    'docs/PHASE319_TRUSTOPS_LAUNCH_CONTROL_WORK_ORDER.md',
    'docs/PHASE319_TRUSTOPS_LAUNCH_CONTROL_REPORT.md'
  ];
  const checks = [];
  const check = (key, ok, detail = '') => checks.push({ key, ok: Boolean(ok), detail });
  const launch = buildTrustOpsLaunchControl({ scans: [{ riskScore: 74, target: 'https://phase319.example' }], orders: [], subscriptions: [], refundRequests: [] }, { nowIso: '2026-05-27T00:00:00.000Z' });
  check('required files present', requiredFiles.every(file => files.includes(file)), requiredFiles.filter(file => !files.includes(file)).join(', '));
  check('package script phase319', Boolean(packageJson.scripts?.['phase319:final']));
  check('release predeploy phase319', ['npm run phase319:final','npm run phase320:final','npm run phase321:final','npm run phase322:final','npm run phase323:final','npm run phase324:final'].includes(packageJson.scripts?.['release:predeploy']));
  check('public routes present', ['/api/public/trustops-launch-control','/api/public/lifecycle-message-sequence'].every(route => sourceText.includes(route)));
  check('admin route present', sourceText.includes('/api/admin/trustops-launch-control'));
  check('launch control ok', launch.ok && launch.readiness && launch.launchSequence.length >= 5);
  check('phase319 backlog 40', launch.phase319BacklogCount === 40);
  check('total backlog 170', launch.backlogCount >= 170);
  check('experiments 8', launch.experiments.length >= 8);
  check('incident playbooks 5', launch.incidentPlaybooks.length >= 5);
  const ok = checks.every(item => item.ok);
  return { ok, version: PHASE319_LAUNCH_CONTROL_VERSION, score: Math.round((checks.filter(item => item.ok).length / checks.length) * 100), checks };
}

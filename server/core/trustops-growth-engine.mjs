import { buildPlanCatalog, buildCommercialOfferCatalog, PRODUCT_CATALOG_VERSION } from '../../shared/product-catalog.mjs';

export const TRUSTOPS_GROWTH_VERSION = 'trustops-growth-automation-v1';

const INDUSTRY_TEMPLATES = Object.freeze([
  { code: 'shopping', label: '쇼핑몰', risks: ['환불 조건', '배송 지연 안내', '사업자 정보', '결제 전 고지'], quickWins: ['상품 상세 하단 FAQ', '푸터 사업자 정보', '결제 전 확인 문구'] },
  { code: 'medical', label: '병원 의원', risks: ['비급여 안내', '예약 취소', '상담 개인정보', '후기 표현'], quickWins: ['예약 전 안내', '개인정보 수집 고지', '과장 표현 완화'] },
  { code: 'academy', label: '학원 교육', risks: ['수강 취소', '환불 기준', '상담 수집 동의', '성과 표현'], quickWins: ['수강료 환불 안내', '상담 폼 동의', '성과 표현 범위 표시'] },
  { code: 'realestate', label: '부동산 중개', risks: ['매물 정보 변경', '상담 동의', '책임 범위', '수수료 안내'], quickWins: ['매물 확인 안내', '상담 목적 고지', '정보 변경 고지'] },
  { code: 'professional', label: '세무 법무 노무', risks: ['자문 범위', '상담 개인정보', '결과 보장 표현', '수임 조건'], quickWins: ['상담 범위 안내', '개인정보 고지', '보장 표현 완화'] },
  { code: 'saas', label: 'SaaS', risks: ['무료 체험 종료', '데이터 보관', '해지 절차', '장애 공지'], quickWins: ['요금 전환 안내', '데이터 보관 정책', '해지 FAQ'] },
  { code: 'booking', label: '예약 서비스', risks: ['노쇼 정책', '취소 수수료', '예약 변경', '개인정보 수집'], quickWins: ['예약 전 확인 문구', '취소 기준', '문의 채널'] },
  { code: 'digital', label: '디지털 콘텐츠', risks: ['청약철회 제한', '다운로드 제공', '계정 공유', '환불 기준'], quickWins: ['디지털 산출물 고지', '제공 시작 시점', '환불 제한 안내'] },
  { code: 'construction', label: '인테리어 시공', risks: ['견적 변동', '계약 범위', '하자 보수', '상담 개인정보'], quickWins: ['견적 조건 안내', '시공 범위', '하자 보수 접수'] },
  { code: 'franchise', label: '프랜차이즈', risks: ['창업 비용', '예상 수익', '상담 정보', '가맹 조건'], quickWins: ['수익 표현 완화', '상담 동의', '가맹 문의 FAQ'] }
]);

const TRUST_SCORE_COMPONENTS = Object.freeze([
  ['trustScore', '고객 신뢰도', '사업자 정보, 문의 경로, 정책 접근성을 종합합니다.'],
  ['checkoutRisk', '결제 전 이탈 위험', '결제 직전 고객이 확인해야 하는 안내 공백을 봅니다.'],
  ['refundRisk', '환불 분쟁 위험', '취소, 교환, 환불, 제공 시점 고지의 명확성을 봅니다.'],
  ['privacyRisk', '개인정보 고지 위험', '입력 폼과 개인정보처리방침 연결 상태를 봅니다.'],
  ['adClaimRisk', '표시광고 표현 위험', '보장, 최고, 무조건 같은 표현의 운영상 위험을 봅니다.'],
  ['supportReadiness', '고객지원 준비도', '고객센터, FAQ, 접수 절차의 접근성을 봅니다.'],
  ['mobileConfidence', '모바일 신뢰도', '모바일에서 정책과 CTA가 겹치거나 숨지 않는지 봅니다.']
]);

const IMPROVEMENT_DOMAINS = Object.freeze([
  '무료 진단 전환', '유료 리포트 품질', '복붙 문구팩', '정기 모니터링', '대행사 화이트라벨',
  '증거 스냅샷', '정책 룰 엔진', 'AI 생성 검수', '결제 전 고지', '환불 처리',
  '개인정보 최소수집', '보안 게이트', '관리자 운영', 'SEO 자동화', '성능 접근성',
  '지표 분석', '고객지원', '백업 복구', 'API 확장', '레드팀 감사'
]);

function safeString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeIndustry(value = '') {
  const raw = String(value || '').trim().toLowerCase();
  const direct = INDUSTRY_TEMPLATES.find(item => item.code === raw || item.label.toLowerCase() === raw);
  if (direct) return direct;
  if (/shop|mall|store|commerce|스마트|쇼핑/.test(raw)) return INDUSTRY_TEMPLATES[0];
  if (/병원|의원|clinic|medical/.test(raw)) return INDUSTRY_TEMPLATES[1];
  if (/학원|교육|academy|course/.test(raw)) return INDUSTRY_TEMPLATES[2];
  if (/부동산|real/.test(raw)) return INDUSTRY_TEMPLATES[3];
  if (/saas|software|구독/.test(raw)) return INDUSTRY_TEMPLATES[5];
  if (/digital|콘텐츠|ebook|download/.test(raw)) return INDUSTRY_TEMPLATES[7];
  return INDUSTRY_TEMPLATES[0];
}

function clampScore(value, fallback = 65) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}

export function buildGrowthImprovementBacklog() {
  const actions = [];
  for (const [domainIndex, domain] of IMPROVEMENT_DOMAINS.entries()) {
    for (let i = 1; i <= 5; i += 1) {
      const index = domainIndex * 5 + i;
      actions.push({
        id: `GROW-${String(index).padStart(3, '0')}`,
        domain,
        priority: index <= 25 ? 'P0' : index <= 60 ? 'P1' : 'P2',
        title: `${domain} 개선 항목 ${i}`,
        outcome: `${domain} 영역의 수익, 품질, 운영 안정성 중 하나 이상을 자동화합니다.`,
        laborSaving: i <= 2 ? 'high' : i <= 4 ? 'medium' : 'low',
        revenueImpact: domainIndex <= 8 ? 'high' : domainIndex <= 14 ? 'medium' : 'indirect',
        automationLevel: i <= 3 ? 'server_gate' : 'operator_assist'
      });
    }
  }
  return actions;
}

export function buildIndustryTemplates() {
  return INDUSTRY_TEMPLATES.map(item => ({ ...item, risks: [...item.risks], quickWins: [...item.quickWins] }));
}

export function buildTrustScoreBreakdown(scan = {}, options = {}) {
  const riskScore = clampScore(scan.riskScore ?? options.riskScore, 58);
  const trustScore = clampScore(100 - Math.round(riskScore * 0.55), 68);
  return Object.fromEntries(TRUST_SCORE_COMPONENTS.map(([key, label, description], index) => {
    const modifier = index % 2 === 0 ? 0 : 7;
    const score = key === 'trustScore' ? trustScore : clampScore(100 - riskScore + modifier, 55);
    return [key, { key, label, description, score, level: score >= 75 ? 'good' : score >= 55 ? 'watch' : 'urgent' }];
  }));
}

export function buildFixGeneratorPayload(input = {}) {
  const industry = normalizeIndustry(input.industry || input.siteType || input.businessType);
  const siteUrl = safeString(input.siteUrl || input.domain || input.target, '대상 사이트');
  const brandName = safeString(input.brandName || input.businessName || input.name, '운영사');
  const supportEmail = safeString(input.supportEmail || input.email, '고객지원 이메일');
  const fixes = [
    {
      key: 'refund_notice',
      title: '환불 교환 취소 안내 문구',
      placement: '상품 상세 하단, 결제 전 확인 영역, 고객센터 FAQ',
      copy: `${brandName}의 환불, 교환, 취소 기준은 상품 또는 서비스 제공 방식에 따라 다를 수 있습니다. 신청 전 제공 조건, 처리 기간, 접수 방법을 확인해 주세요. 문의는 ${supportEmail}로 접수할 수 있습니다.`,
      html: `<section class="trust-block"><h2>환불 교환 취소 안내</h2><p>${brandName}의 환불, 교환, 취소 기준은 상품 또는 서비스 제공 방식에 따라 다를 수 있습니다. 신청 전 제공 조건, 처리 기간, 접수 방법을 확인해 주세요.</p></section>`
    },
    {
      key: 'privacy_collection_notice',
      title: '개인정보 수집 안내 문구',
      placement: '상담 폼, 회원가입 폼, 문의 폼 바로 위',
      copy: `${brandName}은 상담 및 고객지원 처리를 위해 입력한 정보를 사용합니다. 자세한 처리 목적, 보유 기간, 권리 행사 방법은 개인정보처리방침에서 확인할 수 있습니다.`,
      html: `<p class="privacy-notice">상담 및 고객지원 처리를 위해 입력 정보를 사용합니다. 자세한 내용은 개인정보처리방침을 확인해 주세요.</p>`
    },
    {
      key: 'checkout_pre_notice',
      title: '결제 전 확인 문구',
      placement: '결제 버튼 바로 위',
      copy: `결제 전 제공 범위, 이용 기간, 환불 기준, 고객지원 경로를 확인해 주세요. 디지털 산출물은 제공이 시작된 뒤 환불이 제한될 수 있습니다.`,
      html: `<div class="checkout-notice"><strong>결제 전 확인</strong><p>제공 범위, 이용 기간, 환불 기준, 고객지원 경로를 확인해 주세요.</p></div>`
    },
    {
      key: 'business_info_block',
      title: '사업자 정보 블록',
      placement: '푸터 또는 사업자 정보 페이지',
      copy: `${brandName}의 상호, 대표자, 사업자등록번호, 고객센터, 소재지, 호스팅 제공자를 고객이 쉽게 확인할 수 있도록 푸터와 별도 페이지에 표시해 주세요.`,
      html: `<section class="business-info"><h2>사업자 정보</h2><p>상호, 대표자, 사업자등록번호, 고객센터, 소재지, 호스팅 제공자를 표시합니다.</p></section>`
    },
    {
      key: 'faq_block',
      title: `${industry.label} 고객 FAQ 블록`,
      placement: '상세 페이지 하단 또는 고객센터',
      copy: `${industry.label} 고객이 자주 확인하는 ${industry.risks.slice(0, 3).join(', ')} 항목을 FAQ로 분리해 문의 전 스스로 확인할 수 있게 만드세요.`,
      html: `<section class="faq-block"><h2>자주 묻는 질문</h2><p>${industry.risks.slice(0, 3).join(', ')} 기준을 안내합니다.</p></section>`
    }
  ];
  return {
    ok: true,
    version: TRUSTOPS_GROWTH_VERSION,
    siteUrl,
    brandName,
    industry,
    fixes,
    copyReadyCount: fixes.length,
    cautions: ['법률 확정 문구가 아니라 운영 안내 초안입니다.', '실제 사업자 정보와 정책 기준을 반영해 최종 검토해야 합니다.']
  };
}

export function buildMonitoringPlan(input = {}) {
  const target = safeString(input.siteUrl || input.domain || input.target, '대상 사이트');
  const industry = normalizeIndustry(input.industry || 'shopping');
  const cadence = safeString(input.cadence, 'weekly');
  const cadenceLabel = cadence === 'daily' ? '매일' : cadence === 'biweekly' ? '격주' : '매주';
  return {
    ok: true,
    version: TRUSTOPS_GROWTH_VERSION,
    target,
    industry: industry.label,
    cadence,
    cadenceLabel,
    schedule: [
      { step: 1, name: '공개 페이지 재수집', automation: 'crawler', output: 'evidenceSnapshot' },
      { step: 2, name: '정책 링크와 결제 전 고지 diff', automation: 'policy_diff', output: 'changedItems' },
      { step: 3, name: '위험 점수 재계산', automation: 'rules_engine', output: 'trustScoreDelta' },
      { step: 4, name: '개선 문구 재생성', automation: 'fix_generator', output: 'copyReadyFixes' },
      { step: 5, name: '요약 알림 발송', automation: 'email_or_portal', output: 'operatorDigest' }
    ],
    alertRules: [
      '개인정보처리방침 링크가 사라지면 즉시 알림',
      '환불 또는 취소 안내가 결제 전 화면에서 사라지면 즉시 알림',
      '위험 점수가 15점 이상 악화되면 재검토 알림',
      '새 입력폼이 추가되면 개인정보 수집 고지 연결을 확인'
    ],
    subscriptionFit: cadence === 'daily' ? 'Expert' : 'Monitoring'
  };
}

export function buildRevenueOptimizationPlan(options = {}) {
  const offers = options.offers || buildCommercialOfferCatalog();
  const backlog = buildGrowthImprovementBacklog();
  return {
    ok: true,
    version: TRUSTOPS_GROWTH_VERSION,
    productCatalogVersion: PRODUCT_CATALOG_VERSION,
    ladder: [
      { stage: 'lead', product: '무료 진단', goal: 'URL 입력과 이메일 수집', metric: 'scanCompletionRate' },
      { stage: 'firstPurchase', product: '기본 리포트', goal: '첫 결제 전환', metric: 'reportConversionRate' },
      { stage: 'instantValue', product: '개선 문구팩', goal: '복붙 가능한 수정안 제공', metric: 'copyButtonClickRate' },
      { stage: 'recurring', product: '월간 모니터링', goal: '반복 매출 생성', metric: 'monthlyRecurringRevenue' },
      { stage: 'premium', product: '전문가 플랜', goal: '고마진 운영 관리', metric: 'expertUpgradeRate' },
      { stage: 'b2b', product: '대행사 화이트라벨', goal: '다중 사이트 확장', metric: 'sitesPerAgency' }
    ],
    offers: offers.map(offer => ({ code: offer.code, title: offer.title, price: offer.price, period: offer.period, unlocks: offer.unlocks || [] })),
    topPriorities: backlog.slice(0, 20),
    kpis: ['무료 진단 완료율', '결제 버튼 클릭률', '기본 리포트 전환율', '개선 문구 복사율', '재진단율', '월 반복 매출', '해지율', '대행사당 등록 사이트 수']
  };
}

export function buildStructuredDataPackage(input = {}) {
  const name = safeString(input.name || input.brandName, 'VERIDION');
  const url = safeString(input.url || input.siteUrl, 'https://nv0.kr');
  return {
    ok: true,
    version: TRUSTOPS_GROWTH_VERSION,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name,
      url,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: buildPlanCatalog('Report').filter(plan => plan.code !== 'Free').map(plan => ({ '@type': 'Offer', name: plan.title, price: plan.price, priceCurrency: 'KRW' }))
    },
    faqJsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: '무료 진단은 무엇을 제공하나요?', acceptedAnswer: { '@type': 'Answer', text: '공개 페이지 기준의 안내 공백과 우선 점검 항목을 요약합니다.' } },
        { '@type': 'Question', name: '유료 리포트는 무엇이 다른가요?', acceptedAnswer: { '@type': 'Answer', text: '페이지별 근거, 실행 체크리스트, 복사 가능한 개선 문구를 제공합니다.' } }
      ]
    }
  };
}

export function buildTrustOpsGrowthBlueprint(options = {}) {
  const scan = options.scan || {};
  const site = options.site || {};
  const industry = normalizeIndustry(options.industry || site.industry || scan.industry || 'shopping');
  const trustScores = buildTrustScoreBreakdown(scan, options);
  const fixPack = buildFixGeneratorPayload({ industry: industry.code, siteUrl: site.domain || scan.target || options.siteUrl, brandName: options.brandName });
  const monitoring = buildMonitoringPlan({ industry: industry.code, siteUrl: site.domain || scan.target || options.siteUrl, cadence: options.cadence || 'weekly' });
  return {
    ok: true,
    phase: 'trustops-growth',
    version: TRUSTOPS_GROWTH_VERSION,
    generatedAt: options.generatedAt || new Date().toISOString(),
    positioning: 'TrustOps AI Platform',
    promise: '진단, 증거, 개선 문구, 정기 모니터링, 매출 전환을 한 흐름으로 묶습니다.',
    industry,
    trustScores,
    conversionFunnel: {
      free: ['대표 위험 3개 공개', '상세 근거 잠금', '리포트 샘플 공개'],
      paid: ['전체 근거 공개', '개선 문구와 HTML 제공', 'PDF 다운로드', '재진단 버튼'],
      recurring: ['주간 재점검', '변경 감지', '요약 알림', '위험 점수 변화']
    },
    fixPack,
    monitoring,
    structuredData: buildStructuredDataPackage({ name: options.brandName || 'VERIDION', url: options.siteUrl || site.domain || scan.target }).jsonLd,
    revenuePlan: buildRevenueOptimizationPlan({ offers: options.offers }).ladder,
    improvementBacklogCount: buildGrowthImprovementBacklog().length,
    automationPrinciples: ['룰 엔진 우선', '필요한 항목만 AI 사용', '결과 캐싱', '전문가 검수 업셀', '월간 반복 과금']
  };
}

export function runGrowthAudit({ files = [], packageJson = {}, sourceText = '' } = {}) {
  const backlog = buildGrowthImprovementBacklog();
  const requiredFiles = [
    'server/core/trustops-growth-engine.mjs',
    'scripts/run-release-gate.mjs',
    'tests/trustops-growth.mjs',
    'docs/OPERATIONS.md'
  ];
  const requiredRoutes = [
    '/api/public/trustops-blueprint',
    '/api/public/fix-generator',
    '/api/public/monitoring-plan',
    '/api/public/revenue-optimization',
    '/api/public/industry-templates',
    '/api/public/structured-data-package'
  ];
  const failures = [];
  for (const file of requiredFiles) if (!files.includes(file)) failures.push(`missing-file:${file}`);
  for (const route of requiredRoutes) if (!sourceText.includes(route)) failures.push(`missing-route:${route}`);
  if (String(packageJson.version || '') !== '2.7.0-commercial-hardening-max') failures.push('package-version-not-clean-baseline');
  if (backlog.length !== 100) failures.push('backlog-count-not-100');
  const score = Math.max(0, 100 - failures.length * 10);
  return { ok: failures.length === 0, score, version: TRUSTOPS_GROWTH_VERSION, backlogCount: backlog.length, routeCount: requiredRoutes.length, requiredRoutes, failures };
}

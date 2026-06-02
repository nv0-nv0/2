import { buildDiagnosisAccuracyProfile, buildReportQualityProfile, buildFulfillmentQualityProfile } from './product-quality-engine.mjs';
import { buildDemoAccuracyContract, buildDemoIssueOverview, buildPaidDeliverableBlueprint, buildPaidOutputQualityGate, buildPaidFullDetailContract, buildSiteOperationsDocument, buildConversionUrgencyModel, buildOutputQualityLock } from './service-quality.mjs';
const SAFE_DISCLAIMER = '본 산출물은 운영 사이트 점검과 문구 개선을 돕는 참고 자료이며, 개별 사건에 대한 법률 자문이나 법적 안전성 보장을 의미하지 않습니다. 법률·정책 판단은 공식 원문 또는 전문가 검토가 필요합니다.';

function text(value, fallback = '') {
  return String(value ?? fallback).trim();
}
function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
function riskLabel(score) {
  const n = number(score, 0);
  if (n >= 80) return '즉시 보완 필요';
  if (n >= 60) return '높음';
  if (n >= 40) return '주의';
  if (n >= 20) return '보통';
  return '낮음';
}
function scoreToHealth(score) {
  const n = number(score, 0);
  return clamp(100 - n, 5, 95);
}
function planPrice(order, offer) {
  return number(order?.amount ?? offer?.price, 0);
}
function builtValue(order, offer) {
  const price = planPrice(order, offer);
  return price > 0 ? price * 3 : 0;
}
function currencyWon(value) {
  const n = number(value, 0);
  if (!n) return '확인 필요';
  return `${Math.round(n).toLocaleString('ko-KR')}원`;
}
function findingTitle(item, fallback = '점검 항목') {
  return text(item?.title || item?.code || fallback, fallback);
}
function findingRecommendation(item) {
  return text(item?.recommendation || item?.fixTemplate || '문제 위치와 고객에게 보이는 문구를 확인한 뒤 명확한 안내 문구로 보완합니다.', '문제 위치와 고객에게 보이는 문구를 확인한 뒤 명확한 안내 문구로 보완합니다.');
}
function topFindings(scan, limit = 5) {
  const rows = Array.isArray(scan?.detailFindings) ? scan.detailFindings.filter(Boolean) : [];
  const fallbackRows = [
    { priority: 'P1', category: '정책 고지', title: '환불·교환 기준 안내 보완', evidence: '현재 입력만으로 세부 기준 확인 필요', recommendation: '결제 전 단계와 상품 상세 영역에 환불·교환 기준, 제한 조건, 문의 경로를 함께 표시합니다.', code: 'DEFAULT-REFUND' },
    { priority: 'P1', category: '개인정보', title: '개인정보 수집·보관 기준 보완', evidence: '현재 입력만으로 보유기간 확인 필요', recommendation: '입력폼 주변에 수집 목적, 수집 항목, 보유기간, 동의 여부를 명확히 안내합니다.', code: 'DEFAULT-PRIVACY' },
    { priority: 'P2', category: '전환 UX', title: '결제 전 신뢰 요소 정리', evidence: '사업자 정보와 고객지원 경로 확인 필요', recommendation: '푸터와 결제 버튼 주변에 사업자 정보, 문의 이메일, 약관 링크를 반복 노출합니다.', code: 'DEFAULT-TRUST' },
    { priority: 'P2', category: '결제 전 안내', title: '제공 범위와 결제 후 제공 시점 확인', evidence: '가격, 포함 항목, 산출물 제공 시점 확인 필요', recommendation: '가격 포함 항목, 산출물 제공 시점, 환불 제한 조건을 결제 전 요약합니다.', code: 'DEFAULT-SCOPE' },
    { priority: 'P2', category: '모바일 UX·CTA', title: '모바일 다음 행동 주변 정책 링크 확인', evidence: '모바일 화면에서 긴 문구와 정책 링크 가독성 확인 필요', recommendation: '버튼 주변 문구를 짧게 나누고 정책 링크가 접히지 않게 배치합니다.', code: 'DEFAULT-MOBILE-CTA' },
    { priority: 'P2', category: '광고·표현 리스크', title: '성과 보장형 표현 완화 확인', evidence: '혜택 문구와 조건·예외 기준 확인 필요', recommendation: '성과 보장처럼 보이는 문장은 조건형 설명과 확인 필요 고지로 바꿉니다.', code: 'DEFAULT-CLAIM' }
  ];
  const seen = new Set(rows.map((item) => text(item?.code || item?.title || '')));
  const padded = rows.concat(fallbackRows.filter((item) => !seen.has(text(item.code || item.title))));
  return padded.slice(0, limit);
}
function titleCandidates(order, scan) {
  const domain = text(scan?.target || order?.domain || '운영 사이트', '운영 사이트');
  return [
    `${domain} 운영 리스크 진단 및 개선 리포트`,
    `결제 전 신뢰 공백을 줄이기 위한 VERIDION 점검 결과`,
    `정책·환불·개인정보 안내 구조 개선 제안서`,
    `사이트 전환을 막는 신뢰 요소 점검과 수정 우선순위`,
    `고객 문의와 분쟁 가능성을 줄이는 운영 문구 개선안`
  ];
}
function buildFaqs(plan) {
  const common = [
    { q: '이 산출물이 법률 자문인가요?', a: '아닙니다. 본 산출물은 사이트 운영 문구와 고지 구조를 정리하는 참고 자료입니다. 실제 법률 판단은 공식 원문 또는 전문가 검토가 필요합니다.' },
    { q: '결과가 매출 개선을 보장하나요?', a: '보장하지 않습니다. 다만 결제 전 사용자가 확인하는 정책, 환불, 고객지원, 개인정보 안내를 명확히 정리해 전환 흐름의 불확실성을 줄이는 데 목적이 있습니다.' },
    { q: '어디부터 적용하면 되나요?', a: 'P0/P1로 표시된 항목부터 적용하고, 결제 버튼 주변·푸터·정책 페이지·입력폼 순서로 재점검하는 것을 권장합니다.' }
  ];
  if (plan === 'Auto' || plan === 'Agency') {
    common.push({ q: '콘텐츠 업데이트 글은 어떤 기준으로 생성되나요?', a: '한 줄 홍보가 아니라 제목 후보, 도입, 문제 제기, 해결 과정, 신뢰 근거, FAQ, 자연스러운 다음 행동, 태그를 포함하는 3,800~4,500자 포스팅 구조를 기준으로 생성합니다.' });
  }
  return common;
}
function buildTags(order, scan) {
  const industry = text(scan?.industry || '운영리스크', '운영리스크').replace(/\s+/g, '');
  return ['VERIDION', 'NV0', '사이트진단', '신뢰도점검', '환불정책', '개인정보처리방침', '전환개선', industry, text(order?.plan || '리포트', '리포트')].filter(Boolean).slice(0, 12);
}
function buildEvidenceMatrix(scan) {
  const findings = topFindings(scan, 4);
  return findings.map((item) => ({
    claim: `${findingTitle(item)} 항목은 우선 확인이 필요합니다.`,
    basis: text(item.evidence || item.code || '진단 규칙 기반 감지', '진단 규칙 기반 감지'),
    requiredCheck: '공식 정책 문서, 실제 운영 화면, 결제 전 고지 위치 확인 필요',
    bannedExpression: '위반 확정, 과태료 확정, 매출 개선 보장'
  }));
}
function buildQualityContract(order) {
  return {
    version: 'premium-service-output-maximized',
    outputLevel: 'commercial-ready',
    language: 'ko',
    intent: '문의 또는 체험 신청 전환과 결제 후 실행 지원',
    requiredBlocks: ['제목 후보', '도입', '문제 제기', '해결 과정', '신뢰 근거', 'FAQ', '자연스러운 CTA', '태그', '수용 기준', '재점검 기준'],
    safetyRules: ['법률 자문 단정 금지', '결과 보장 금지', '확인되지 않은 정책·가격 단정 금지', '사용자 입력을 실행 가능한 마크업으로 렌더링 금지'],
    qualityGate: { minSections: 10, minFaqs: 3, minTags: 7, minAcceptanceChecks: 10, minMeasurementItems: 5, plan: text(order?.plan || '') }
  };
}
function buildExecutiveBrief(order, offer, scan, businessProfile) {
  const findings = topFindings(scan, 3);
  const score = number(scan?.riskScore, 72);
  return {
    purpose: '사이트 담당자가 문제를 빠르게 이해하고, 수정 적용 순서와 결제 후 제공 범위를 즉시 판단하도록 구성합니다.',
    target: text(scan?.target || order?.domain || '진단 대상 사이트', '진단 대상 사이트'),
    riskScore: score,
    riskLevel: text(scan?.riskLevel || riskLabel(score), riskLabel(score)),
    trustHealth: scoreToHealth(score),
    findingsCount: number(scan?.totalFindings, findings.length),
    topFindingTitles: findings.map(findingTitle),
    recommendedPlan: text(order?.plan || offer?.title || 'Report', 'Report'),
    valuePosition: `${currencyWon(planPrice(order, offer))} 가격으로 ${currencyWon(builtValue(order, offer))} 상당의 구성 가치를 목표로 설계한 산출물입니다. 이 표현은 내부 구성 가치 기준이며 결과 보장을 의미하지 않습니다.`,
    supportEmail: text(businessProfile?.contactEmail || '', '확인 필요')
  };
}
function section(title, objective, body, actionItems = [], acceptanceCriteria = []) {
  return { title, objective, body, actionItems, acceptanceCriteria };
}
function buildCoreSections(order, offer, scan) {
  const findings = topFindings(scan, 5);
  const score = number(scan?.riskScore, 72);
  const issueList = findings.map((item, index) => `${index + 1}. [${text(item.priority || 'P2')}] ${findingTitle(item)} — ${findingRecommendation(item)}`).join('\n');
  const projected = clamp(score + Math.max(8, Math.min(18, findings.length * 3 + 6)), score, 95);
  return [
    section(
      '1. 제목 후보',
      '사이트 담당자와 팀 공유자가 산출물의 목적을 즉시 이해하도록 제목 선택지를 제공합니다.',
      titleCandidates(order, scan).map((item, index) => `${index + 1}. ${item}`).join('\n'),
      ['상황에 맞는 제목 1개를 선택해 팀 공유 또는 고객 안내 자료에 사용합니다.'],
      ['제목만 보고 진단 대상, 개선 목적, 산출물 성격이 드러나야 합니다.']
    ),
    section(
      '2. 도입',
      '문제를 과장하지 않고 현재 상태와 개선 필요성을 설명합니다.',
      `이번 산출물은 ${text(scan?.target || order?.domain || '운영 사이트')}의 공개 화면과 진단 규칙을 기준으로 운영 리스크와 전환 공백을 정리한 자료입니다. 현재 종합 리스크 점수는 ${score}/100, 상태는 ${text(scan?.riskLevel || riskLabel(score))}로 분류됩니다.\n\n이 점수는 법률 위반 여부를 확정하는 값이 아니라, 고객이 결제 전 확인하는 정책·환불·개인정보·고객지원·사업자 정보의 명확도를 기준으로 정리한 내부 진단 지표입니다.`,
      ['결과를 내부 회의, 개발 전달, 운영 문구 수정의 기준 자료로 활용합니다.'],
      ['법률 위반 확정처럼 읽히지 않아야 하며, 확인 필요 항목은 별도로 표시해야 합니다.']
    ),
    section(
      '3. 문제 제기',
      '고객 이탈과 문의 증가를 만들 수 있는 신뢰 공백을 구체화합니다.',
      `주요 문제는 다음과 같습니다.\n${issueList}\n\n이 항목들은 고객이 결제 전 확인하는 정보와 직접 연결됩니다. 기준이 모호하면 고객은 결제를 미루거나 추가 문의를 남기고, 사이트 담당자는 같은 설명을 반복해야 할 수 있습니다.`,
      findings.map(item => `${findingTitle(item)} 위치와 현재 문구를 확인합니다.`),
      ['각 문제는 페이지 위치, 영향, 수정 방향이 함께 제시되어야 합니다.']
    ),
    section(
      '4. 해결 과정',
      '발견 항목을 실제 적용 순서로 바꿉니다.',
      '해결은 P0/P1 항목부터 진행합니다. 먼저 결제 버튼 주변과 상품 상세에 환불·교환·제공 범위를 보강하고, 다음으로 개인정보 입력폼 주변의 수집 목적과 보유기간 안내를 정리합니다. 이후 푸터와 정책 페이지 연결을 점검하고, 마지막으로 모바일 화면에서 버튼·표·고지 문구가 겹치지 않는지 재검사합니다.',
      ['P0/P1 항목 우선 수정', '결제 전 고지 위치 보강', '정책 페이지 링크 확인', '모바일 재점검', '동일 URL 재진단'],
      ['수정 전후 문구가 비교 가능해야 합니다.', '재진단 시 동일 항목이 줄어들었는지 확인해야 합니다.']
    ),
    section(
      '5. 신뢰 근거',
      '주장과 근거, 확인 필요 항목을 분리합니다.',
      buildEvidenceMatrix(scan).map((row, index) => `${index + 1}. 주장: ${row.claim}\n근거: ${row.basis}\n확인 필요: ${row.requiredCheck}\n금지 표현: ${row.bannedExpression}`).join('\n\n'),
      ['공식 정책 또는 실제 운영 화면에서 확인 가능한 정보만 확정 표현으로 사용합니다.'],
      ['출처가 불분명한 정보는 확인 필요로 표시해야 합니다.']
    ),
    section(
      '6. FAQ',
      '가격·신뢰·법률 단정 우려를 줄입니다.',
      buildFaqs(order?.plan).map((item, index) => `Q${index + 1}. ${item.q}\nA. ${item.a}`).join('\n\n'),
      ['고객 문의 답변, 상세 페이지 하단, 콘텐츠 업데이트 다음 행동 글에 재사용합니다.'],
      ['FAQ는 과장 없이 불안을 줄여야 하며 구매 강요 문구를 반복하지 않아야 합니다.']
    ),
    section(
      '7. 자연스러운 CTA',
      '문제 인식 후 결제 또는 문의로 이어지게 만듭니다.',
      `무료 요약으로 문제의 방향을 확인했다면, 다음 단계는 실제 수정 기준을 받는 것입니다. ${text(offer?.title || order?.plan || '상세 리포트')}는 문제 위치, 수정 우선순위, 적용 문구, 재점검 기준을 함께 제공합니다. 결제 전 제공 범위와 환불 기준을 확인한 뒤 필요한 범위만 선택하세요.`,
      ['버튼 문구: 상세 리포트 보기', '버튼 문구: 수정 문구안 받기', '버튼 문구: 체험 신청하기'],
      ['다음 행동 버튼은 불안 제거 문단과 함께 배치되어야 합니다.']
    ),
    section(
      '8. 태그',
      '검색과 내부 분류에 사용할 태그를 제공합니다.',
      buildTags(order, scan).map(tag => `#${tag}`).join(' '),
      ['게시판, 관리 화면, 콘텐츠 업데이트 콘텐츠 분류에 사용합니다.'],
      ['최소 7개 이상의 관련 태그가 포함되어야 합니다.']
    ),
    section(
      '9. 개선 후 예상 상태',
      '개선 목표를 수치화하되 결과 보장을 피합니다.',
      `현재 점수는 ${score}/100이며, 우선순위 항목을 정리한 뒤 내부 모델 기준 개선 목표 점수는 ${projected}/100입니다. 이 수치는 산출물 구성과 재점검 기준을 설명하기 위한 내부 시뮬레이션이며 법적 안전성이나 매출 개선을 보장하지 않습니다.`,
      ['수정 후 동일 URL로 재진단합니다.', '남은 항목은 P2 개선 목록으로 이관합니다.'],
      ['점수 표현 옆에 보장 아님 고지를 함께 표시합니다.']
    ),
    section(
      '10. 수용 기준',
      '산출물을 받은 뒤 적용 완료 여부를 스스로 검수할 수 있게 합니다.',
      buildAcceptanceChecklist(order, scan).map((item, index) => `${index + 1}. ${item}`).join('\n'),
      ['내부 담당자가 항목별로 완료/보류/확인 필요를 표시합니다.', '보류 항목은 다음 개선 요청으로 이관합니다.'],
      ['최소 10개 이상의 검수 항목이 있어야 합니다.', '확인 필요 항목은 단정 표현으로 바꾸지 않습니다.']
    ),
    section(
      '11. 재점검 기준',
      '수정 후 같은 기준으로 다시 판단할 수 있게 합니다.',
      buildMeasurementPlan(scan).map((item, index) => `${index + 1}. ${item.metric}\n현재: ${item.before}\n목표: ${item.afterTarget}\n확인 방법: ${item.checkMethod}`).join('\n\n'),
      ['수정 전 점수와 수정 후 점수를 같은 화면에서 비교합니다.', '문구 적용 위치와 모바일 표시 상태를 함께 기록합니다.'],
      ['재진단 결과가 보장처럼 표시되지 않아야 합니다.', '변화가 없으면 원인 항목을 다시 확인해야 합니다.']
    ),
    section(
      '12. 담당자별 실행 메모',
      '운영·개발·마케팅·검수 담당자가 같은 산출물을 각자 실행할 수 있게 분리합니다.',
      Object.entries(buildStakeholderHandoff(order, scan)).map(([role, items]) => `${role}:\n${items.map((item, index) => `- ${item}`).join('\n')}`).join('\n\n'),
      ['역할별 담당자를 지정합니다.', '각 담당자는 완료 근거를 남깁니다.'],
      ['역할별 실행 항목이 최소 3개 이상이어야 합니다.']
    )
  ];
}
function buildFixes(scan) {
  return topFindings(scan, 6).map((item, index) => ({
    title: findingTitle(item),
    priority: text(item.priority || (index < 2 ? 'P1' : 'P2')),
    category: text(item.category || '운영 고지'),
    before: text(item.evidence || '현재 화면에서 문구 위치 또는 세부 기준이 명확하지 않습니다.', '현재 화면에서 문구 위치 또는 세부 기준이 명확하지 않습니다.'),
    after: findingRecommendation(item),
    rationale: '고객이 결제 전 확인해야 할 정보를 한 번에 파악하도록 문구와 위치를 정리합니다.',
    whereToApply: ['상품 상세 상단 또는 결제 버튼 주변', '푸터 또는 고객지원 영역', '정책 페이지 본문'],
    acceptanceCriteria: ['고객이 제공 범위와 제한 조건을 결제 전에 확인할 수 있음', '모바일 화면에서 문구가 접히거나 겹치지 않음', '정책 링크가 실제 페이지로 연결됨'],
    qaPrompt: '수정 후 동일 URL로 재진단하고 해당 항목의 재발 여부를 확인합니다.'
  }));
}
function buildTemplates(existingDocuments = []) {
  const defaults = [
    { title: '개인정보 처리방침 보완 초안', purpose: '수집 목적, 항목, 보유기간, 파기 절차를 한 화면에서 확인 가능하게 정리', content: '본 서비스는 문의 응대와 서비스 제공을 위해 필요한 최소한의 개인정보를 수집합니다. 수집 항목, 이용 목적, 보유기간, 파기 절차는 실제 운영 기준에 맞게 확인 후 기재해야 합니다.', usageNote: '실제 수집 항목과 보유기간은 사이트 담당자가 확인해야 합니다.' },
    { title: '환불·교환 안내 보완 초안', purpose: '결제 전 환불 가능 범위와 제한 조건을 명확히 안내', content: '환불·교환 기준은 상품 또는 서비스의 성격, 산출물 제공 시작 여부, 관련 정책과 약관에 따라 달라질 수 있습니다. 결제 전 제공 범위와 제한 조건을 반드시 확인해 주세요.', usageNote: '디지털 산출물 제공 시점과 환불 제한 조건은 실제 정책 기준으로 확인해야 합니다.' },
    { title: '고객지원 안내 초안', purpose: '문의 경로와 응답 기준을 명확히 고지', content: '서비스 이용 중 문의가 필요한 경우 고객지원 이메일을 통해 접수할 수 있습니다. 접수된 문의는 영업일 기준 확인 후 순차적으로 안내합니다.', usageNote: '응답 시간과 운영 시간은 실제 운영 정책에 맞게 기재합니다.' }
  ];
  const normalized = Array.isArray(existingDocuments) ? existingDocuments.map(item => ({ ...item, purpose: item.purpose || '정책 문서 기본 구조 제공', usageNote: item.usageNote || '실제 운영 기준에 맞게 확인 후 사용하세요.' })) : [];
  return normalized.length ? normalized : defaults;
}
function buildGuide(industryGuide) {
  const checklist = Array.isArray(industryGuide?.checklist) ? industryGuide.checklist : [];
  return {
    ...industryGuide,
    purpose: '업종별로 먼저 확인해야 할 운영 고지와 표현 리스크를 정리합니다.',
    checklist,
    sop: [
      '상품 또는 서비스 상세 페이지에서 필수 고지 위치를 확인합니다.',
      '결제 버튼 주변에 환불·제공 범위·문의 경로를 재배치합니다.',
      '입력폼에는 개인정보 수집 목적과 보유기간을 함께 표시합니다.',
      '수정 후 모바일 화면과 데스크톱 화면을 각각 확인합니다.',
      '재진단 결과를 기록하고 남은 항목을 다음 개선 목록으로 이동합니다.'
    ],
    riskMatrix: [
      { level: 'P0', meaning: '결제 전 정보 불명확으로 즉시 보완 권장', action: '결제 버튼 주변과 정책 페이지를 우선 수정' },
      { level: 'P1', meaning: '고객 문의와 분쟁 가능성을 높일 수 있음', action: '문구 보완 후 재진단' },
      { level: 'P2', meaning: '운영 신뢰도를 더 높이기 위한 개선 항목', action: '정기 점검 목록으로 관리' }
    ],
    prohibitedExpressions: ['무조건 해결', '100% 보장', '법률 위반 확정', '과태료 확정', '매출 상승 보장']
  };
}
function buildAutoPublishingPlan(order, scan) {
  const tags = buildTags(order, scan);
  return {
    qualityStandard: 'cta-board-v6.7-encyclopedic-router',
    purpose: '방치된 사이트 인상을 줄이고 문의 또는 체험 신청으로 연결하는 운영 콘텐츠를 자동 생성합니다.',
    postStructure: ['제목 후보 3~5개', '도입 2문단', '문제 제기', '해결 과정', '신뢰 근거', 'FAQ 2~3개', '자연스러운 CTA', '태그'],
    lengthKo: '3,800~4,500자',
    sampleTitles: titleCandidates(order, scan).slice(0, 4),
    sampleCta: '현재 사이트의 신뢰 공백을 먼저 확인하고, 필요한 경우 상세 리포트 또는 수정 문구안을 선택하세요.',
    tags,
    safety: ['법률 단정 금지', '성과 보장 금지', '확인되지 않은 가격·정책 단정 금지']
  };
}
function buildImplementationPlan(order, scan) {
  return [
    { step: 1, title: '핵심 리스크 확인', output: '상위 P0/P1 항목과 영향 정리', owner: '사이트 담당자', done: '문제 위치와 수정 방향이 확인됨' },
    { step: 2, title: '문구 적용', output: '환불·개인정보·고객지원 문구 보완', owner: '운영/개발', done: '결제 전 화면에서 문구 확인 가능' },
    { step: 3, title: '콘텐츠 보강', output: 'FAQ·CTA·태그·콘텐츠 업데이트 글 적용', owner: '마케팅', done: '게시판 또는 랜딩에 3,800자 이상 포스팅 반영' },
    { step: 4, title: '재진단', output: '동일 URL 재검사 및 잔여 항목 관리', owner: '사이트 담당자', done: '점수와 발견 항목 변동 확인' }
  ];
}
function buildPurposeOptimization(order, offer, scan) {
  const plan = text(order?.plan || 'Report');
  const common = {
    plan,
    primaryIntent: '사이트 담당자가 문제를 이해하고 결제 후 바로 적용 가능한 실행 기준을 받도록 설계',
    targetReader: '쇼핑몰·랜딩·서비스 사이트 담당자, 마케팅 담당자, 내부 의사결정자',
    outputUseCase: '진단 결과 공유, 개발·운영 전달, 정책 문구 수정, 다음 행동 콘텐츠 발행, 재점검 기준 수립',
    notIncluded: ['법률 자문', '위반 여부 확정', '매출 상승 보장', '외부 기관 공식 인증']
  };
  const map = {
    Report: {
      productIntent: '의사결정용 정밀 리포트',
      optimizedFor: ['문제 파악 속도', '위험 우선순위', '결제 전 신뢰 공백 설명', '팀 공유'],
      successCriteria: ['3분 안에 핵심 문제를 이해할 수 있음', 'P0/P1 개선 순서가 명확함', '상세 결제 필요성이 자연스럽게 설명됨']
    },
    '전문가 리포트': {
      productIntent: '복사해서 적용하는 수정 문구안',
      optimizedFor: ['수정 전/후 비교', '적용 위치', '모바일 문구 길이', '검수 기준'],
      successCriteria: ['문구를 바로 복사해 적용할 수 있음', '적용 위치가 페이지 단위로 구분됨', '재진단 기준이 포함됨']
    },
    '문서 초안': {
      productIntent: '운영 운영 문서 초안 패키지',
      optimizedFor: ['정책 문서 기본 구조', '확인 필요 변수 분리', '사용 전 검수', '사이트 담당자 맞춤 수정'],
      successCriteria: ['확인 필요 항목이 명확함', '문서별 목적과 사용 위치가 구분됨', '공식 원문 확인 필요 고지가 유지됨']
    },
    IndustryGuide: {
      productIntent: '업종별 운영 SOP와 체크리스트',
      optimizedFor: ['업종별 위험 항목', '금지 표현', '운영 절차', '반복 점검'],
      successCriteria: ['현장 담당자가 순서대로 점검 가능함', '금지 표현과 대체 문구가 구분됨', '정기 점검 항목으로 전환 가능함']
    },
    Basic: {
      productIntent: '월간 기본 모니터링',
      optimizedFor: ['반복 점검', '상위 이슈 추적', '간단 수정', '내역 관리'],
      successCriteria: ['월간 변화가 기록됨', '상위 항목이 누락되지 않음', 'Basic 범위가 과장되지 않음']
    },
    Pro: {
      productIntent: '정기 개선 실행 패키지',
      optimizedFor: ['리포트', '수정 문구', '템플릿', '재검사', '성과 관찰'],
      successCriteria: ['리포트와 실행안이 연결됨', '수정 전후 비교가 가능함', '다음 개선 과제가 남음']
    },
    Auto: {
      productIntent: '정기 진단 + 콘텐츠 업데이트 운영',
      optimizedFor: ['자동 고객 안내 콘텐츠', '운영 리듬', '콘텐츠 품질', '반복 전환'],
      successCriteria: ['3,800~4,500자 포스팅 구조 준수', '과장 표현이 배제됨', '문의 또는 체험 신청 다음 행동 버튼이 자연스러움']
    },
    Agency: {
      productIntent: '복수 도메인 대행사 운영 패키지',
      optimizedFor: ['클라이언트 보고', '도메인별 우선순위', '반복 납품', '운영 효율'],
      successCriteria: ['도메인별 결과가 분리됨', '클라이언트 공유용 요약이 포함됨', '담당자별 실행 항목이 명확함']
    },
    Certified: {
      productIntent: '사이트 담당자 검토 전제 인증 후보 산출물',
      optimizedFor: ['검토 후보 상태 표시', '요건 충족 여부', '재검토 절차', '오해 방지'],
      successCriteria: ['공식 인증처럼 오인되지 않음', '검토 전제와 보류 조건이 명확함', '사이트 담당자 확인 절차가 포함됨']
    }
  };
  return { ...common, ...(map[plan] || map.Report) };
}
function buildDeliverableIndex(order, scan) {
  const plan = text(order?.plan || 'Report');
  const findings = topFindings(scan, 5);
  return [
    { name: '요약 대시보드', purpose: '점수·상태·주요 문제를 즉시 파악', included: true, depth: '핵심 핵심 지표 + 해석 문장' },
    { name: '상세 문제 분석', purpose: '문제 위치와 고객 영향 설명', included: true, depth: `${findings.length}개 상위 항목 중심` },
    { name: '수정 문구안', purpose: '바로 적용 가능한 문구 제공', included: ['전문가 리포트','Pro','Auto','Agency','Certified'].includes(plan), depth: '수정 전/후 + 적용 위치 + 검수 기준' },
    { name: '정책 템플릿', purpose: '운영 문서 초안 제공', included: ['문서 초안','Pro','Auto','Agency'].includes(plan), depth: '목적 + 본문 + 사용 전 확인' },
    { name: '업종별 SOP', purpose: '반복 운영 절차화', included: ['IndustryGuide','Pro','Auto','Agency'].includes(plan), depth: '체크리스트 + 금지 표현 + 위험 매트릭스' },
    { name: '고객 안내 콘텐츠', purpose: '문의·체험 신청 전환 보조', included: ['Auto','Agency'].includes(plan), depth: '3,800~4,500자 구조 + FAQ + 태그' },
    { name: '재점검 기준', purpose: '수정 후 효과 확인', included: true, depth: '수용 기준 + 재진단 루틴' }
  ];
}
function buildConversionCopyPack(order, offer, scan) {
  const plan = text(order?.plan || 'Report');
  const title = text(offer?.title || plan, plan);
  return {
    heroTitles: [
      '무료 진단에서 끝내지 말고 실제 수정 기준까지 확인하세요',
      '결제 전 고객이 망설이는 지점을 리포트로 정리합니다',
      '문제 발견 이후 바로 적용 가능한 개선안을 받아보세요'
    ],
    opening: `현재 사이트의 핵심 문제를 확인했다면 다음 단계는 실행 가능한 수정 기준을 받는 것입니다. ${title}는 요약 점수, 문제 원인, 수정 방향, FAQ, 다음 행동, 태그, 재점검 기준을 한 번에 정리합니다.`,
    problemStatement: '고객은 결제 전에 환불 기준, 개인정보 안내, 고객지원 경로, 제공 범위를 확인합니다. 이 정보가 분산되거나 모호하면 문의가 늘고 결제 판단이 지연될 수 있습니다.',
    trustProof: '진단 결과는 입력 URL의 공개 화면과 내부 점검 규칙을 기준으로 구성되며, 확인되지 않은 법률·정책·가격 정보는 확인 필요로 분리합니다.',
    ctaButtons: ['상세 리포트 확인', '수정 문구안 받기', '체험 신청하기', '포트원으로 결제 시작'],
    faqShort: buildFaqs(plan).slice(0, 3),
    tags: buildTags(order, scan)
  };
}
function buildAcceptanceChecklist(order, scan) {
  const plan = text(order?.plan || 'Report');
  const base = [
    '제목 후보가 3개 이상 포함되어 있는가',
    '도입이 현재 상태와 산출물 목적을 설명하는가',
    '문제 제기가 고객 영향과 연결되어 있는가',
    '해결 과정이 순서형으로 제시되어 있는가',
    '신뢰 근거와 확인 필요 정보가 분리되어 있는가',
    'FAQ가 가격·신뢰·법률 단정 우려를 줄이는가',
    '다음 행동 버튼이 강매가 아니라 다음 행동 안내로 구성되어 있는가',
    '태그가 최소 7개 이상이며 검색·분류에 쓸 수 있는가',
    '모바일 화면에서 긴 문구가 겹치지 않는가',
    '법률 자문 또는 성과 보장처럼 읽히는 표현이 없는가'
  ];
  if (['전문가 리포트','Pro','Auto','Agency'].includes(plan)) base.push('수정 전/후 문구와 적용 위치가 포함되어 있는가');
  if (['Auto','Agency'].includes(plan)) base.push('콘텐츠 업데이트 다음 행동 버튼이 3,800~4,500자 포스팅 구조를 유지하는가');
  return base;
}
function buildMeasurementPlan(scan) {
  const score = number(scan?.riskScore, 72);
  return [
    { metric: '리스크 점수', before: `${score}/100`, afterTarget: `${clamp(score + 12, score, 95)}/100`, checkMethod: '동일 URL 재진단' },
    { metric: 'P0/P1 발견 항목', before: '현재 상위 항목 기준', afterTarget: '우선순위 항목 감소', checkMethod: '상세 발견 목록 비교' },
    { metric: '결제 전 안내 명확도', before: '문구 위치 확인 필요', afterTarget: '결제 버튼 주변에서 제공 범위·환불·문의 경로 확인', checkMethod: '모바일/데스크톱 수동 검수' },
    { metric: '콘텐츠 전환 연결', before: '다음 행동 미흡 또는 단문', afterTarget: 'FAQ와 자연스러운 다음 행동 포함', checkMethod: '게시판/랜딩 본문 검수' },
    { metric: '운영 재현성', before: '담당자별 판단 의존', afterTarget: '체크리스트와 SOP 기준 반복 가능', checkMethod: '수용 기준 체크' }
  ];
}
function buildRiskRegister(scan) {
  return [
    { risk: '법률 자문으로 오해될 가능성', mitigation: '법률 자문 아님과 공식 원문 확인 필요 문구를 산출물 상단과 하단에 반복 표시', owner: '사이트 담당자' },
    { risk: '확인되지 않은 정책·가격 단정', mitigation: '확인 필요 항목을 별도 표기하고 공개 확인 가능한 범위만 확정 표현 사용', owner: '작성자' },
    { risk: '모바일에서 긴 문구 겹침', mitigation: '카드형 단락, 줄바꿈, 긴 URL/태그 래핑 기준 적용', owner: '개발/QA' },
    { risk: '콘텐츠 업데이트 글 품질 저하', mitigation: '제목 후보·도입·문제 제기·해결 과정·신뢰 근거·FAQ·CTA·태그 검증 게이트 적용', owner: '콘텐츠 운영' }
  ];
}
function buildStakeholderHandoff(order, scan) {
  return {
    operator: ['P0/P1 항목부터 적용', '확인 필요 정보를 실제 운영 자료로 보완', '수정 후 동일 URL 재진단'],
    developer: ['결제 버튼 주변 고지 위치 반영', '정책 링크 연결 확인', '모바일 겹침과 접근성 라벨 확인'],
    marketer: ['제목 후보와 FAQ를 랜딩/게시판에 재활용', '자연스러운 다음 행동 버튼을 문의 또는 체험 신청으로 연결', '태그 기반 분류 관리'],
    reviewer: ['법률 단정·성과 보장 표현 제거', '출처 불명확 정보 확인 필요 표기', '환불/개인정보/이용약관 링크 검수']
  };
}
function buildOutputPerformanceProfile(order, offer, scan) {
  const demoAccuracy = buildDemoAccuracyContract(scan || {}, { plan: order?.plan });
  return {
    level: 'premium-service-output-max',
    detailDepth: '결제 후 실행 가능한 문서·문구·FAQ·CTA·태그·재점검 기준까지 포함',
    valueMultiple: '가격 대비 4배 전후 구성 가치 기준. 실제 성과 보장이 아니라 산출물 구성 기준입니다.',
    renderPerformance: ['카드형 섹션', '긴 문장 자동 줄바꿈', '모바일 1열 재배치', 'PDF 다운로드 라인 확장'],
    safetyPerformance: ['HTML 실행 렌더링 금지', '법률 단정 차단', '확인 필요 분리', '개인정보·토큰 노출 금지'],
    demoAccuracyScore: demoAccuracy.score,
    outputAccuracyTarget: '근거·한계·직접 확인·재점검 기준을 분리해 오탐과 과장 표현을 줄이는 품질 목표'
  };
}
export function buildPremiumPurchasedAsset({ order, offer, scan, site, businessProfile, policyDocuments = [], industryGuide }) {
  const demoIssueOverview = buildDemoIssueOverview(scan || {}, { plan: order?.plan });
  const paidFullDetailContract = buildPaidFullDetailContract({ scan: scan || {}, order: order || {}, asset: { plan: order?.plan || offer?.code || 'Report' } });
  const siteOperationsDocument = buildSiteOperationsDocument(scan || {}, { site, order, industry: industryGuide?.industry, settings: businessProfile || {}, asset: { plan: order?.plan || offer?.code || 'Report' } });
  const conversionUrgency = buildConversionUrgencyModel(scan || {}, { plan: order?.plan || offer?.code || 'Report' });
  const base = {
    qualityContract: buildQualityContract(order),
    titleCandidates: titleCandidates(order, scan),
    executiveBrief: buildExecutiveBrief(order, offer, scan, businessProfile),
    sections: buildCoreSections(order, offer, scan),
    fixes: buildFixes(scan),
    templates: buildTemplates(policyDocuments),
    guide: buildGuide(industryGuide),
    faqs: buildFaqs(order?.plan),
    tags: buildTags(order, scan),
    evidenceMatrix: buildEvidenceMatrix(scan),
    implementationPlan: buildImplementationPlan(order, scan),
    autoPublishingPlan: buildAutoPublishingPlan(order, scan),
    naturalCta: `현재 사이트의 문제를 확인했다면, 다음 단계는 실제 적용 가능한 수정 기준을 받는 것입니다. ${text(offer?.title || order?.plan || '상세 리포트')}에서 우선순위와 문구안을 확인하세요.`,
    customerVisibleConversionCopy: `전환 위기도 ${conversionUrgency.crisisScore}/100 · ${conversionUrgency.crisisLabel}. 무료 요약은 방향 확인, 유료 산출물은 전체 근거와 수정 실행 문서를 제공합니다.`,
    valueStatement: `${currencyWon(planPrice(order, offer))} 가격으로 ${currencyWon(builtValue(order, offer))} 상당의 구성 가치를 목표로 설계했습니다. 가격은 낮추되 전체 상세, 수정 문구, 운영 문서 품질은 잠급니다. 이 표현은 산출물 구성 기준이며 성과 보장이 아닙니다.`,
    legalDisclaimer: SAFE_DISCLAIMER,
    purposeOptimization: buildPurposeOptimization(order, offer, scan),
    deliverableIndex: buildDeliverableIndex(order, scan),
    conversionCopyPack: buildConversionCopyPack(order, offer, scan),
    acceptanceChecklist: buildAcceptanceChecklist(order, scan),
    measurementPlan: buildMeasurementPlan(scan),
    riskRegister: buildRiskRegister(scan),
    stakeholderHandoff: buildStakeholderHandoff(order, scan),
    outputPerformanceProfile: buildOutputPerformanceProfile(order, offer, scan),
    demoIssueOverview,
    paidFullDetailContract,
    siteOperationsDocument,
    conversionUrgency,
    demoAccuracyContract: buildDemoAccuracyContract(scan || {}, { plan: order?.plan }),
    paidDeliverableBlueprint: buildPaidDeliverableBlueprint(scan || {}, text(order?.plan || offer?.code || 'Report')),
    renderedFor: { siteId: order?.siteId || site?.siteId || null, domain: order?.domain || site?.domain || scan?.target || null }
  };
  const enrichedBase = {
    ...base,
    diagnosisAccuracyProfile: buildDiagnosisAccuracyProfile(scan || {}),
    reportQualityProfile: buildReportQualityProfile(base, scan || {}),
    fulfillmentQualityProfile: buildFulfillmentQualityProfile(order || {}, base, scan || {}),
    paidOutputQualityGate: buildPaidOutputQualityGate({ order: order || {}, asset: base, scan: scan || {} }),
    outputQualityLock: buildOutputQualityLock({ order: order || {}, asset: base, scan: scan || {} })
  };
  const plan = text(order?.plan || 'Report');
  const withServiceQualityGate = (asset) => {
    const reportQualityProfile = buildReportQualityProfile(asset, scan || {});
    const fulfillmentQualityProfile = buildFulfillmentQualityProfile(order || {}, asset, scan || {});
    const paidOutputQualityGate = buildPaidOutputQualityGate({ order: order || {}, asset: { ...asset, reportQualityProfile, fulfillmentQualityProfile }, scan: scan || {} });
    const outputQualityLock = buildOutputQualityLock({ order: order || {}, asset: { ...asset, reportQualityProfile, fulfillmentQualityProfile, paidOutputQualityGate }, scan: scan || {} });
    return { ...asset, reportQualityProfile, fulfillmentQualityProfile, paidOutputQualityGate, outputQualityLock }; 
  };
  if (plan === 'Report') {
    const asset = { ...enrichedBase, type: 'report', title: '정밀 리스크 리포트', downloadable: true, fixes: [], templates: [], guide: null, autoPublishingPlan: null };
    return withServiceQualityGate(asset);
  }
  if (plan === '전문가 리포트') {
    const asset = { ...enrichedBase, type: 'fix_pack', title: '수정 문구안 패키지', downloadable: true, templates: [], guide: null, autoPublishingPlan: null };
    return withServiceQualityGate(asset);
  }
  if (plan === '문서 초안') {
    const asset = { ...enrichedBase, type: 'template_pack', title: '법률 문서 템플릿 팩', downloadable: true, fixes: [], guide: null, autoPublishingPlan: null };
    return withServiceQualityGate(asset);
  }
  if (plan === 'IndustryGuide') {
    const asset = { ...enrichedBase, type: 'industry_guide', title: `${text(industryGuide?.industry || '업종별')} 운영 리스크 가이드`, downloadable: true, fixes: [], templates: [], autoPublishingPlan: null };
    return withServiceQualityGate(asset);
  }
  if (plan === 'Certified') {
    const asset = { ...enrichedBase, type: 'certification', title: 'NV0 Certified 인증 후보', downloadable: false, certificationStatus: 'pending_operator_review', fixes: buildFixes(scan).slice(0, 3), templates: [], autoPublishingPlan: null };
    return withServiceQualityGate(asset);
  }
  if (['Basic', 'Pro', 'Auto', 'Agency'].includes(plan)) {
    const isAuto = plan === 'Auto' || plan === 'Agency';
    const asset = {
      ...enrichedBase,
      type: 'subscription_entitlement',
      title: `${text(offer?.title || plan)} 실행 권한`,
      downloadable: true,
      entitlement: { plan, active: true, included: offer?.deliverables || [], renewal: offer?.period || 'monthly' },
      fixes: plan === 'Basic' ? buildFixes(scan).slice(0, 2) : buildFixes(scan),
      templates: plan === 'Basic' ? [] : buildTemplates(policyDocuments),
      autoPublishing: isAuto,
      autoPublishingPlan: isAuto ? buildAutoPublishingPlan(order, scan) : null
    };
    return withServiceQualityGate(asset);
  }
  const asset = { ...enrichedBase, type: 'generic', title: text(offer?.title || plan), downloadable: true };
  return withServiceQualityGate(asset);
}

export function buildPremiumAssetPdfLines(asset, order) {
  const lines = [
    asset.title || asset.productTitle || 'NV0 산출물',
    `주문번호: ${order?.id || '확인 필요'}`,
    `상품: ${order?.plan || asset.plan || '확인 필요'}`,
    asset.legalDisclaimer || SAFE_DISCLAIMER,
    asset.valueStatement || ''
  ].filter(Boolean);
  if (asset.executiveBrief) {
    lines.push(`요약: 위험도 ${asset.executiveBrief.riskScore}/100 · ${asset.executiveBrief.riskLevel}`);
    lines.push(`주요 문제: ${(asset.executiveBrief.topFindingTitles || []).join(' / ')}`);
  }
  if (asset.diagnosisAccuracyProfile) lines.push(`진단 신뢰도: ${asset.diagnosisAccuracyProfile.score}/100 · ${asset.diagnosisAccuracyProfile.label} · 오탐 위험 ${asset.diagnosisAccuracyProfile.falsePositiveRisk}`);
  if (asset.reportQualityProfile) lines.push(`리포트 품질: ${asset.reportQualityProfile.score}/100 · ${asset.reportQualityProfile.label}`);
  if (asset.fulfillmentQualityProfile) lines.push(`납품 게이트: ${asset.fulfillmentQualityProfile.score}/100 · ${asset.fulfillmentQualityProfile.deliveryState}`);
  if (asset.demoIssueOverview) lines.push(`무료 데모 노출 범위: 문제영역 ${asset.demoIssueOverview.areaCount}개 · 요소 ${asset.demoIssueOverview.elementCount}개 · 발견 ${asset.demoIssueOverview.totalIssueCount}개`);
  if (asset.conversionUrgency) lines.push(`전환 위기도: ${asset.conversionUrgency.crisisScore}/100 · ${asset.conversionUrgency.crisisLabel} · 예상 개선 후 ${asset.conversionUrgency.projectedAfterFixScore}/100`);
  if (asset.paidFullDetailContract) lines.push(`유료 전체 공개 게이트: ${asset.paidFullDetailContract.completenessScore}/100 · 전체 상세 ${asset.paidFullDetailContract.allDetailsVisible ? '공개' : '보완 필요'} · ${asset.paidFullDetailContract.issueDetails?.length || 0}개 항목`);
  if (asset.siteOperationsDocument) lines.push(`맞춤 운영 문서: ${asset.siteOperationsDocument.qualityScore}/100 · ${asset.siteOperationsDocument.sections?.length || 0}개 섹션 · ${asset.siteOperationsDocument.title}`);
  if (asset.outputQualityLock) lines.push(`가격 인하 품질 잠금: ${asset.outputQualityLock.score}/100 · ${asset.outputQualityLock.ok ? '통과' : '보완 필요'} · 전체 상세/수정 문구/운영 문서 유지`);
  for (const sec of asset.sections || []) lines.push(`${sec.title}: ${sec.body}`);
  for (const fix of asset.fixes || []) lines.push(`${fix.title}: ${fix.after || fix.rationale || ''}`);
  for (const tpl of asset.templates || []) lines.push(`${tpl.title}: ${String(tpl.content || '').slice(0, 700)}`);
  if (asset.guide?.checklist) lines.push(`체크리스트: ${asset.guide.checklist.join(' / ')}`);
  if (asset.autoPublishingPlan?.postStructure) lines.push(`콘텐츠 업데이트 기준: ${asset.autoPublishingPlan.postStructure.join(' / ')}`);
  if (asset.purposeOptimization) lines.push(`목적 최적화: ${asset.purposeOptimization.productIntent || asset.purposeOptimization.primaryIntent}`);
  if (asset.deliverableIndex) lines.push(`산출물 구성: ${asset.deliverableIndex.map(item => `${item.name}(${item.included ? '포함' : '비포함'})`).join(' / ')}`);
  if (asset.acceptanceChecklist) lines.push(`수용 기준: ${asset.acceptanceChecklist.join(' / ')}`);
  if (asset.measurementPlan) lines.push(`재점검 지표: ${asset.measurementPlan.map(item => `${item.metric}-${item.checkMethod}`).join(' / ')}`);
  if (asset.riskRegister) lines.push(`리스크 관리: ${asset.riskRegister.map(item => `${item.risk}: ${item.mitigation}`).join(' / ')}`);
  return lines;
}

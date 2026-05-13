// server/core/risk-scanner.js

const RISK_RULES = {
  ECOMMERCE: {
    id: 'ecommerce',
    name: '전자상거래 고지',
    riskKeywords: ['환불 불가', '교환 불가', '책임지지 않습니다', '단순 변심 불가'],
    suggestion: '소비자보호법에 따라 정당한 사유 없는 환불/교환 불가 고지는 무효가 될 수 있습니다. 정확한 청약철회 조건을 명시하세요.'
  },
  PRIVACY: {
    id: 'privacy',
    name: '개인정보 안내',
    riskKeywords: ['비밀번호 수집', '주민등록번호', '영구 보관', '동의 없이'],
    suggestion: '개인정보 수집 목적과 보관 기간, 파기 절차를 명확히 안내하는 처리방침 링크를 추가해야 합니다.'
  },
  EXAGGERATION: {
    id: 'exaggeration',
    name: '표시광고 표현',
    riskKeywords: ['100% 보장', '무조건', '확정 수익', '최저가 보장', '절대'],
    suggestion: '객관적인 근거 없는 "100% 보장" 등의 표현은 기만적 표시광고로 제재받을 수 있으므로 주의 표현으로 수정하세요.'
  }
};

function generateRiskReport(content, planType = 'FREE_DEMO') {
  const detectedRisks = [];
  let totalRiskCount = 0;

  for (const [key, rule] of Object.entries(RISK_RULES)) {
    const matches = rule.riskKeywords.filter(keyword => content.includes(keyword));
    if (matches.length > 0) {
      totalRiskCount += matches.length;
      detectedRisks.push({
        category: rule.name,
        matchedWords: matches,
        suggestion: rule.suggestion
      });
    }
  }

  const report = {
    analyzedAt: new Date().toISOString(),
    totalRiskCount: totalRiskCount,
    isLegalAdvice: false, 
    disclaimer: "본 리포트는 법률 자문이 아니며, 위반 및 과태료 부과 여부를 확정하지 않습니다." 
  };

  if (planType === 'FREE_DEMO') {
    report.summary = detectedRisks.map(risk => ({ category: risk.category, count: risk.matchedWords.length }));
    report.message = "무료 데모: 영역/요소/구분별 리스크 후보 요약입니다. 상세 근거를 보려면 플랜을 업그레이드하세요.";
  } else if (planType === 'BASIC') {
    report.details = detectedRisks.map(risk => ({ category: risk.category, detectedWords: risk.matchedWords, actionRequired: "수동 확인 필요" }));
    report.message = "기본 리포트: 상세 근거 및 우선순위가 반영된 확인 필요 항목입니다.";
  } else if (planType === 'EXPERT') {
    report.expertDetails = detectedRisks.map(risk => ({ category: risk.category, detectedWords: risk.matchedWords, recommendedAction: risk.suggestion, priority: "HIGH" }));
    report.message = "전문가 리포트: 수정 문구, 적용 순서, 운영 체크리스트가 포함된 종합 해결책입니다.";
  }

  return report;
}

module.exports = { generateRiskReport, RISK_RULES };

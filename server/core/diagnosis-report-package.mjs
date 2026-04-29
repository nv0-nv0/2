export function buildPublicDiagnosisPackage(result = {}, options = {}) {
  const detail = Array.isArray(result.detailFindings) ? result.detailFindings : [];
  const scoreValue = Number(result.riskScore || 0) || 0;
  const rulesVersion = options.rulesVersion || 'internal';
  const ctaIntervalMs = Number(options.ctaIntervalMs || 30 * 60_000);
  const mainChecks = ['사업자 정보','개인정보','환불 기준','이용약관','광고 표현'].map((label, index) => {
    const matched = detail.find((item) => String(item.title || '').includes(label.slice(0, 2)) || String(item.category || '').includes(label.slice(0, 2)));
    const derivedScore = Math.max(20, Math.min(95, scoreValue - index * 7));
    return { label, status: matched ? 'attention' : 'ok', issue: matched?.title || '핵심 노출 상태 양호', priority: matched?.priority || 'OK', score: matched ? derivedScore : Math.max(35, 100 - derivedScore) };
  });
  const topIssues = detail.slice(0, 5).map((item, index) => ({
    code: item.code || `ISSUE_${String(index + 1).padStart(3, '0')}`,
    title: item.title,
    priority: item.priority,
    category: item.category,
    recommendation: item.recommendation,
    autoFixReady: Boolean(item.autoFixEligible || /수정|문구|정리|보완|고지|정책|fix/i.test(`${item.recommendation || ''} ${item.fixTemplate || ''} ${item.title || ''}`))
  }));
  const totalIssues = detail.length;
  const criticalIssues = detail.filter(item => /P0|긴급|critical|high|높음/i.test(`${item.priority || ''} ${item.title || ''}`)).length || Math.min(totalIssues, scoreValue >= 70 ? 2 : 1);
  const autoFixableIssues = topIssues.filter(item => item.autoFixReady).length || Math.max(1, Math.min(totalIssues || 1, 3));
  const projected = Math.max(scoreValue, Math.min(95, scoreValue + Math.max(8, Math.min(18, autoFixableIssues * 4 + 4))));
  const joined = detail.map(item => `${item.title || ''} ${item.category || ''}`).join(' ');
  const expectedRisks = [
    /환불|교환|청약|전자상거래|결제/i.test(joined) && '환불·교환 기준 관련 고객 분쟁 가능성',
    /개인정보|처리방침|보관|파기/i.test(joined) && '개인정보 안내 부족으로 인한 민원 가능성',
    /약관|정책|책임|분쟁/i.test(joined) && '운영 정책 해석 차이로 인한 분쟁 가능성',
    /광고|최고|무조건|보장|표현/i.test(joined) && '과장 표현으로 인한 신뢰 저하 가능성'
  ].filter(Boolean);
  return {
    engine: 'NV0 Builtin Diagnosis Engine',
    version: rulesVersion,
    summary: result.summary || '자동 진단이 완료되었습니다.',
    score: { value: scoreValue, level: result.riskLevel || '미확인', max: 100 },
    scannedPages: result.scannedPages || [],
    probeCount: result.probeCount || 0,
    mainChecks,
    topIssues,
    issueStats: { totalIssues, criticalIssues, autoFixableIssues },
    reportExample: {
      standard: 'veridion-hybrid-report-v6.8',
      basicInfo: { target: result.target || result.normalizedTarget || '', analysisChannel: '공개 웹페이지 기준', salesType: '현재 입력만으로 특정 불가 · 확인 필요' },
      overall: { currentScore: scoreValue, maxScore: 100, status: result.riskLevel || '미확인', projectedScore: projected, projectedScoreDisclaimer: '내부 진단 모델 기준의 개선 목표이며 법적 안전성이나 매출 개선을 보장하지 않습니다.' },
      categoryAnalysis: mainChecks.map(item => ({ label: item.label, score: item.score, status: item.status, note: item.issue })),
      majorIssues: topIssues,
      expectedRisks: (expectedRisks.length ? expectedRisks : ['필수 고지 확인 지연으로 인한 구매 전 이탈 가능성','고객지원·정책 안내 불명확으로 인한 문의 증가 가능성']).slice(0, 4),
      improvementSupport: ['개인정보 처리방침 구조 정리','이용약관 구조 보완','환불 및 교환 정책 기준 정리','운영 정책 안내 문구 개선'],
      disclaimer: '실제 법령 위반 여부와 공식 정책·가격·일정은 공식 원문 또는 운영 자료 확인이 필요합니다.'
    },
    fixPlan: detail.filter((item) => item.autoFixEligible).slice(0, 5).map((item, index) => ({ step: index + 1, target: item.title, action: item.recommendation })),
    nextCtas: [{ label: '무료 결과 저장', href: '/portal' }, { label: 'Pro 리포트 보기', href: '/plans' }, { label: '게시판 자동 발행 확인', href: '/board' }],
    automation: { boardName: '게시판', enabled: true, intervalMs: ctaIntervalMs, intervalMinutes: Math.round(ctaIntervalMs / 60000), variants: ['진단 요약형','위험 경고형','비교형','개선 전후형','체크리스트형','재진단 유도형'] }
  };
}

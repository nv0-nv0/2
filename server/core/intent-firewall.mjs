const SOFTWARE_QA_SIGNALS = [
  '페이지 수정 요청서', '전역 재검수', '재검수', '100점', '완성시켜', '시스템 개선', '시스템 강화',
  '구조', '엔진', '배점', 'P0', 'P1', 'P2', 'QA', '검증', '회귀', '오분류', '롤백', '납품',
  '테스트', '체크섬', 'MANIFEST', 'SHA256SUMS', '파일 전체', '즉시 적용', '품질 향상', '정확도 향상'
];

const BLOG_CONTENT_SIGNALS = [
  '구매링크', '네이버 모바일', '블로그 작성', '후기 작성', '정보성', '홍보성', '체험단', '내돈내산', '태그', '제목 후보'
];

const COMPARISON_TABLE_SIGNALS = ['비교', '장단점', '배점', '표로', '표 정리', '점수표'];
const BLOG_PLATFORM_SIGNALS = ['블로그 플랫폼', '플랫폼별 블로그', '네이버 블로그', '티스토리', '워드프레스'];
const BANNED_BLOG_OUTPUT_SECTIONS = ['[최종 원고]', '[제목 후보', '[모바일 가독성', '[태그]', '네이버 모바일 후기', '정보성 후기'];

export function normalizeInput(input) {
  return String(input ?? '').replace(/\s+/g, ' ').trim();
}

export function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function countSignals(text, signals) {
  return signals.reduce((count, signal) => count + (text.includes(signal) ? 1 : 0), 0);
}

function buildCandidates(primary, scores) {
  const rows = [
    ['software_delivery_qa', scores.software],
    ['naver_product_promo', scores.blog],
    ['comparison_table', scores.comparison]
  ].sort((a, b) => b[1] - a[1]);
  const normalized = rows.map(([niche, score], index) => ({ rank: index + 1, niche, score }));
  if (normalized[0].niche !== primary) {
    const idx = normalized.findIndex(row => row.niche === primary);
    if (idx > 0) [normalized[0], normalized[idx]] = [normalized[idx], normalized[0]];
    normalized.forEach((row, index) => { row.rank = index + 1; });
  }
  return normalized.slice(0, 3);
}

export function classifyIntent(input) {
  const text = normalizeInput(input);
  const softwareSignals = countSignals(text, SOFTWARE_QA_SIGNALS);
  const blogSignals = countSignals(text, BLOG_CONTENT_SIGNALS);
  const comparisonSignals = countSignals(text, COMPARISON_TABLE_SIGNALS) + countSignals(text, BLOG_PLATFORM_SIGNALS);

  const hasWorkOrderShape = /\[최종 페이지 수정 요청서\]|우선순위|완료 기준|롤백 기준|검증 방법|P0|P1|P2/i.test(text);
  const hasExplicitSoftwareGuard = softwareSignals >= 2 || hasWorkOrderShape;
  const hasExplicitBlogPublishing = blogSignals >= 2 && /작성|원고|구매링크|네이버 모바일/.test(text);
  const hasBlogPlatformComparison = comparisonSignals >= 3 && countSignals(text, BLOG_PLATFORM_SIGNALS) >= 1;

  let niche = 'software_delivery_qa';
  let mode = 'dev_brief';
  let channel = 'development_qa_delivery';
  let outputContract = '[최종 페이지 수정 요청서]';
  let reason = 'software_delivery_qa_guard_default';

  if (hasExplicitSoftwareGuard) {
    reason = 'work_order_or_global_reaudit_guard';
  } else if (hasExplicitBlogPublishing) {
    niche = 'naver_product_promo';
    mode = 'publishable_article';
    channel = 'naver_mobile_content';
    outputContract = '[최종 원고]';
    reason = 'explicit_blog_publishing_request';
  } else if (hasBlogPlatformComparison) {
    niche = 'comparison_table';
    mode = 'score_table';
    channel = 'analysis_table';
    outputContract = '블로그 플랫폼 비교·배점표';
    reason = 'explicit_blog_platform_comparison';
  }

  const scores = {
    software: Math.min(100, 35 + softwareSignals * 12 + (hasWorkOrderShape ? 25 : 0)),
    blog: Math.min(100, 10 + blogSignals * 18 + (hasExplicitBlogPublishing ? 30 : 0)),
    comparison: Math.min(100, 10 + comparisonSignals * 14 + (hasBlogPlatformComparison ? 20 : 0))
  };

  const confidence = Math.max(0.61, Math.min(0.99, (niche === 'software_delivery_qa' ? scores.software : niche === 'naver_product_promo' ? scores.blog : scores.comparison) / 100));

  return {
    niche,
    mode,
    channel,
    outputContract,
    confidence: Number(confidence.toFixed(2)),
    reason,
    candidates: buildCandidates(niche, scores),
    manualOverride: {
      enabled: true,
      allowedNiches: ['software_delivery_qa', 'naver_product_promo', 'comparison_table'],
      defaultNiche: niche
    },
    renderPolicy: {
      userInputSink: 'textContent',
      htmlEscapeRequired: true,
      escapedPreview: escapeHTML(text).slice(0, 500)
    }
  };
}

export function renderDecisionContract(decision) {
  const top = decision.candidates.map(c => `${c.rank}. ${c.niche}(${c.score})`).join(' / ');
  return [
    `출력계약: ${decision.outputContract}`,
    `니치: ${decision.niche}`,
    `모드: ${decision.mode}`,
    `채널: ${decision.channel}`,
    `신뢰도: ${decision.confidence}`,
    `후보 TOP3: ${top}`,
    `수동 보정: ${decision.manualOverride.enabled ? '가능' : '불가'}`,
    `렌더링: ${decision.renderPolicy.userInputSink} + escapeHTML`
  ].join('\n');
}

export function assertNoBlogContamination(output) {
  const text = String(output ?? '');
  const contamination = BANNED_BLOG_OUTPUT_SECTIONS.filter(token => text.includes(token));
  if (contamination.length) {
    throw new Error(`blog output contamination detected: ${contamination.join(', ')}`);
  }
  return true;
}

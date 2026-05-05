import assert from 'node:assert/strict';
import { classifyIntent, escapeHTML, renderDecisionContract, assertNoBlogContamination } from '../server/core/intent-firewall.mjs';

const workOrderComplaint = `[최종 작업지시서]
대상
파일 전체 하고 강화 업그레이드 가능한 것들 전체 갯수 파악하고 해. 만들고 즉시 적용 처리
목표
- 사용자의 실제 의도를 최우선으로 판정한다.
- 작업지시서 요청은 블로그 원고나 블로그 작성 프롬프트로 절대 변환하지 않는다.
- 제품 전역 재검수 결과를 100점 기준으로 배점하고, P0/P1/P2 작업 단위로 완료 기준을 고정한다.
검증 방법: 사용자 불만 원문을 그대로 입력한다. 금지값: 블로그 원고 섹션, 정보성 후기 문구, 네이버 모바일 후기 문구`;

const cases = [
  {
    name: '작업지시서 불만 원문',
    input: workOrderComplaint,
    expected: { niche: 'software_delivery_qa', mode: 'dev_brief', outputContract: '[최종 작업지시서]' },
    forbidden: ['[최종 원고]', '네이버 모바일 후기', '정보성 후기']
  },
  {
    name: '전역 재검수 단문',
    input: '제품 전역 재검수 시스템 개선 강화 가능한 부분 전부 찾아서 배점하고 100점으로 완성시켜',
    expected: { niche: 'software_delivery_qa', mode: 'dev_brief', outputContract: '[최종 작업지시서]' },
    forbidden: ['[최종 원고]', '제품 홍보성 블로그']
  },
  {
    name: '구조 시스템 엔진 강화 단문',
    input: '구조와 시스템 엔진 전부 다 최대로 강화해 전역 배점해서 전체 100점짜리로',
    expected: { niche: 'software_delivery_qa', mode: 'dev_brief', outputContract: '[최종 작업지시서]' },
    forbidden: ['[최종 원고]', '네이버 모바일']
  },
  {
    name: '정상 제품 블로그',
    input: '디퓨저 구매링크 제품 정보성+홍보성 네이버 모바일 블로그 작성',
    expected: { niche: 'naver_product_promo', mode: 'publishable_article', outputContract: '[최종 원고]' }
  },
  {
    name: '표 명시 블로그 플랫폼 비교',
    input: '플랫폼별 블로그 장단점 비교해서 배점. 표로 정리',
    expected: { niche: 'comparison_table', mode: 'score_table', outputContract: '블로그 플랫폼 비교·배점표' }
  },
  {
    name: '악성 HTML 입력',
    input: '<img src=x onerror=alert(1)><script>alert(2)</script> 작업지시서 전역 재검수 100점',
    expected: { niche: 'software_delivery_qa', mode: 'dev_brief', outputContract: '[최종 작업지시서]' },
    mustEscape: true
  },
  {
    name: '짧은 입력',
    input: '완성',
    expected: { niche: 'software_delivery_qa', mode: 'dev_brief', outputContract: '[최종 작업지시서]' }
  },
  {
    name: '긴 입력',
    input: `${'품질 향상 정확도 향상 '.repeat(300)} 전역 재검수 100점 P0 P1 P2`,
    expected: { niche: 'software_delivery_qa', mode: 'dev_brief', outputContract: '[최종 작업지시서]' }
  }
];

for (const item of cases) {
  const decision = classifyIntent(item.input);
  assert.equal(decision.niche, item.expected.niche, `${item.name}: niche`);
  assert.equal(decision.mode, item.expected.mode, `${item.name}: mode`);
  assert.equal(decision.outputContract, item.expected.outputContract, `${item.name}: outputContract`);
  assert(decision.candidates.length === 3, `${item.name}: 후보 TOP3`);
  assert(decision.confidence >= 0.61, `${item.name}: confidence`);
  assert.equal(decision.manualOverride.enabled, true, `${item.name}: manual override`);
  assert.equal(decision.renderPolicy.userInputSink, 'textContent', `${item.name}: render sink`);
  assert.equal(decision.renderPolicy.htmlEscapeRequired, true, `${item.name}: escape policy`);
  const contract = renderDecisionContract(decision);
  assert(contract.includes('후보 TOP3'), `${item.name}: contract candidates`);
  assert(contract.includes('수동 보정: 가능'), `${item.name}: contract manual override`);
  if (item.expected.niche === 'software_delivery_qa') assertNoBlogContamination(contract);
  if (item.forbidden) for (const token of item.forbidden) assert(!contract.includes(token), `${item.name}: forbidden ${token}`);
  if (item.mustEscape) {
    const escaped = escapeHTML(item.input);
    assert(!escaped.includes('<script>'), `${item.name}: script escaped`);
    assert(escaped.includes('&lt;script&gt;'), `${item.name}: escaped preview`);
    assert(decision.renderPolicy.escapedPreview.includes('&lt;img'), `${item.name}: decision escaped preview`);
  }
}

console.log(JSON.stringify({ ok: true, suite: 'GOLDEN_CORE', cases: cases.length, gates: 8, checkedAt: new Date().toISOString() }, null, 2));

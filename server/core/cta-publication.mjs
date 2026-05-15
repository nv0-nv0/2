function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}
function fingerprint(value = '') {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
function hashInt(value = '') {
  return Number.parseInt(fingerprint(value).slice(0, 8), 16) || 0;
}
function pick(list, seed, offset = 0) {
  const arr = Array.isArray(list) ? list.filter(Boolean) : [];
  if (!arr.length) return '';
  return arr[Math.abs(hashInt(`${seed}:${offset}`)) % arr.length];
}
function unique(items = []) {
  return Array.from(new Set(items.map(item => String(item || '').trim()).filter(Boolean)));
}
function clampText(value = '', max = 155) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
function listText(items = []) {
  const list = Array.isArray(items) ? items.map(item => String(item || '').trim()).filter(Boolean).slice(0, 3) : [];
  return list.length ? list.join(', ') : '고객 안내, 환불 기준, 개인정보 안내 위치';
}

function readableTarget(value = '등록 사이트') {
  const raw = normalizeText(value, '등록 사이트');
  try {
    const url = /^https?:\/\//i.test(raw) ? new URL(raw) : null;
    return url?.hostname ? url.hostname.replace(/^www\./, '') : raw;
  } catch {
    return raw.replace(/^https?:\/\//i, '').replace(/^www\./, '').split('/')[0] || '등록 사이트';
  }
}

function keywordBase(industry = '온라인 사업', topic = {}) {
  const compact = String(industry || '온라인 사업').replace(/\s+/g, ' ').trim();
  return unique([`${compact} 사이트 점검`, topic.primaryKeyword, ...(topic.secondaryKeywords || [])]).filter(Boolean);
}
function bodyWordEstimate(topic = {}, faqSet = []) {
  const source = [topic.headline, topic.angle, topic.primaryKeyword, ...(topic.secondaryKeywords || []), ...faqSet.flat()].join(' ');
  return Math.max(900, source.length * 6);
}

function tagsFor(industry, topic = {}, seed = '') {
  const compact = String(industry || '온라인사업').replace(/\s+/g, '');
  const keywordTags = keywordBase(industry, topic).map(item => `#${item.replace(/[\s·/]+/g, '')}`);
  const base = [`#${compact}`, '#사이트점검', '#무료진단', '#고객안내', '#CTA', '#리스크점검', `#${String(topic.ctaType || '운영').replace(/_/g, '')}`];
  const extra = pick([
    ['#전환율개선', '#문의전환', '#상세페이지'],
    ['#쇼핑몰운영', '#정책점검', '#신뢰도개선'],
    ['#첫 화면', '#구매전환', '#운영체크리스트'],
    ['#개인정보처리방침', '#환불정책', '#약관점검']
  ], seed, 3) || [];
  return unique([...base, ...keywordTags, ...extra]).slice(0, 12);
}

const TOPIC_PACKS = [
  { ctaType: 'diagnosis_summary', boardType: 'cta', primaryKeyword: '무료 사이트 진단', headline: '진단 결과 요약', angle: '현재 위험도를 빠르게 이해하고 다음 행동으로 연결', intent: '정보 탐색형', funnel: '인지', persona: '첫 방문 사이트 담당자', secondaryKeywords: ['사이트 신뢰도 점검', '고객 안내 공백'], intro: ['처음 방문한 고객은 상품보다 먼저 사이트가 믿을 만한지 확인합니다.', '진단 결과는 점수보다 고객이 멈추는 지점을 찾는 데 의미가 있습니다.'], problem: ['사업자 정보, 환불 기준, 개인정보 안내, 문의 경로가 흐릿하면 구매나 체험 신청 직전에 이탈할 수 있습니다.'], cta: '무료 진단으로 현재 안내 공백을 먼저 확인하세요.' },
  { ctaType: 'risk_alert', boardType: 'notice', primaryKeyword: '쇼핑몰 운영 리스크', headline: '운영 리스크 알림', angle: '민원과 분쟁 가능성을 줄이는 우선순위', intent: '문제 인식형', funnel: '인지', persona: '운영 책임자', secondaryKeywords: ['환불 배송 고지', '정책 누락 점검'], intro: ['환불, 배송, 개인정보, 약관은 평소에는 눈에 띄지 않지만 문의가 생기면 가장 먼저 확인됩니다.'], problem: ['기준이 명확하지 않으면 고객 응대 시간이 늘고 불필요한 오해가 생길 수 있습니다.'], cta: '리스크가 보이는 항목부터 상세 리포트에서 위치와 문구 후보를 확인하세요.' },
  { ctaType: 'conversion_checklist', boardType: 'notice', primaryKeyword: '구매 전환 체크리스트', headline: '전환 전 체크리스트', angle: '광고·문의·결제 전 확인할 실무 점검표', intent: '실행 준비형', funnel: '고려', persona: '마케터', secondaryKeywords: ['CTA 점검', '첫 화면 점검'], intro: ['광고를 집행하기 전에 고객이 확인할 안내가 준비되어 있는지 먼저 봐야 합니다.'], problem: ['푸터, 상세 페이지, 결제 직전, 회원가입 단계가 서로 따로 움직이면 전환 흐름이 끊길 수 있습니다.'], cta: '체크리스트를 직접 적용하기 어렵다면 진단 결과를 저장하고 FixPack 또는 상세 리포트로 이어가세요.' },
  { ctaType: 'before_after', boardType: 'case', primaryKeyword: '사이트 문구 수정 전후', headline: '수정 전후 비교', angle: '고객 안내 문구를 더 명확하게 바꾸는 예시', intent: '비교 검토형', funnel: '고려', persona: '콘텐츠 담당자', secondaryKeywords: ['광고 문구 개선', '상세페이지 문구'], intro: ['같은 내용이라도 표현 방식에 따라 고객이 느끼는 신뢰가 달라집니다.'], problem: ['조건 없는 표현은 운영 기준과 맞지 않을 때 오해를 만들 수 있으므로 범위와 예외를 분리해야 합니다.'], cta: '내 사이트 문구를 수정 전후로 비교하고 싶다면 FixPack 문구안을 확인하세요.' },
  { ctaType: 'case_study', boardType: 'case', primaryKeyword: '온라인 사업자 점검 사례', headline: '운영 사례 기반 안내', angle: '비슷한 사이트가 먼저 정리하는 항목', intent: '사례 탐색형', funnel: '고려', persona: '소상공인 사이트 담당자', secondaryKeywords: ['쇼핑몰 사례', '문의 감소'], intro: ['업종이 달라도 고객이 확인하는 기본 정보는 비슷합니다.'], problem: ['문제는 한 페이지가 아니라 여러 화면 사이의 연결에서 자주 생깁니다. 홈에는 안내가 있지만 결제 화면에는 없는 식입니다.'], cta: '비슷한 구조의 사이트가 어떤 항목부터 정리하는지 상세 리포트와 Auto 플랜을 함께 검토하세요.' },
  { ctaType: 'plan_compare', boardType: 'cta', primaryKeyword: '사이트 진단 리포트 비교', headline: '플랜 선택 기준', angle: '무료 진단 이후 필요한 산출물을 고르는 방법', intent: '상업 조사형', funnel: '결정', persona: '구매 검토자', secondaryKeywords: ['상세 리포트', 'FixPack', 'Auto 정기 케어'], intro: ['무료 진단은 문제 발견에 집중하고, 유료 산출물은 실제 반영 기준을 정리하는 데 목적이 있습니다.'], problem: ['단순 확인, 문구 수정, 문서 초안, 반복 관리는 서로 다른 산출물이 필요합니다.'], cta: '무료 결과를 확인했다면 지금 필요한 산출물 유형을 기준으로 플랜을 비교하세요.' },
  { ctaType: 'privacy_tip', boardType: 'notice', primaryKeyword: '개인정보처리방침 위치', headline: '개인정보 안내 위치 점검', angle: '입력 직전 고지와 동의 흐름 정리', intent: '문제 해결형', funnel: '고려', persona: '회원가입 폼 사이트 담당자', secondaryKeywords: ['개인정보 수집 동의', '입력 폼 안내'], intro: ['개인정보 안내는 문서가 존재하는 것만으로 충분하지 않습니다. 입력하는 순간에 확인할 수 있어야 합니다.'], problem: ['푸터 링크가 있어도 입력 폼 주변에서 확인하기 어렵다면 고객은 불안감을 느낄 수 있습니다.'], cta: '개인정보 안내 문구 위치와 표현은 상세 리포트에서 페이지별로 확인하세요.' },
  { ctaType: 'terms_tip', boardType: 'notice', primaryKeyword: '이용약관 연결 구조', headline: '약관 연결 구조 점검', angle: '서비스 이용 기준과 제한 조건을 고객 흐름에 맞게 연결', intent: '문제 해결형', funnel: '고려', persona: '서비스 사이트 담당자', secondaryKeywords: ['약관 링크', '결제 전 고지'], intro: ['이용약관은 사이트 하단에만 두면 고객이 실제 행동 전에 확인하기 어렵습니다.'], problem: ['주요 제한 조건이 결제 화면과 떨어져 있으면 분쟁 상황에서 설명 부담이 커질 수 있습니다.'], cta: '약관 구조와 결제 전 고지를 함께 정리하려면 TemplatePack 또는 FixPack 산출물을 확인하세요.' },
  { ctaType: 'ad_copy_review', boardType: 'case', primaryKeyword: '광고 문구 점검', headline: '광고 표현 점검', angle: '확정형·보장형 표현을 완화하는 실무 가이드', intent: '문제 해결형', funnel: '고려', persona: '광고 담당자', secondaryKeywords: ['첫 화면 문구', '성과 보장 표현'], intro: ['광고나 첫 화면에서는 강한 표현이 전환에 도움이 될 것처럼 보입니다.'], problem: ['무조건, 완벽, 확정처럼 근거 확인이 필요한 표현은 범위를 분리해서 안내하는 편이 안전합니다.'], cta: '광고 문구와 버튼 안내를 더 안전하게 정리하려면 FixPack 수정 전후 문구안을 확인하세요.' },
  { ctaType: 'rescan', boardType: 'cta', primaryKeyword: '수정 후 재진단', headline: '수정 후 재진단', angle: '개선이 실제 화면에 반영됐는지 확인하는 절차', intent: '실행 검증형', funnel: '결정', persona: '개발·운영 담당자', secondaryKeywords: ['재점검', '개선 확인'], intro: ['사이트를 한 번 수정했다고 모든 화면이 동시에 정리되는 것은 아닙니다.'], problem: ['수정 후 재진단을 하지 않으면 어떤 부분이 개선됐고 어떤 항목이 남았는지 알기 어렵습니다.'], cta: '수정 후 상태를 관리하려면 내 사이트에 결과를 저장하고 재진단 기능을 사용하세요.' },
  { ctaType: 'saved_site', boardType: 'cta', primaryKeyword: '사이트 반복 관리', headline: '사이트 저장과 반복 관리', angle: '한 번의 진단을 운영 루틴으로 연결', intent: '유지 관리형', funnel: '결정', persona: '반복 사이트 담당자', secondaryKeywords: ['내 사이트 관리', '정기 점검'], intro: ['사이트 운영은 한 번 점검으로 끝나지 않습니다. 상품과 이벤트가 바뀌면 안내 문구도 함께 바뀌어야 합니다.'], problem: ['진단 결과를 저장하지 않으면 이전 상태와 현재 상태를 비교하기 어렵습니다.'], cta: '내 사이트 관리에 결과를 저장하고 반복 점검 루틴을 만들어 보세요.' },
  { ctaType: 'weekly_ops', boardType: 'notice', primaryKeyword: '주간 사이트 운영 점검', headline: '주간 운영 루틴', angle: '정기적으로 안내와 버튼 안내를 점검하는 운영 방식', intent: '유지 관리형', funnel: '유지', persona: '운영 매니저', secondaryKeywords: ['운영 루틴', '게시판 관리'], intro: ['사이트는 오픈 직후보다 운영 중에 더 많은 공백이 생깁니다.'], problem: ['방치된 게시판, 오래된 공지, 맞지 않는 버튼 안내는 고객에게 운영이 멈춘 인상을 줄 수 있습니다.'], cta: '반복 운영이 필요하다면 Auto 정기 케어로 진단과 게시판 발행을 함께 관리하세요.' },
  { ctaType: 'refund_policy', boardType: 'notice', primaryKeyword: '환불 정책 안내', headline: '환불 기준 정리', angle: '고객 문의를 줄이는 환불·청약철회 안내 구성', intent: '문제 해결형', funnel: '고려', persona: 'CS 담당자', secondaryKeywords: ['취소 안내', '교환 반품 정책'], intro: ['환불 기준은 고객이 불만을 느낀 뒤가 아니라 구매 전에 확인할 수 있어야 합니다.'], problem: ['조건, 기간, 예외가 분리되어 있지 않으면 같은 문의가 반복될 수 있습니다.'], cta: '환불 기준을 구매 흐름에 맞게 정리하려면 TemplatePack 초안을 확인하세요.' },
  { ctaType: 'footer_trust', boardType: 'notice', primaryKeyword: '푸터 사업자 정보', headline: '푸터 신뢰 정보 점검', angle: '하단 정보만 정리해도 고객 불안을 줄이는 방법', intent: '문제 해결형', funnel: '인지', persona: '초기 창업자', secondaryKeywords: ['사업자 정보 표시', '고객센터 안내'], intro: ['고객은 의심이 생겼을 때 상세 설명보다 먼저 푸터와 고객센터 정보를 확인합니다.'], problem: ['상호, 대표자, 연락 경로, 정책 링크가 흩어져 있으면 작은 불안도 이탈로 이어질 수 있습니다.'], cta: '푸터 신뢰 정보를 먼저 정리하고 무료 진단으로 누락 항목을 확인하세요.' },
  { ctaType: 'mobile_readability', boardType: 'case', primaryKeyword: '모바일 상세페이지 점검', headline: '모바일 가독성 점검', angle: '작은 화면에서 CTA와 정책 링크가 보이는지 확인', intent: '실행 준비형', funnel: '고려', persona: '모바일 유입 사이트 담당자', secondaryKeywords: ['모바일 CTA', '상세페이지 개선'], intro: ['모바일 유입이 많은 사이트는 정책 링크와 CTA의 위치가 전환에 직접 영향을 줍니다.'], problem: ['PC에서는 보이던 안내가 모바일에서는 접히거나 버튼 아래로 밀리는 경우가 많습니다.'], cta: '모바일 기준으로 다시 확인하려면 진단 결과에서 화면별 우선순위를 확인하세요.' },
  { ctaType: 'lead_form', boardType: 'case', primaryKeyword: '문의폼 전환 개선', headline: '문의폼 안내 개선', angle: '입력 부담을 줄이고 문의 완료율을 높이는 방법', intent: '전환 개선형', funnel: '결정', persona: '리드 수집 담당자', secondaryKeywords: ['결제', '폼 이탈'], intro: ['문의폼은 짧을수록 좋은 것이 아니라 고객이 왜 입력해야 하는지 이해할 수 있어야 합니다.'], problem: ['수집 항목의 목적, 응답 시간, 개인정보 안내가 부족하면 마지막 단계에서 이탈이 생깁니다.'], cta: '문의폼 주변 문구를 정리하려면 FixPack에서 수정 후보를 받아보세요.' },
  { ctaType: 'checkout_friction', boardType: 'case', primaryKeyword: '결제 이탈 점검', headline: '결제 직전 이탈 점검', angle: '결제 버튼 앞에서 고객이 멈추는 이유 정리', intent: '전환 개선형', funnel: '결정', persona: '커머스 사이트 담당자', secondaryKeywords: ['결제 전 고지', '구매 전환'], intro: ['결제 직전에는 가격보다 불확실성이 더 큰 이탈 요인이 될 수 있습니다.'], problem: ['환불, 배송, 디지털 산출물 제공 시점, 문의 경로가 결제 화면에 연결되지 않으면 고객이 확인을 미루게 됩니다.'], cta: '결제 전 안내를 정리하려면 상세 리포트에서 페이지별 개선 항목을 확인하세요.' },
  { ctaType: 'content_refresh', boardType: 'notice', primaryKeyword: '오래된 공지 정리', headline: '콘텐츠 최신성 점검', angle: '오래된 공지와 안내문을 운영 신뢰로 바꾸는 방법', intent: '유지 관리형', funnel: '유지', persona: '콘텐츠 사이트 담당자', secondaryKeywords: ['공지 관리', '게시판 운영'], intro: ['오래된 공지는 정보가 틀리지 않아도 운영이 멈춘 인상을 줄 수 있습니다.'], problem: ['이벤트 종료, 가격 변경, 정책 변경이 반영되지 않으면 고객은 최신 여부를 다시 문의하게 됩니다.'], cta: '정기 점검이 필요하다면 Auto 플랜으로 진단과 발행 루틴을 함께 관리하세요.' },
  { ctaType: 'local_service', boardType: 'case', primaryKeyword: '지역 서비스 사이트 점검', headline: '지역 기반 서비스 안내', angle: '방문·구매 문의 전환을 위한 신뢰 정보 구성', intent: '지역 탐색형', funnel: '고려', persona: '지역 서비스 사업자', secondaryKeywords: ['구매 문의 예약', '방문 문의'], intro: ['지역 기반 서비스는 가격보다 연락 가능성과 실제 운영 정보가 먼저 확인됩니다.'], problem: ['주소, 영업시간, 구매 문의 가능 시간, 문의 방법이 분리되어 있으면 전화나 예약 전환이 느려질 수 있습니다.'], cta: '지역 서비스형 사이트라면 무료 진단으로 문의 전환 흐름을 먼저 확인하세요.' },
  { ctaType: 'b2b_service', boardType: 'case', primaryKeyword: 'B2B 서비스 첫 화면 점검', headline: 'B2B 문의 전환 점검', angle: '도입 검토자가 확인하는 자료와 CTA 구조', intent: '상업 조사형', funnel: '결정', persona: 'B2B 세일즈 담당자', secondaryKeywords: ['자료 요청', '도입 문의'], intro: ['B2B 고객은 즉시 구매보다 내부 검토에 필요한 근거를 찾습니다.'], problem: ['사례, 제공 범위, 문의 후 절차가 부족하면 검토자가 다음 단계로 넘기기 어렵습니다.'], cta: 'B2B 문의 흐름은 상세 리포트에서 자료·문의·정책 연결을 함께 확인하세요.' },
  { ctaType: 'digital_product', boardType: 'notice', primaryKeyword: '디지털 상품 환불 고지', headline: '디지털 산출물 안내', angle: '제공 시작 시점과 환불 제한을 명확히 알리는 방법', intent: '문제 해결형', funnel: '결정', persona: '디지털 상품 판매자', secondaryKeywords: ['PDF 리포트', '템플릿 판매'], intro: ['PDF, 템플릿, 리포트 같은 디지털 산출물은 제공 시점 안내가 특히 중요합니다.'], problem: ['제공이 시작된 뒤 환불 제한이 있을 수 있다면 결제 전 고객이 이해할 수 있게 분리해서 보여줘야 합니다.'], cta: '디지털 산출물 판매 흐름은 TemplatePack과 FixPack으로 결제 전 문구를 정리하세요.' },
  { ctaType: 'faq_conversion', boardType: 'cta', primaryKeyword: 'FAQ 전환 개선', headline: 'FAQ 기반 전환 설계', angle: '반복 문의를 구매 전 불안 제거 콘텐츠로 바꾸기', intent: '전환 개선형', funnel: '고려', persona: 'CS·마케팅 담당자', secondaryKeywords: ['자주 묻는 질문', '구매 불안 제거'], intro: ['FAQ는 고객센터용 문서가 아니라 구매 전 불안을 줄이는 전환 콘텐츠가 될 수 있습니다.'], problem: ['반복 문의를 글 하단에만 쌓아두면 고객이 결제 전에 필요한 답을 찾기 어렵습니다.'], cta: '자주 묻는 질문을 전환 흐름에 맞게 정리하려면 상세 리포트의 FAQ 후보를 확인하세요.' },
  { ctaType: 'trust_notice_link', boardType: 'notice', primaryKeyword: '결제 전 안내 연결', headline: '정책 링크와 CTA 정리', angle: '고객이 결제 전 필요한 안내로 이동하는 구조', intent: '신뢰 점검형', funnel: '인지', persona: '운영 담당자', secondaryKeywords: ['정책 링크', '결제 전 고지'], intro: ['고객은 버튼을 누르기 전에 환불 기준, 제공 범위, 개인정보 안내를 빠르게 확인하려 합니다.'], problem: ['관련 글, 정책 페이지, 무료 진단 버튼 안내가 분리되어 있으면 사용자가 다음 행동을 찾기 어렵습니다.'], cta: '정책 링크와 CTA 구조는 Auto 발행 글을 통해 꾸준히 보강할 수 있습니다.' },
  { ctaType: 'seasonal_campaign', boardType: 'case', primaryKeyword: '이벤트 첫 화면 점검', headline: '캠페인 전 점검', angle: '프로모션 시작 전 반드시 확인할 안내 구조', intent: '실행 준비형', funnel: '결정', persona: '프로모션 담당자', secondaryKeywords: ['이벤트 페이지', '프로모션 CTA'], intro: ['이벤트 기간에는 유입이 늘어나는 만큼 작은 안내 공백도 문의로 이어지기 쉽습니다.'], problem: ['할인 조건, 적용 제외, 환불 기준, 종료일이 분산되어 있으면 고객이 혜택보다 조건을 더 오래 찾게 됩니다.'], cta: '캠페인 전에는 무료 진단으로 핵심 안내가 한 화면 안에 연결되는지 확인하세요.' }
];

const PROCESS_STEPS = [
  ['고객 행동 직전 화면 확인', '누락·모호·과장 표현 분리', '수정 문구 적용', '모바일 화면 재확인', '같은 기준의 재진단'],
  ['유입 경로 확인', '정책 링크 위치 점검', 'CTA 주변 불안 요소 제거', 'FAQ 보강', '발행 후 반응 확인'],
  ['고객 질문 선정', '결제 전 확인 흐름 구성', '본문에서 고객 걱정에 답변', '정책·문의 페이지 연결', '다음 행동 CTA 배치'],
  ['문의가 반복되는 항목 수집', '결제·구매 문의 직전 화면과 연결', '짧은 답변과 상세 기준 분리', '과장 표현 제거', '운영 변경 시 재발행']
];
const TITLE_PATTERNS = [
  ({ industry, topic }) => `${industry} ${topic.headline}: ${topic.angle}`,
  ({ industry, topic }) => `${industry} 사이트 담당자가 ${topic.headline}에서 먼저 볼 기준`,
  ({ target, topic }) => `${target} 점검 후 ${topic.headline} 정리 순서`,
  ({ industry, topic }) => `${industry} 전환 흐름을 위한 ${topic.headline} 체크`,
  ({ topic }) => `${topic.headline}: 고객 불안을 줄이는 운영 방법`,
  ({ industry, topic }) => `${industry} ${topic.primaryKeyword} 실무 가이드`,
  ({ topic }) => `${topic.primaryKeyword} 전 확인해야 할 5가지`,
  ({ industry, topic }) => `${industry} 사이트 ${topic.primaryKeyword} 개선 포인트`
];
const INTRO_BRIDGES = [
  '이 글은 단순 홍보 문구가 아니라 사용자가 행동하기 전에 확인하는 정보를 중심으로 정리한 운영형 포스팅입니다.',
  '목표는 불안을 자극하는 것이 아니라 고객이 다음 행동을 선택할 수 있게 필요한 정보를 제자리에 배치하는 것입니다.',
  '광고 유입, 직접 방문, 재방문 고객 모두 같은 화면을 보더라도 필요한 정보는 조금씩 다르게 확인합니다.',
  '따라서 제목, 본문, FAQ, 버튼 안내가 각각 따로 움직이지 않고 하나의 흐름으로 이어져야 합니다.'
];
const TRUST_LINES = [
  '자동 발행 칼럼은 사용자가 입력한 진단 정보와 내부 점검 항목을 바탕으로 작성되며, 외부 확인이 필요한 가격·정책·인증 여부는 임의로 단정하지 않습니다.',
  '이 콘텐츠는 법률 자문이나 성과 보장을 대신하지 않으며, 사이트 담당자가 확인해야 할 화면과 문구 우선순위를 정리하는 데 목적이 있습니다.',
  '과장된 확정 표현보다 현재 상태, 확인 필요 항목, 다음 조치를 분리해 보여주는 방식이 장기적으로 더 안정적입니다.'
];
const FAQ_BANK = [
  ['이 글만 보면 모든 문제가 해결되나요?', '아닙니다. 우선순위 안내이며 실제 적용 전에는 운영 서비스 범위와 공식 정책을 확인해야 합니다.'],
  ['무엇부터 고치는 것이 좋나요?', '고객이 행동하기 직전에 보는 정보부터 정리하는 편이 효율적입니다. 문의, 결제, 회원가입, 푸터 순서로 확인합니다.'],
  ['같은 글이 반복 발행되나요?', '아닙니다. 콘텐츠 업데이트은 진단 요약, 체크리스트, 개인정보 안내, 약관 구조, 광고 표현, 재진단, 주간 운영 등 서로 다른 주제를 순환합니다.'],
  ['게시판 글은 어떤 방식으로 도움이 되나요?', '고객 질문에 맞는 제목 후보, 본문 답변, 관련 태그, 자연스러운 다음 행동을 함께 생성해 안내 콘텐츠의 중복도를 낮춥니다.'],
  ['바로 결제 유도만 하나요?', '아닙니다. 무료 진단, 결과 저장, 상세 리포트, 수정 문구안처럼 고객 단계에 맞는 다음 행동을 분리합니다.'],
  ['업종이 달라도 사용할 수 있나요?', '가능합니다. 업종명, 타깃 사이트, 주요 발견 항목을 반영해 제목과 본문 초점을 조정합니다.']
];

function legacyCtaTopicPacks() { return TOPIC_PACKS.map(item => ({ ...item })); }
function legacyCtaFingerprint(value = '') { return fingerprint(value); }

function legacyBuildCtaBoardArticle(scan = {}, variant = {}, options = {}) {
  const target = readableTarget(scan.target || scan.normalizedTarget || '등록 사이트');
  const industry = normalizeText(scan.industry, '온라인 사업');
  const findingCount = Number.isFinite(Number(scan.totalFindings)) ? Number(scan.totalFindings) : Array.isArray(scan.detailFindings) ? scan.detailFindings.length : 3;
  const riskScore = Number.isFinite(Number(scan.riskScore ?? scan.score)) ? Math.round(Number(scan.riskScore ?? scan.score)) : null;
  const top = listText(scan.topFindings || (scan.detailFindings || []).map(item => item?.title));
  const baseSeed = normalizeText(options.seed, `${target}:${industry}:${scan.requestId || scan.id || ''}:${variant.ctaType || ''}:${options.sequenceOffset || ''}`);
  const topic = TOPIC_PACKS.find(item => item.ctaType === variant.ctaType) || TOPIC_PACKS[Math.abs(hashInt(baseSeed)) % TOPIC_PACKS.length];
  const titleSeed = `${baseSeed}:${topic.ctaType}:${findingCount}:${riskScore ?? 'na'}`;
  const titleCandidates = unique(TITLE_PATTERNS.map((fn, index) => fn({ target, industry, topic, index })).filter(Boolean)).slice(0, 5);
  while (titleCandidates.length < 5) titleCandidates.push(`${topic.headline} ${titleCandidates.length + 1}단계 점검`);
  const title = normalizeText(options.title || variant.title || pick(titleCandidates, titleSeed, 1), titleCandidates[0]);
  const scoreLine = riskScore === null ? '현재 점수는 확인 필요 상태입니다.' : `현재 내부 진단 점수는 ${riskScore}/100이며, 이 수치는 법률 판단이나 성과 보장을 의미하지 않습니다.`;
  const primaryKeywords = keywordBase(industry, topic).slice(0, 5);
  const tags = Array.isArray(options.tags) && options.tags.length ? options.tags : tagsFor(industry, topic, titleSeed);
  const steps = pick(PROCESS_STEPS, titleSeed, 2);
  const intro = pick(topic.intro, titleSeed, 3) || topic.intro?.[0] || '';
  const problem = pick(topic.problem, titleSeed, 4) || topic.problem?.[0] || '';
  const bridge = pick(INTRO_BRIDGES, titleSeed, 5);
  const trust = unique([pick(TRUST_LINES, titleSeed, 6), pick(TRUST_LINES, titleSeed, 7), TRUST_LINES[1]]).slice(0, 2).join(' ');
  const faqSet = unique([
    JSON.stringify(pick(FAQ_BANK, titleSeed, 8)),
    JSON.stringify(pick(FAQ_BANK, titleSeed, 9)),
    JSON.stringify(FAQ_BANK[2]),
    JSON.stringify(FAQ_BANK[3]),
    JSON.stringify(FAQ_BANK[4])
  ]).map(item => JSON.parse(item)).slice(0, 3);
  const internalLinks = [
    { label: '무료 진단', href: '/products/veridion/demo' },
    { label: '상품·요금', href: '/plans' },
    { label: '운영 문서 초안', href: '/documents' },
    { label: '내 사이트 관리', href: '/portal' }
  ];
  const readingTimeMinutes = Math.max(3, Math.ceil(bodyWordEstimate(topic, faqSet) / 420));
  const metaDescription = clampText(`${industry} 사이트 담당자가 ${topic.primaryKeyword}을 점검할 때 확인할 항목, FAQ, 자연스러운 다음 행동 연결 방식을 정리했습니다.`);
  const body = [
    `제목 후보\n1. ${titleCandidates[0]}\n2. ${titleCandidates[1]}\n3. ${titleCandidates[2]}\n4. ${titleCandidates[3]}\n5. ${titleCandidates[4]}`,
    `도입\n${target} 운영에서 이번 글의 주제는 ${topic.headline}입니다. ${intro} ${scoreLine} ${bridge} 핵심 주제어는 ${primaryKeywords.join(', ')}입니다.`,
    `문제 제기\n이번 점검 기준으로는 ${findingCount}개 항목을 우선 확인 대상으로 보았습니다. 특히 ${top} 항목은 고객이 구매, 문의, 체험 신청 전에 확인하려는 정보와 연결됩니다. ${problem} 이 결과만으로 위반 여부나 매출 상승을 단정하지 않습니다.`,
    `해결 과정\n1) ${steps[0]}\n2) ${steps[1]}\n3) ${steps[2]}\n4) ${steps[3]}\n5) ${steps[4]}`,
    `신뢰 근거\n${trust} 요약 설명 후보는 “${metaDescription}”입니다. 중복 발행을 줄이기 위해 주제, 고객 의도, 고객 단계, FAQ 조합을 다르게 구성합니다. 예상 읽기 시간은 약 ${readingTimeMinutes}분입니다.`,
    `FAQ\n${faqSet.map(([q, a], index) => `Q${index + 1}. ${q}\n${a}`).join('\n\n')}`,
    `자연스러운 다음 행동\n${topic.cta} 무료 진단으로 안내 공백을 확인하고, 결과를 저장하면 상세 리포트, 수정 문구안, Auto 정기 케어로 이어서 관리할 수 있습니다.`,
    `내부링크\n${internalLinks.map(link => `${link.label}: ${link.href}`).join('\n')}`,
    `태그\n${tags.join(' ')}`
  ].join('\n\n');
  return {
    title,
    body,
    titleCandidates,
    tags,
    boardType: topic.boardType,
    ctaType: topic.ctaType,
    diversityKey: `${topic.ctaType}:${topic.intent}:${topic.funnel}:${fingerprint(titleSeed)}`,
    contentFingerprint: fingerprint(`${title}\n${body}`),
    seo: {
      primaryKeyword: topic.primaryKeyword,
      secondaryKeywords: topic.secondaryKeywords || [],
      searchIntent: topic.intent,
      funnelStage: topic.funnel,
      persona: topic.persona,
      metaDescription,
      internalLinks,
      readingTimeMinutes,
      contentGoal: `${topic.intent} 방문자를 ${topic.funnel} 단계 버튼 안내로 연결`
    }
  };
}

function legacyChooseCtaVariant(db = {}, options = {}) {
  const items = [...(db.publications || []), ...(db.boards || [])]
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const recentTypes = new Set(items.slice(0, 36).map(item => item.ctaType).filter(Boolean));
  const recentIntents = new Set(items.slice(0, 12).map(item => item.searchIntent || item.seo?.searchIntent).filter(Boolean));
  const autoCount = items.filter(item => item.autoPublished || item.type === 'cta' || item.boardType === 'cta').length;
  const seed = `${options.seed || ''}:${autoCount}:${options.sequenceOffset || 0}:${new Date().toISOString().slice(0, 10)}`;
  const start = Math.abs(hashInt(seed)) % TOPIC_PACKS.length;
  const rotated = [...TOPIC_PACKS.slice(start), ...TOPIC_PACKS.slice(0, start)];
  const freshByType = rotated.find(topic => !recentTypes.has(topic.ctaType) && !recentIntents.has(topic.intent));
  if (freshByType) return freshByType;
  const freshByTopic = rotated.find(topic => !recentTypes.has(topic.ctaType));
  if (freshByTopic) return freshByTopic;
  const scored = rotated
    .map(topic => {
      const lastIndex = items.findIndex(item => item.ctaType === topic.ctaType);
      const intentPenalty = recentIntents.has(topic.intent) ? 8 : 0;
      const typePenalty = lastIndex >= 0 ? Math.max(0, 24 - lastIndex) : 0;
      return { topic, score: intentPenalty + typePenalty + (Math.abs(hashInt(`${seed}:${topic.ctaType}`)) % 7) };
    })
    .sort((a, b) => a.score - b.score);
  return scored[0]?.topic || TOPIC_PACKS[0];
}


const COMBINATORIAL_ENGINE_VERSION = 'cta-board-v11.0-phase242-expert-human-column-20min';
const COMBO_ANGLES = [
  ['첫 방문자 신뢰 확보', '정보 탐색형', '인지', '첫 방문 신뢰도'],
  ['구매 직전 불안 제거', '전환 개선형', '결정', '구매 직전 이탈 방지'],
  ['모바일 화면 기준 재정리', '실행 준비형', '고려', '모바일 전환 점검'],
  ['정책 문구와 CTA 연결', '문제 해결형', '고려', '정책 CTA 연결'],
  ['광고 유입 첫 화면 최적화', '상업 조사형', '결정', '광고 첫 화면 점검'],
  ['재방문 고객 설득 흐름', '유지 관리형', '유지', '재방문 전환'],
  ['결제 전환 보강', '전환 개선형', '결정', '결제 개선'],
  ['결제 전 안내 후 다음 행동 설계', '신뢰 개선형', '인지', '고객 안내 CTA'],
  ['사이트 담당자 주간 점검 루틴', '유지 관리형', '유지', '주간 사이트 점검'],
  ['문구 과장도 낮추기', '문제 해결형', '고려', '광고 표현 완화'],
  ['고객센터 문의 감소', '문제 해결형', '고려', '반복 문의 감소'],
  ['서비스 설명 명확화', '정보 탐색형', '인지', '서비스 설명 개선']
];
const COMBO_AUDIENCES = ['초기 창업자', '1인 사이트 담당자', '쇼핑몰 담당자', '마케팅 담당자', 'CS 담당자', '개발·운영 담당자', '광고 대행 담당자', 'B2B 서비스 사이트 담당자', '디지털 상품 판매자', '예약·구매 문의 서비스 사이트 담당자', '지역 서비스 사업자', '콘텐츠 커머스 사이트 담당자'];
const COMBO_ARCHETYPES = [
  ['checklist', '체크리스트형'], ['before_after', '수정 전후형'], ['case_note', '사례 해설형'], ['how_to', '방법론형'],
  ['faq_first', 'FAQ 선해결형'], ['risk_map', '리스크 맵형'], ['trust_cluster', '신뢰 안내 클러스터형'], ['ops_routine', '운영 루틴형']
];
const COMBO_HOOKS = [
  ({ target }) => `${target}처럼 고객이 바로 판단하는 사이트는 첫 화면보다 행동 직전 안내가 더 중요합니다.`,
  ({ industry, keyword }) => `${industry} 사이트에서 ${keyword}은 단순 점검 항목이 아니라 전환 흐름의 마찰을 줄이는 기준입니다.`,
  ({ target, headline }) => `${target} 점검에서 ${headline}을 볼 때는 문구 자체보다 고객이 언제 그 문구를 보는지가 더 중요합니다.`,
  ({ industry, keyword }) => `${industry} 사이트 담당자는 광고비를 늘리기 전에 ${keyword}부터 정리해야 불필요한 이탈을 줄일 수 있습니다.`,
  ({ headline }) => `${headline}은 한 번 고쳐 끝나는 영역이 아니라 상품, 이벤트, 정책 변경 때마다 다시 맞춰야 하는 운영 루틴입니다.`
];
const COMBO_SECTION_SETS = [
  ['제목 후보', '도입', '문제 제기', '실행 체크리스트', 'FAQ', '자연스러운 다음 행동', '내부링크', '태그'],
  ['제목 후보', '핵심 요약', '고객이 멈추는 지점', '수정 방향', 'FAQ', '다음 행동', '내부링크', '태그'],
  ['제목 후보', '고객 의도', '현재 상태', '개선 순서', '주의 문구', 'FAQ', '자연스러운 다음 행동', '태그'],
  ['제목 후보', '사이트 담당자 관점', '고객 관점', '우선순위', '검증 방법', 'FAQ', '내부링크', '태그'],
  ['제목 후보', '상황 설명', '체크포인트', '문구 개선 방향', '반복 관리 방법', 'FAQ', '자연스러운 다음 행동', '태그']
];
const COMBO_CTA_STYLES = [
  '무료 진단으로 현재 안내 공백을 먼저 확인하세요.',
  '결과를 저장한 뒤 상세 리포트에서 위치별 수정 우선순위를 확인하세요.',
  'FixPack으로 고객이 보는 문구를 수정 전후 형태로 받아보세요.',
  'Auto 정기 케어로 발행 글과 점검 기록을 반복 관리하세요.',
  '상품·요금 페이지에서 무료 진단, 상세 리포트, FixPack, Auto의 차이를 확인하세요.',
  '내 사이트 관리에 결과를 남기고 다음 수정 후 재진단까지 이어가세요.',
  '운영 문서 초안이 필요하면 문서 생성으로 결제 전 안내 문구를 정리하세요.',
  '광고 집행 전 첫 화면과 CTA 주변 문구를 먼저 점검하세요.'
];
const COMBO_FAQS = [
  ['왜 같은 주제로 글을 계속 발행해도 되나요?', '같은 큰 주제라도 업종, 고객 단계, 고객 의도, 버튼 위치, FAQ가 달라지면 전혀 다른 목적의 글이 됩니다.'],
  ['무한대 결과물이 실제로 가능한가요?', '저장공간과 발행 횟수에는 한계가 있지만, 시드·시간·사이트·업종·발견항목·문체 조합을 계속 섞어 사실상 반복 없는 결과물을 만들 수 있습니다.'],
  ['자동 발행에서 가장 피해야 할 점은 무엇인가요?', '제목만 바꾸고 본문 구조가 같은 글을 반복 발행하는 것입니다. 그래서 본문 구조, FAQ, 정책 링크, CTA까지 함께 바꿔야 합니다.'],
  ['자동 글이 너무 기계적으로 보이지 않게 하려면?', '문단 순서, 예시, 고객 단계, 질문 답변, 내부링크를 바꾸고 확정형 표현보다 운영 기준 중심으로 작성해야 합니다.'],
  ['몇 개의 조합이 만들어지나요?', '고정 24개가 아니라 최소 수십만 개 이상의 조합 기반이며, 발행 시드와 사이트 입력값까지 포함하면 계속 확장됩니다.'],
  ['중복 게시글은 어떻게 피하나요?', '제목과 본문 fingerprint를 저장하고 최근 ctaType, 고객의도, 고객단계, 키워드가 겹치지 않도록 후보를 다시 뽑습니다.'],
  ['글 유형을 계속 추가해야 하나요?', '아닙니다. 주제팩은 뼈대이고 실제 다양성은 조합 엔진이 만듭니다. 필요하면 업종팩이나 시즌팩만 추가하면 됩니다.'],
  ['버튼 안내가 매번 똑같아지지 않나요?', 'CTA도 무료 진단, 상세 리포트, FixPack, Auto 정기 케어, 내 사이트 관리, 상품·요금 페이지 등 고객 단계에 맞춰 달라집니다.']
];
const COMBO_MICRO_CASES = [
  '고객이 가격을 보기 전에 신뢰 정보를 먼저 찾는 상황', '문의폼 입력 직전에 개인정보 안내가 보이지 않는 상황',
  '광고 첫 화면에는 혜택이 있지만 예외 조건이 분리되어 있는 상황', '모바일에서 다음 행동 버튼은 보이지만 환불·취소 기준이 접혀 있는 상황',
  'FAQ는 많지만 결제 전 불안을 직접 해결하지 못하는 상황', '안내 글에서 다음 행동 링크가 없어 이탈하는 상황',
  '기존 공지가 오래되어 운영이 멈춘 것처럼 보이는 상황', '상세페이지와 푸터의 사업자 정보 표현이 서로 다른 상황'
];
function comboPick(list, seed, offset = 0) { return pick(list, seed, offset); }
function comboStatsFloor() { return legacyCtaTopicPacks().length * COMBO_ANGLES.length * COMBO_AUDIENCES.length * COMBO_ARCHETYPES.length * COMBO_HOOKS.length * COMBO_SECTION_SETS.length * COMBO_CTA_STYLES.length * COMBO_FAQS.length * COMBO_MICRO_CASES.length; }
function baseTypeOf(value = '') { return String(value || '').replace(/_[a-f0-9]{6,}$/i, ''); }
function normalizeVariantForLegacy(variant = {}) { return { ...variant, ctaType: variant.baseCtaType || baseTypeOf(variant.ctaType) || variant.ctaType }; }
function comboContext(scan = {}, variant = {}, options = {}) {
  const target = readableTarget(scan.target || scan.normalizedTarget || '등록 사이트');
  const industry = normalizeText(scan.industry, '온라인 사업');
  const baseVariant = normalizeVariantForLegacy(variant);
  const baseSeed = normalizeText(options.seed, `${target}:${industry}:${scan.requestId || scan.id || ''}:${variant.ctaType || ''}:${options.sequenceOffset || ''}`);
  const seed = `${baseSeed}:${variant.combinationKey || ''}:${options.sequenceOffset || ''}`;
  const angle = comboPick(COMBO_ANGLES, seed, 1) || COMBO_ANGLES[0];
  const audience = comboPick(COMBO_AUDIENCES, seed, 2) || '사이트 담당자';
  const archetype = comboPick(COMBO_ARCHETYPES, seed, 3) || COMBO_ARCHETYPES[0];
  const sectionSet = comboPick(COMBO_SECTION_SETS, seed, 4) || COMBO_SECTION_SETS[0];
  const cta = comboPick(COMBO_CTA_STYLES, seed, 5) || COMBO_CTA_STYLES[0];
  const microCase = comboPick(COMBO_MICRO_CASES, seed, 6) || COMBO_MICRO_CASES[0];
  const hook = comboPick(COMBO_HOOKS, seed, 7) || COMBO_HOOKS[0];
  const token = fingerprint(`${seed}:${angle[0]}:${audience}:${archetype[0]}:${microCase}`).slice(0, 6);
  return { target, industry, baseVariant, baseSeed, seed, angle, audience, archetype, sectionSet, cta, microCase, hook, token };
}


const HUMAN_TONE_VERSION = 'phase242-expert-human-column-20min-v1';
const HUMAN_TONE_LEGACY_VERSION = 'p208-20min-reader-interest-final-cta-v1';
const HARD_WORDS = [
  ['contentFingerprint', '중복 확인값'],
  ['fingerprint', '중복 확인값'],
  ['아키타입', '글 구성'],
  ['요약 설명', '고객이 먼저 볼 짧은 설명'],
  ['무조건', '조건 확인 후'],
  ['완벽', '누락을 줄이는'],
  ['보장형 표현', '가능성을 높이는'],
  ['최고', '우선 검토할']
];

const HUMAN_READER_MEMOS = [
  '처음 온 사람도 10초 안에 이해할 수 있는지 봅니다.',
  '고객이 버튼을 누르기 전에 궁금해할 말을 먼저 적습니다.',
  '사이트 담당자 기준이 아니라 고객 눈높이로 순서를 다시 잡습니다.',
  '길게 설명하기보다 필요한 답을 가까운 곳에 둡니다.',
  '모바일 화면에서 손가락으로 바로 누를 수 있는지 확인합니다.',
  '가격을 보기 전, 믿을 수 있는 정보가 보이는지 확인합니다.',
  '문의하기 전, 개인정보 안내가 쉽게 보이는지 확인합니다.',
  '결제 전, 취소와 환불 기준을 쉽게 찾을 수 있는지 확인합니다.',
  '광고 문구와 실제 안내가 서로 다르지 않은지 봅니다.',
  '자주 묻는 질문이 고객의 걱정을 바로 풀어주는지 확인합니다.',
  '전문 표현도 고객 질문 기준으로 풀어 씁니다.',
  '한 문단에 여러 내용을 넣지 않고 하나씩 나눕니다.',
  '고객이 다른 곳으로 이동하지 않아도 되게 필요한 링크를 붙입니다.',
  '너무 강한 표현보다 확인 가능한 말로 바꿉니다.',
  '상품 설명보다 먼저 안심할 수 있는 근거를 보여줍니다.',
  '고객센터로 물어보기 전에 답을 찾을 수 있게 만듭니다.',
  '페이지 아래에 숨어 있는 중요한 안내를 앞으로 올립니다.',
  '같은 말을 반복하지 말고 실제 상황 예시로 설명합니다.',
  '문의, 결제, 회원가입처럼 중요한 순간을 따로 봅니다.',
  '고객이 망설이는 지점을 하나씩 줄이는 데 집중합니다.',
  '전문가용 문서가 아니라 실제 방문자가 읽는 글처럼 씁니다.',
  '문제가 커 보이지 않게 숨기는 것이 아니라 쉽게 이해하게 만듭니다.',
  '고객이 다음에 무엇을 누르면 되는지 분명히 보여줍니다.',
  '사이트 담당자가 바로 고칠 수 있는 작은 문장부터 찾습니다.'
];

const HUMAN_EASY_EXAMPLES = [
  '예를 들어 환불 안내가 버튼 아래에만 있으면 고객은 못 보고 지나칠 수 있습니다.',
  '예를 들어 문의 버튼은 있는데 답변 시간이 없으면 고객은 기다려도 되는지 헷갈립니다.',
  '예를 들어 “상세 내용 확인”보다 “환불 기준 보기”가 더 이해하기 쉽습니다.',
  '예를 들어 개인정보 안내가 작은 글씨로만 있으면 불안하게 느낄 수 있습니다.',
  '예를 들어 모바일에서 버튼이 너무 아래에 있으면 고객은 어디를 눌러야 할지 모릅니다.',
  '예를 들어 혜택은 크게 보이는데 조건은 작게 보이면 오해가 생길 수 있습니다.',
  '예를 들어 회사 정보가 푸터마다 다르게 보이면 신뢰가 떨어질 수 있습니다.',
  '예를 들어 가격표 옆에 포함 범위가 없으면 고객은 추가 비용을 걱정합니다.',
  '예를 들어 신청 완료 후 다음 안내가 없으면 고객은 접수가 된 건지 불안해합니다.',
  '예를 들어 같은 공지가 오래 남아 있으면 사이트가 관리되지 않는 것처럼 보일 수 있습니다.',
  '예를 들어 회원가입 전에 필요한 정보가 무엇인지 알려주면 고객이 덜 망설입니다.',
  '예를 들어 “무료”라고 썼다면 어디까지 무료인지 함께 적어야 합니다.',
  '예를 들어 결제 버튼 옆에 처리 순서를 적으면 고객이 더 쉽게 이해합니다.',
  '예를 들어 배송, 취소, 문의 안내가 서로 떨어져 있으면 고객은 여러 번 찾아야 합니다.',
  '예를 들어 어려운 약어는 풀어서 쓰는 편이 처음 보는 사람에게 더 친절합니다.',
  '예를 들어 고객이 자주 묻는 질문 3개만 먼저 보여줘도 불필요한 문의를 줄일 수 있습니다.'
];

function easyWord(value = '') {
  return HARD_WORDS.reduce((text, [from, to]) => text.replaceAll(from, to), String(value || ''));
}

function stripJargon(value = '') {
  return easyWord(value)
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .trim();
}

function sentence(value = '') {
  const text = stripJargon(value);
  if (!text) return '';
  return /[.!?다요죠음함됨임]$/.test(text) ? text : `${text}.`;
}

function punctuateArticleLines(value = '') {
  return String(value || '').split('\n').map((line) => {
    const raw = String(line || '');
    const trimmed = raw.trimEnd();
    if (!trimmed) return raw;
    if (/[.!?。]$/.test(trimmed)) return raw;
    const heading = trimmed.replace(/^#+\s*/, '').trim();
    const knownHeadings = new Set([...(typeof EXPERT_EDITORIAL_SECTIONS === 'undefined' ? [] : EXPERT_EDITORIAL_SECTIONS), '제목 후보', '관련 링크']);
    if (knownHeadings.has(heading)) return raw;
    if (/^\s*(무료 진단|상품·요금|내 사이트 관리|게시판|문서 초안):\s*\//.test(trimmed)) return raw;
    return `${trimmed}.`;
  }).join('\n');
}

function humanList(items = [], fallback = '확인할 항목') {
  const list = unique(items.map(item => stripJargon(item)).filter(Boolean)).slice(0, 3);
  return list.length ? list.join(', ') : fallback;
}

function easySection(title, lines = []) {
  const body = lines.map(line => sentence(line)).filter(Boolean).join('\n');
  return `${title}\n${body}`;
}

function easyFaq(seed, industry, target, top) {
  const pool = [
    ['왜 이런 글이 필요한가요?', `${target}를 처음 보는 사람은 상품보다 먼저 믿을 수 있는지 확인합니다. 그래서 안내가 비어 있는 곳을 쉽게 설명해 주는 글이 필요합니다.`],
    ['가장 먼저 봐야 할 부분은 어디인가요?', `고객이 결제하거나 문의하기 직전에 보는 화면부터 보면 됩니다. 예를 들면 가격, 환불, 개인정보 안내, 문의 버튼 주변입니다.`],
    ['전문가가 아니어도 이해할 수 있나요?', `네. 어려운 말보다 “어디가 불편한지”, “무엇을 고치면 되는지”를 짧게 나누어 보면 충분히 확인할 수 있습니다.`],
    ['바로 매출이 오른다고 볼 수 있나요?', `그렇게 단정할 수는 없습니다. 다만 고객이 헷갈리는 부분을 줄이면 문의와 구매 과정이 더 편해질 수 있습니다.`],
    ['이 글 다음에는 무엇을 하면 되나요?', `무료 진단으로 현재 상태를 확인하고, 문제가 큰 항목부터 문구와 버튼 위치를 차례대로 정리하면 됩니다.`],
    ['반복 글처럼 보이지 않게 하려면요?', `같은 말을 반복하지 말고 실제 사이트 상황, 고객 질문, 수정 예시를 바꿔서 쓰면 훨씬 자연스럽습니다.`],
    ['고객이 가장 답답해하는 부분은 무엇인가요?', `${top}처럼 결정을 앞둔 순간에 필요한 정보가 안 보이면 고객은 다른 곳으로 이동하거나 페이지를 닫을 수 있습니다.`],
    ['고객 안내에도 도움이 되나요?', `${industry}와 관련된 고객 질문, 실무 상황, 개선 순서를 함께 담으면 처음 방문한 사람도 더 쉽게 이해할 수 있습니다.`]
  ];
  return unique([
    JSON.stringify(comboPick(pool, seed, 31)),
    JSON.stringify(comboPick(pool, seed, 32)),
    JSON.stringify(comboPick(pool, seed, 33))
  ]).map(item => JSON.parse(item)).slice(0, 3);
}

function humanTitleCandidates(ctx, keyword, legacyTitle = '') {
  const easyKeyword = stripJargon(keyword).replace(/\s+/g, ' ');
  return unique([
    `${ctx.industry} 사이트, 고객이 헷갈리지 않게 고치는 방법`,
    `${ctx.target} 점검 후 먼저 바꾸면 좋은 부분`,
    `${ctx.audience}가 바로 확인할 수 있는 쉬운 사이트 점검`,
    `${easyKeyword}을 쉽게 정리하는 방법`,
    `고객이 안심하고 문의하게 만드는 안내 문구 정리`,
    `처음 온 고객이 믿고 읽을 수 있는 사이트 만들기`,
    `복잡한 설명 줄이고 필요한 안내만 보여주는 법`,
    stripJargon(legacyTitle).replace(/[|·].*$/, '').trim()
  ]).filter(Boolean).slice(0, 8);
}

function cleanPublicPhrase(value = '') {
  return stripJargon(value)
    .replace(/https?:\/\/example\.com/gi, '운영 중인 사이트')
    .replace(/\s*·\s*쉬운 점검\s*\d+-\d+\s*$/g, '')
    .replace(/\bCTA\b/g, '안내 버튼')
    .replace(/\bSEO\b/g, '리스크 점검')
    .replace(/전환/g, '문의나 구매로 이어지는 흐름')
    .replace(/이탈/g, '이탈')
    .replace(/첫 화면/g, '첫 화면')
    .replace(/고객 단계/g, '고객 단계')
    .replace(/\s+/g, ' ')
    .trim();
}

function helpfulTitle(ctx, keyword, legacyTitle = '') {
  const topic = cleanPublicPhrase(keyword || legacyTitle || ctx.baseVariant?.headline || '사이트 안내');
  const angle = cleanPublicPhrase(ctx.angle?.[3] || ctx.angle?.[0] || '고객 안내');
  const micro = cleanPublicPhrase(ctx.microCase || '고객이 필요한 안내를 찾는 상황').replace(/상황$/, '').replace(/는$/, '').trim();
  const audience = cleanPublicPhrase(ctx.audience || '사이트 담당자');
  const themeForTitle = articleThemeFromKeyword(`${topic} ${ctx.baseVariant?.primaryKeyword || ''}`);
  const base = cleanPublicPhrase(themeForTitle.label || ctx.baseVariant?.primaryKeyword || topic || '사이트 점검');
  const topicForTitle = cleanPublicPhrase(themeForTitle.label || base || '사이트 신뢰 안내');
  const candidates = [
    `${ctx.industry} 사이트에서 고객이 바로 찾는 ${base} 정리법`,
    `${angle}, 문의와 구매 전에 먼저 보여줄 것`,
    `${audience}가 오늘 확인할 ${topicForTitle} 체크리스트`,
    `${micro} 경우 고객이 떠나지 않게 만드는 안내`,
    `환불·문의·개인정보 안내를 고객 눈높이로 바꾸는 방법`,
    `${ctx.target} 점검 후 먼저 고칠 안내 문구`,
    `모바일 방문자가 놓치지 않는 ${base} 배치법`,
    `처음 온 고객이 믿고 읽는 ${ctx.industry} 안내 구성`,
    `고객 질문에서 출발하는 ${topicForTitle} 작성법`,
    `결제와 문의 버튼 주변에 꼭 붙일 ${base} 예시`,
    `결제 전 고객이 바로 이해하는 ${ctx.industry} 사이트 안내`,
    `사이트 담당자가 놓치기 쉬운 ${base} 요소 7가지`,
    stripJargon(legacyTitle).replace(/[|·].*$/, '').trim()
  ];
  return unique(candidates).filter(Boolean).slice(0, 12);
}

function articleThemeFromKeyword(value = '') {
  const source = String(value || '').toLowerCase();
  if (/환불|취소|교환|청약|refund/.test(source)) return {
    label: '환불·청약철회 안내',
    elements: ['환불 가능 조건', '취소 접수 위치', '처리 기간', '예외 기준', '문의 경로'],
    weakPoint: '환불 기준이 버튼에서 멀거나 여러 페이지에 흩어진 상태',
    nearButtonCopy: '환불·취소 기준 먼저 보기',
    customerQuestion: '결제했다가 취소하면 어떻게 되나요?'
  };
  if (/개인정보|privacy|동의|보관|파기/.test(source)) return {
    label: '개인정보 안내',
    elements: ['수집 항목', '수집 목적', '보관 기간', '파기 기준', '문의 이메일'],
    weakPoint: '입력 화면 주변에서 개인정보 안내를 바로 찾기 어려운 상태',
    nearButtonCopy: '수집 목적과 보관 기간 확인',
    customerQuestion: '내 정보는 어디에 쓰이나요?'
  };
  if (/사업자|푸터|대표자|고객센터|문의|contact/.test(source)) return {
    label: '사업자 정보와 문의 경로',
    elements: ['상호', '대표자', '사업자등록번호', '고객지원 이메일', '답변 기준'],
    weakPoint: '사이트 담당자 정보와 문의 경로가 서로 떨어져 있는 상태',
    nearButtonCopy: '사이트 담당자 정보와 문의 방법 보기',
    customerQuestion: '문의하면 실제로 답을 받을 수 있나요?'
  };
  if (/결제|구매|주문|checkout|가격/.test(source)) return {
    label: '결제 전 안내',
    elements: ['제공 범위', '가격 포함 항목', '환불 기준', '결제 후 제공 시점', '고객지원 경로'],
    weakPoint: '결제 버튼 근처에 제공 범위와 예외가 부족한 상태',
    nearButtonCopy: '결제 전 제공 범위 확인',
    customerQuestion: '결제하면 정확히 무엇을 받나요?'
  };
  if (/모바일|mobile|가독성/.test(source)) return {
    label: '모바일 안내 가독성',
    elements: ['버튼 위치', '문구 크기', '정책 링크 노출', '접힌 영역', '하단 고정 안내'],
    weakPoint: 'PC에서는 보이지만 모바일에서는 중요한 안내가 밀리는 상태',
    nearButtonCopy: '모바일에서 안내 위치 확인',
    customerQuestion: '휴대폰에서 어디를 눌러야 하나요?'
  };
  if (/광고|표현|보장|무조건|최고/.test(source)) return {
    label: '광고 표현 점검',
    elements: ['혜택 조건', '제외 기준', '근거 문구', '비교 표현', '구매 문의 전 안내'],
    weakPoint: '강한 표현은 보이지만 조건과 근거가 함께 보이지 않는 상태',
    nearButtonCopy: '혜택 조건과 예외 함께 보기',
    customerQuestion: '이 표현을 그대로 믿어도 되나요?'
  };
  return {
    label: '사이트 신뢰 안내',
    elements: ['사이트 담당자 정보', '문의 경로', '환불 기준', '개인정보 안내', '모바일 표시 상태'],
    weakPoint: '고객이 필요한 답을 찾으려면 여러 화면을 돌아다녀야 하는 상태',
    nearButtonCopy: '필수 안내 먼저 확인',
    customerQuestion: '이 사이트에서 안심하고 문의해도 되나요?'
  };
}


const EXPERT_EDITORIAL_SECTIONS = [
  '전문가 관점 요약',
  '현장에서 자주 생기는 문제',
  '매출과 신뢰에 영향을 주는 이유',
  '실무 적용 순서',
  '문구 개선 예시',
  '검증 체크리스트',
  '고객 질문을 고려한 구성',
  '자주 묻는 질문',
  '자연스러운 다음 행동'
];

const EXPERT_REVENUE_LEVERS = [
  '가격표와 결제 버튼 사이의 불확실성을 줄이는 것',
  '문의 전에 필요한 답을 가까운 위치에 배치하는 것',
  '정책 문서와 실제 구매 화면의 표현을 맞추는 것',
  '모바일 화면에서 버튼과 안내 문구가 동시에 보이게 하는 것',
  '고객이 다른 곳으로 이동하지 않아도 되는 연결된 공개 페이지를 제공하는 것',
  '무료 진단에서 유료 산출물로 이어지는 단계를 끊기지 않게 만드는 것'
];

function expertParagraph(seed, list, offset = 0) {
  return comboPick(list, seed, offset) || list[0] || '';
}

function expertEvidenceLine({ theme, top, findingCount, ctx }) {
  return `${theme.label}은 감각적인 카피 문제가 아니라 화면 구조, 고지 위치, 고객지원 기준이 함께 맞아야 하는 운영 설계 문제입니다. 이번 글은 ${ctx.target}처럼 공개 페이지를 기준으로 확인 가능한 항목을 중심으로 ${findingCount}개 내외의 점검 단서를 정리하고, 특히 ${top} 항목이 고객 행동 직전에 어떤 불안으로 연결되는지 설명합니다.`;
}

function expertSeoTags(industry, theme, ctx, keyword) {
  return unique([
    `#${industry.replace(/[\s·/]+/g, '')}`,
    `#${theme.label.replace(/[\s·/]+/g, '')}`,
    '#전문가포스팅',
    '#사이트신뢰진단',
    '#구매전환개선',
    '#첫 화면점검',
    '#버튼문구개선',
    '#고객안내콘텐츠',
    '#환불정책',
    '#개인정보처리방침',
    '#무료진단',
    `#${String(ctx.baseVariant?.ctaType || keyword || '사이트점검').replace(/[^0-9A-Za-z가-힣_]/g, '')}`
  ]).slice(0, 12);
}

function expertChecklist(theme) {
  return [
    `${theme.elements[0]}이 고객 행동 버튼과 같은 화면 안에서 확인되는지 점검합니다`,
    `${theme.elements[1]} 설명이 약관, 상세페이지, 결제 화면에서 서로 충돌하지 않는지 비교합니다`,
    `${theme.elements[2]} 기준을 한 문장으로 요약했을 때 고객이 바로 이해할 수 있는지 확인합니다`,
    `${theme.elements[3]} 예외 조건이 작은 글씨나 접힌 영역에만 숨어 있지 않은지 봅니다`,
    `${theme.elements[4]}로 이동하는 링크가 모바일에서도 손쉽게 눌리는지 확인합니다`,
    '수정 후 같은 URL로 재진단해 이전 결과와 달라진 항목을 비교합니다'
  ];
}

function humanizeBody({ ctx, legacy, title, titleCandidates, findingCount, top, keyword, faqSet, internalLinks, sequenceLabel }) {
  const theme = articleThemeFromKeyword(`${keyword} ${ctx.baseVariant?.primaryKeyword || ''} ${ctx.baseVariant?.headline || ''}`);
  const hook = sentence(stripJargon(ctx.hook({ target: ctx.target, industry: ctx.industry, keyword: theme.label, headline: ctx.baseVariant?.headline || theme.label })));
  const revenueLever = expertParagraph(ctx.seed, EXPERT_REVENUE_LEVERS, 41);
  const detected = humanList(theme.elements, '고객 안내 항목');
  const titleText = titleCandidates.slice(0, 5).map((item, index) => `${index + 1}. ${cleanPublicPhrase(item)}`).join('\n');
  const checklist = expertChecklist(theme);
  const copyExamples = [
    ['문의하기', '문의하기 · 평일 기준 1영업일 안에 답변합니다'],
    ['자세히 보기', `${theme.nearButtonCopy}`],
    ['무료 진단', '무료 진단 · 요약 결과까지 바로 확인'],
    ['서비스 신청', '제공 범위와 환불 기준 확인 후 신청하기'],
    ['개인정보 동의', '문의 답변을 위한 수집 목적과 보관 기간 확인']
  ];
  const linksText = internalLinks.map(link => `${link.label}: ${link.href}`).join('\n');
  const faq = faqSet.length ? faqSet : easyFaq(ctx.seed, ctx.industry, ctx.target, top);
  const body = [
    `전문가 관점 요약
${hook}
${expertEvidenceLine({ theme, top, findingCount, ctx })}
핵심은 ${revenueLever}입니다. 글의 목적은 단순 홍보가 아닙니다. 사이트 담당자가 실제 화면을 보며 어디를 고쳐야 하는지 판단하도록 돕는 것입니다. 좋은 다음 행동 칼럼은 제품을 크게 외치기보다 고객이 멈추는 이유를 먼저 설명합니다. 그래서 본문은 문제, 영향, 해결 순서, 검증 기준, 다음 행동을 칼럼처럼 자연스럽게 이어야 합니다.`,
    `현장에서 자주 생기는 문제
가장 흔한 문제는 정보가 없는 것이 아닙니다. 고객이 필요한 순간에 정보를 찾지 못하는 것입니다. ${theme.weakPoint}가 대표적입니다. 사이트 담당자는 푸터, 약관, 공지사항에 이미 적어 두었다고 생각합니다. 하지만 고객은 결제, 문의, 회원가입, 상담 신청 직전에 답을 찾습니다. 이 위치에서 답이 보이지 않으면 상품 설명을 끝까지 읽기 전에 비교 페이지로 이동합니다. 특히 모바일에서는 한 화면에 보이는 정보가 적습니다. 그래서 버튼 주변의 한 줄 안내가 실제 전환에 큰 영향을 줍니다.`,
    `매출과 신뢰에 영향을 주는 이유
${ctx.industry} 사이트에서 ${theme.label}은 전환 흐름의 마지막 마찰을 줄이는 장치입니다. 광고비를 늘려도 결제 직전 안내가 약하면 고객은 “나중에 다시 보자”라고 판단할 수 있습니다. 반대로 버튼 가까이에 제공 범위, 문의 경로, 예외 기준, 처리 시간을 배치하면 고객은 다음 행동을 예측할 수 있습니다. 이 예측 가능성이 곧 신뢰입니다. 신뢰가 쌓여야 무료 진단에서 리포트, FixPack, Auto 정기 케어로 이어지는 결과물 선택 흐름도 자연스러워집니다. 실무에서는 한 문장 차이로 문의 품질이 달라집니다. 고객이 먼저 이해하고 들어오면 상담은 설득보다 확인에 가까워집니다.`,
    `실무 적용 순서
1. 고객이 행동하기 직전의 화면을 먼저 엽니다. 결제 버튼, 문의 버튼, 회원가입 버튼, 가격표, 신청 완료 화면을 우선 확인합니다.
2. ${detected} 중 고객 질문과 직접 연결되는 항목을 버튼 주변에 배치합니다.
3. 푸터와 정책 문서에는 전체 기준을 두고, 행동 화면에는 요약 문장을 둡니다.
4. 모바일 화면에서 문장이 접히거나 버튼 아래로 밀리는지 확인합니다.
5. 수정 후 무료 진단 또는 내부 재진단으로 남은 공백을 비교합니다.
6. 같은 문제가 여러 페이지에서 반복되면 공통 컴포넌트로 분리합니다.
7. 게시글에는 수정 이유와 기대 효과를 남겨 다음 점검 때 기준으로 사용합니다.`,
    `문구 개선 예시
${copyExamples.map(([before, after], index) => `${index + 1}. 바꾸기 전: “${before}”
   바꾼 뒤: “${after}”`).join('\n')}
좋은 문구는 짧지만 책임 범위가 분명합니다. 과장 표현보다 처리 기준, 답변 시간, 포함 범위를 적는 편이 안전합니다. 고객은 멋진 표현보다 자신의 위험이 줄어드는지를 먼저 봅니다. 그래서 다음 행동 버튼은 행동을 유도하되, 주변 문장은 불안을 낮추는 역할을 해야 합니다.`,
    `검증 체크리스트
${checklist.map((item, index) => `${index + 1}. ${item}.`).join('\n')}
체크리스트는 한 번 보고 끝내는 용도가 아닙니다. 새 상품을 올리거나 가격을 바꿀 때마다 같은 기준으로 반복 점검해야 합니다. 특히 자동 발행 칼럼은 누적될수록 사이트의 전문성을 보여주는 자료가 됩니다. 같은 주제라도 사례, 고객 질문, 개선 순서가 달라야 전문가가 쓴 글처럼 읽힙니다.`,
    `고객 질문을 고려한 구성
전문가처럼 보이는 게시글은 같은 말을 반복하지 않습니다. 제목에는 ${theme.label}처럼 실제 고객이 결제 전에 궁금해할 표현을 넣습니다. 첫 문단에는 문제 상황과 해결 방향을 함께 제시합니다. 중간에는 체크리스트와 전후 문구 예시를 넣어 읽는 사람이 바로 적용할 수 있게 합니다. 마지막에는 무료 진단, 상품·요금, 내 사이트 관리처럼 행동 단계를 명확히 연결합니다. 이렇게 구성하면 독자는 광고가 아니라 실무 가이드로 받아들이게 됩니다. 제목, 소제목, FAQ, 연결된 공개 페이지가 같은 의도로 연결될 때 신뢰 흐름과 전환 흐름이 함께 좋아집니다.`,
    `자주 묻는 질문
${faq.map(([q, a], index) => `Q${index + 1}. ${sentence(q)}
A. ${sentence(a)}`).join('\n\n')}
FAQ는 단순한 꼬리말이 아닙니다. 고객이 구매 직전에 궁금해하는 질문을 본문 안으로 끌어오는 장치입니다. 답변은 짧게 쓰되, 다음 행동으로 이어지는 단서를 남기는 것이 좋습니다.`,
    `자연스러운 다음 행동
이 글은 법률 판단이나 매출 상승을 보장하지 않습니다. 다만 고객이 멈추는 지점을 찾고, 판매 흐름을 정리하는 실무 기준으로 사용할 수 있습니다. 먼저 무료 진단으로 현재 사이트의 안내 공백을 확인합니다. 결과를 저장한 뒤 상세 리포트에서 페이지별 근거와 수정 우선순위를 확인하세요. 실제 문구 교체가 필요하면 FixPack이 적합합니다. 반복 점검과 게시판 발행까지 관리하려면 Auto 정기 케어로 연결하는 흐름이 자연스럽습니다. 자동 발행 칼럼은 20분마다 1회 자동 발행되는 것을 기준으로 운영합니다. 중요한 것은 빠른 발행보다 누적 품질입니다. 매 글이 하나의 작은 컨설팅 칼럼처럼 보여야 합니다.`,
    `관련 링크
${linksText}`
  ].join('\n\n');
  return punctuateArticleLines(body);
}

export function ctaTopicPacks() { return legacyCtaTopicPacks(); }
export function ctaFingerprint(value = '') { return legacyCtaFingerprint(value); }
export function ctaCombinationStats() {
  return {
    engineVersion: COMBINATORIAL_ENGINE_VERSION,
    mode: 'unbounded_seeded_combinatorial_generation',
    topicPackCount: legacyCtaTopicPacks().length,
    finiteTemplateFloor: comboStatsFloor(),
    theoreticalCombinations: 'unbounded_by_seed_time_scan_target_findings_and_history',
    displayLabel: '글감, 업종, 고객 질문, 전문가형 칼럼 구조, 사례, 제목, FAQ, 연결된 공개 페이지, 수익화 버튼 안내를 조합해 20분마다 4천~5천자 안팎의 전문 포스팅을 만듭니다.',
    duplicateDefense: ['본문 중복 확인', '제목 중복 확인', '최근 글감 반복 방지', '고객 질문 다양화', '공개 게시판 재작성 시드 고정', '기존 중복글 마이그레이션']
  };
}

export function buildCtaBoardArticle(scan = {}, variant = {}, options = {}) {
  const ctx = comboContext(scan, variant, options);
  const legacy = legacyBuildCtaBoardArticle(scan, ctx.baseVariant, { ...options, seed: ctx.baseSeed });
  const findingCount = Number.isFinite(Number(scan.totalFindings)) ? Number(scan.totalFindings) : Array.isArray(scan.detailFindings) ? scan.detailFindings.length : 3;
  const top = humanList(scan.topFindings || (scan.detailFindings || []).map(item => item?.title), '고객 안내, 환불 기준, 개인정보 안내');
  const rawKeyword = `${legacy.seo?.primaryKeyword || ctx.baseVariant.primaryKeyword || '사이트 점검'} ${ctx.angle[3]}`;
  const keyword = stripJargon(rawKeyword);
  const titleCandidates = helpfulTitle(ctx, keyword, legacy.title);
  const pickedTitle = normalizeText(options.title || variant.title || comboPick(titleCandidates, ctx.seed, 8), titleCandidates[0]);
  const titleSlot = `${(Number.parseInt(ctx.token, 16) % 999) + 1}-${String(options.sequenceOffset ?? 0).padStart(3, '0')}`;
  const titleTail = cleanPublicPhrase(`실무 체크 ${Number(options.sequenceOffset ?? 0) + 1}`);
  const title = cleanPublicPhrase(options.title || variant.title ? pickedTitle : `${pickedTitle} · ${titleTail}`);
  const faqSet = easyFaq(ctx.seed, ctx.industry, ctx.target, top);
  const metaDescription = clampText(`${ctx.industry} 사이트에서 고객이 문의·구매 전에 확인하는 안내를 쉽게 정리합니다.`);
  const themeForTags = articleThemeFromKeyword(`${keyword} ${ctx.baseVariant?.primaryKeyword || ''} ${ctx.baseVariant?.headline || ''}`);
  const tags = expertSeoTags(ctx.industry, themeForTags, ctx, keyword);
  const internalLinks = [
    { label: '무료 진단', href: '/products/veridion/demo' },
    { label: '상품·요금', href: '/plans' },
    { label: '내 사이트 관리', href: '/portal' },
    { label: '게시판', href: '/board' }
  ];
  const body = humanizeBody({ ctx, legacy, title, titleCandidates, findingCount, top, keyword, faqSet, internalLinks, sequenceLabel: titleSlot });
  const combinationKey = `${ctx.baseVariant.ctaType}:${ctx.angle[0]}:${ctx.audience}:${ctx.archetype[0]}:${ctx.token}`;
  return {
    ...legacy,
    title,
    body,
    titleCandidates,
    tags,
    ctaType: `${ctx.baseVariant.ctaType}_${ctx.token}`,
    baseCtaType: ctx.baseVariant.ctaType,
    combinationMode: 'unbounded_seeded_combinatorial',
    combinationKey,
    contentArchetype: ctx.archetype[0],
    audienceSegment: ctx.audience,
    toneProfile: 'expert_editorial_commercial',
    readabilityTarget: 'expert_but_accessible_korean',
    targetLengthKo: '4200-5200',
    trustFriendlyVersion: 'phase256-expert-editorial-risk-trust-v1',
    publicDisplayVersion: 'phase217-expert-editorial-board',
    diversityKey: `${ctx.baseVariant.ctaType}:${ctx.angle[1]}:${ctx.angle[2]}:${ctx.angle[0]}:${ctx.archetype[0]}:${fingerprint(body)}`,
    contentFingerprint: fingerprint(`${title}\n${body}`),
    seo: {
      ...(legacy.seo || {}),
      primaryKeyword: keyword,
      secondaryKeywords: unique([...(legacy.seo?.secondaryKeywords || []), '쉬운 사이트 점검', '고객 안내 문구', '모바일 안내 개선', `${ctx.industry} 리스크 점검`]).slice(0, 10),
      searchIntent: ctx.angle[1],
      funnelStage: ctx.angle[2],
      persona: `${ctx.audience} / 일반 독자`,
      metaDescription,
      internalLinks,
      readingTimeMinutes: Math.max(4, Math.ceil(body.length / 850)),
      contentGoal: '전문가형 포스팅으로 고객 문제, 실무 해결, 리스크 점검 다음 행동을 자연스럽게 연결하기',
      combinationMode: 'unbounded_seeded_combinatorial',
      combinationKey,
      contentArchetype: 'expert_editorial_revenue_post',
      audienceSegment: ctx.audience,
      toneProfile: 'expert_editorial_commercial',
      humanToneVersion: HUMAN_TONE_VERSION,
      legacyHumanToneVersion: HUMAN_TONE_LEGACY_VERSION,
      legacyHumanToneVersion: HUMAN_TONE_LEGACY_VERSION,
      trustFriendlyVersion: 'phase256-expert-editorial-risk-trust-v1'
    }
  };
}


function isCtaLikePublication(item = {}) {
  const typeText = [
    item.type,
    item.boardType,
    item.ctaType,
    item.baseCtaType,
    item.combinationMode,
    item.autoPublished ? 'autoPublished' : ''
  ].join(' ').toLowerCase();
  if (/cta|auto|board|publication/.test(typeText) && (item.autoPublished || item.ctaType || item.baseCtaType)) return true;
  const body = String(item.body || item.summary || '');
  return /제목 후보|고객 의도|고객 단계|CTA|리스크|고객 단계|첫 화면|요약 설명|fingerprint|아키타입/.test(body);
}

function inferRewriteScan(item = {}, options = {}) {
  const seo = item.seo || {};
  const target = options.target || item.target || item.normalizedTarget || item.site || item.url || seo.target || '등록 사이트';
  const industry = options.industry || item.industry || seo.industry || '온라인 사업';
  const findings = unique([
    ...(Array.isArray(item.topFindings) ? item.topFindings : []),
    ...(Array.isArray(item.detailFindings) ? item.detailFindings.map(row => row?.title || row?.label || row?.message) : []),
    item.primaryKeyword,
    seo.primaryKeyword,
    item.qualityStandard,
    item.searchIntent
  ]).filter(Boolean).slice(0, 5);
  return {
    requestId: item.requestId || item.id || options.seed || fingerprint(JSON.stringify(item).slice(0, 800)),
    target,
    normalizedTarget: target,
    industry,
    totalFindings: Number(item.totalFindings || findings.length || 3),
    topFindings: findings.length ? findings : ['고객 안내', '환불 기준', '개인정보 안내'],
    detailFindings: findings.map((title, index) => ({ id: `legacy-${index + 1}`, title }))
  };
}

export function rewriteExistingCtaPublication(item = {}, options = {}) {
  if (!item || typeof item !== 'object') return item;
  if (!isCtaLikePublication(item) && !options.force) return item;
  const scan = inferRewriteScan(item, options);
  const baseType = item.baseCtaType || baseTypeOf(item.ctaType) || 'reader_friendly_rewrite';
  const variant = {
    ctaType: baseType,
    baseCtaType: baseType,
    primaryKeyword: item.primaryKeyword || item.seo?.primaryKeyword || '쉬운 사이트 점검',
    headline: stripJargon(item.title || item.headline || '사이트 안내를 쉽게 정리하기'),
    intent: '고객 이해형',
    funnel: '이해',
    persona: '일반 독자'
  };
  const rewritten = buildCtaBoardArticle(scan, variant, {
    ...options,
    seed: `${options.seed || 'existing-cta-rewrite'}:${item.id || item.createdAt || fingerprint(JSON.stringify(item).slice(0, 400))}`,
    sequenceOffset: options.sequenceOffset ?? 0
  });
  const oldBody = String(item.body || item.summary || '');
  return {
    ...item,
    title: rewritten.title,
    body: rewritten.body,
    summary: clampText(rewritten.seo?.metaDescription || rewritten.body, 180),
    tags: rewritten.tags,
    seo: {
      ...(item.seo || {}),
      ...(rewritten.seo || {}),
      legacyTitle: item.title || item.seo?.legacyTitle,
      legacyContentFingerprint: item.contentFingerprint || fingerprint(oldBody)
    },
    searchIntent: '전문가 실무형',
    funnelStage: '문제 인식-해결-결정',
    primaryKeyword: rewritten.seo?.primaryKeyword || '전문 사이트 점검',
    ctaType: rewritten.ctaType,
    baseCtaType: rewritten.baseCtaType,
    combinationMode: rewritten.combinationMode,
    combinationKey: rewritten.combinationKey,
    contentArchetype: 'expert_editorial_existing_rewrite',
    audienceSegment: rewritten.audienceSegment || '사이트 담당자·마케터·구매 검토자',
    toneProfile: 'expert_editorial_commercial',
    readabilityTarget: 'expert_but_accessible_korean',
    humanToneVersion: HUMAN_TONE_VERSION,
    trustFriendlyVersion: 'phase256-expert-editorial-risk-trust-v1',
    publicDisplayVersion: 'phase217-expert-editorial-board',
    rewrittenAt: options.rewrittenAt || new Date().toISOString(),
    rewrittenBy: 'phase217_expert_editorial_rewriter',
    originalContentFingerprint: item.originalContentFingerprint || fingerprint(oldBody),
    contentFingerprint: fingerprint(`${rewritten.title}\n${rewritten.body}`),
    migrationNote: '기존 자동 발행 칼럼을 전문가형 포스팅 구조와 수익화 CTA 흐름으로 다시 정리했습니다.'
  };
}

export function auditHumanFriendlyCtaArticle(item = {}) {
  const text = [item.title, item.body, item.summary, (item.tags || []).join(' ')].join('\n');
  const banned = HARD_WORDS.map(([from]) => from).filter(word => new RegExp(String(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(text));
  const longSentences = String(item.body || '').split(/[.!?\n]/).map(s => s.trim()).filter(s => s.length > 95);
  const requiredSections = EXPERT_EDITORIAL_SECTIONS;
  const missingSections = requiredSections.filter(section => !String(item.body || '').includes(section));
  return {
    ok: banned.length === 0 && missingSections.length === 0 && longSentences.length <= 6 && String(item.body || '').length >= 4200,
    banned,
    missingSections,
    longSentenceCount: longSentences.length,
    bodyLength: String(item.body || '').length,
    readabilityTarget: item.readabilityTarget || item.seo?.readabilityTarget || 'unknown'
  };
}

export function chooseCtaVariant(db = {}, options = {}) {
  const base = legacyChooseCtaVariant(db, options);
  const items = [...(db.publications || []), ...(db.boards || [])].filter(Boolean).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const recentBaseTypes = new Set(items.slice(0, 48).map(item => item.baseCtaType || baseTypeOf(item.ctaType)).filter(Boolean));
  const autoCount = items.filter(item => item.autoPublished || item.type === 'cta' || item.boardType === 'cta').length;
  const seed = `${options.seed || ''}:${autoCount}:${options.sequenceOffset || 0}:${new Date().toISOString().slice(0, 16)}`;
  const packs = legacyCtaTopicPacks();
  const start = Math.abs(hashInt(seed)) % packs.length;
  const rotated = [...packs.slice(start), ...packs.slice(0, start)];
  const selectedBase = rotated.find(item => !recentBaseTypes.has(item.ctaType)) || base;
  const angle = comboPick(COMBO_ANGLES, seed, 21) || COMBO_ANGLES[0];
  const audience = comboPick(COMBO_AUDIENCES, seed, 22) || '사이트 담당자';
  const archetype = comboPick(COMBO_ARCHETYPES, seed, 23) || COMBO_ARCHETYPES[0];
  const token = fingerprint(`${seed}:${selectedBase.ctaType}:${angle[0]}:${audience}:${archetype[0]}`).slice(0, 6);
  return {
    ...selectedBase,
    baseCtaType: selectedBase.ctaType,
    ctaType: `${selectedBase.ctaType}_${token}`,
    combinationMode: 'unbounded_seeded_combinatorial',
    combinationKey: `${selectedBase.ctaType}:${angle[0]}:${audience}:${archetype[0]}:${token}`,
    headline: `${selectedBase.headline} · ${angle[0]}`,
    intent: angle[1] || selectedBase.intent,
    funnel: angle[2] || selectedBase.funnel,
    primaryKeyword: `${selectedBase.primaryKeyword} ${angle[3]}`,
    persona: `${audience} / ${selectedBase.persona || '사이트 담당자'}`
  };
}

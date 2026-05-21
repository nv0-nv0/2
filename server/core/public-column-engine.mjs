const MINUTE_MS = 60 * 1000;

const RISK_TAG_POOL = {
  common: ['온라인사업자','신뢰점검','안내점검','고객불안요인','전자상거래법','개인정보보호','표시광고법','무료진단','사업자점검','리스크관리'],
  ecommerce: ['결제전고지','청약철회','환불정책','상품정보고지','전자상거래고지','구매전안내','고객분쟁예방','쇼핑몰운영','디지털상품','소비자보호'],
  privacy: ['개인정보처리방침','개인정보동의','문의폼점검','수집목적','보관기간','입력폼안내','개인정보보호법','회원가입폼','고객정보보호','프라이버시'],
  ads: ['표시광고','과장광고','기만광고','광고문구점검','성과보장표현','후기광고','랜딩페이지문구','광고법리스크','구매전환문구','신뢰문구'],
  conversion: ['다음 행동','전환율개선','버튼문구','구매전환','문의전환','랜딩페이지','모바일전환','고객신뢰','내부링크','페이지구조'],
  support: ['FAQ','체크리스트','고객센터','사업자정보','푸터점검','문의경로','고객지원','정책링크','운영점검','재진단']
};

const CTA_COLUMN_SEEDS = [
  {
    id: 'ecom-before-payment',
    hook: '결제 전 고지',
    title: '결제 버튼 앞에서 빠진 안내가 고객 불안 요인 후보가 되는 이유',
    keyword: '전자상거래법 리스크 점검',
    intent: '온라인 쇼핑몰과 디지털 상품 판매자가 결제 직전 화면에서 확인해야 할 고지 구조',
    problem: '온라인 사업자는 가격과 혜택만 보여주는 것이 아니라 제공 범위, 총 비용, 환불·청약철회 기준을 고객이 결제 전에 이해할 수 있게 배치해야 합니다.',
    tags: [...RISK_TAG_POOL.common, ...RISK_TAG_POOL.ecommerce].slice(0, 10),
    faq: [
      ['결제 버튼 근처에 어떤 정보를 보여줘야 하나요?', '제공 범위, 총 결제 금액, 환불·청약철회 기준, 문의 경로처럼 고객이 결제 전에 다시 확인하는 정보를 버튼 주변에 연결하는 것이 좋습니다.'],
      ['무료 진단에서 어디까지 확인할 수 있나요?', '무료 진단은 문제 영역, 영향 요소, 구분별 개수를 빠르게 보여주고 상세 근거와 수정 문구는 유료 리포트에서 제공합니다.']
    ],
    checklist: ['결제 버튼과 같은 화면에서 제공 범위를 확인할 수 있는가', '환불·청약철회 기준 링크가 모바일에서도 보이는가', '추가 비용이나 제한 조건이 결제 전에 설명되는가', '문의 경로와 응답 기준이 분리되어 있지 않은가']
  },
  {
    id: 'privacy-form',
    hook: '개인정보 입력폼',
    title: '문의폼 하나에도 개인정보 안내가 필요한 이유',
    keyword: '개인정보 리스크 점검',
    intent: '이름·전화번호·이메일을 받는 온라인 문의폼의 개인정보 안내 구조',
    problem: '이메일이나 전화번호를 받는 순간 고객은 수집 목적, 보관 기간, 처리방침 링크를 확인하고 싶어 합니다. 안내가 멀리 있으면 민원과 이탈 후보가 동시에 생깁니다.',
    tags: [...RISK_TAG_POOL.privacy].slice(0, 10),
    faq: [
      ['문의폼에 개인정보처리방침 링크만 있으면 충분한가요?', '링크만 있는 것보다 입력 항목, 수집 목적, 답변 기준을 입력 영역 가까이에 함께 보여주는 구성이 더 이해하기 쉽습니다.'],
      ['상세한 법률 판단도 자동으로 해주나요?', 'VERIDION은 법률 위반을 확정하지 않고 공개 화면에서 보이는 확인 필요 항목와 보완 우선순위를 정리합니다.']
    ],
    checklist: ['수집 항목과 목적을 입력폼 주변에서 설명하는가', '개인정보처리방침 링크가 버튼 가까이에 있는가', '보관 기간 또는 처리 기준을 고객이 찾기 쉬운가', '모바일에서 동의 문구가 접혀 숨지 않는가']
  },
  {
    id: 'ad-claim',
    hook: '표시광고 표현',
    title: '근거 없는 보장형 문구가 고객 신뢰를 깨는 방식',
    keyword: '표시광고 표현 점검',
    intent: '성과 보장·최고·완벽 같은 표현이 있는 광고 문구의 확인 필요 항목 점검',
    problem: '성과를 단정하거나 과장으로 읽힐 수 있는 문구는 전환을 높이는 대신 표시광고 확인 필요 항목를 만들 수 있습니다.',
    tags: [...RISK_TAG_POOL.ads].slice(0, 10),
    faq: [
      ['강한 광고 문구를 모두 없애야 하나요?', '모두 없앨 필요는 없지만 근거, 조건, 범위를 함께 제시해 오해 가능성을 줄이는 방향이 좋습니다.'],
      ['어떤 표현을 먼저 봐야 하나요?', '보장형, 무조건형, 확정형, 최고·최저가처럼 근거 확인이 필요한 단정형 표현부터 점검하는 것이 좋습니다.']
    ],
    checklist: ['성과 보장 표현에 조건과 근거가 함께 있는가', '후기·사례가 일반적 성과처럼 보이지 않는가', '할인·혜택 조건이 본문 가까이에 설명되는가', '광고 문구와 실제 제공 범위가 어긋나지 않는가']
  },
  {
    id: 'refund-withdrawal',
    hook: '환불·청약철회',
    title: '환불 기준은 푸터보다 결제 흐름 가까이에 있어야 합니다',
    keyword: '환불 정책 점검',
    intent: '환불·청약철회 기준이 결제 전 고객 흐름 안에서 보이는지 확인',
    problem: '고객은 결제 직전에 취소 가능 기간, 제한 조건, 환불 절차를 다시 확인합니다. 정보가 멀리 있으면 결제도 민원도 동시에 불안정해집니다.',
    tags: ['환불정책','청약철회','전자상거래법','결제전안내','취소기준','디지털상품','소비자보호','고객분쟁예방','정책링크','무료진단'],
    faq: [
      ['환불 정책은 푸터에만 있어도 되나요?', '푸터 링크도 필요하지만 결제 흐름 가까이에 핵심 요약과 링크를 함께 제공해야 고객이 쉽게 확인할 수 있습니다.'],
      ['디지털 상품도 같은 기준으로 봐야 하나요?', 'PDF·리포트·템플릿처럼 제공이 시작되는 상품은 제공 시점과 환불 제한 가능성을 결제 전 명확히 안내하는 것이 중요합니다.']
    ],
    checklist: ['환불 가능 기간과 제한 조건이 분리되어 보이는가', '디지털 산출물 제공 시점을 설명하는가', '결제 화면에서 환불 정책 링크를 확인할 수 있는가', '모바일에서도 정책 요약이 보이는가']
  },
  {
    id: 'business-footer',
    hook: '사업자 정보',
    title: '푸터 사업자 정보가 사이트 신뢰와 규제 리스크를 동시에 줄이는 이유',
    keyword: '사업자 정보 점검',
    intent: '푸터와 고객지원 영역에 사업자 정보와 문의 경로가 충분히 있는지 확인',
    problem: '상호, 대표자, 사업자등록번호, 연락 경로, 정책 링크가 한 영역에서 확인되면 고객은 사이트 운영 주체를 더 쉽게 신뢰합니다.',
    tags: ['사업자정보','푸터점검','고객센터','문의경로','전자상거래고지','신뢰요소','정책링크','온라인사업자','리스크관리','무료진단'],
    faq: [
      ['사업자 정보는 어디에 두는 것이 좋나요?', '푸터처럼 모든 페이지에서 접근 가능한 영역에 두고, 결제·문의 화면에서도 쉽게 연결되도록 구성하는 것이 좋습니다.'],
      ['전화번호가 없으면 문제가 되나요?', '업종과 판매 방식에 따라 필요한 고지 항목이 달라질 수 있으므로 공개 화면에서 고객이 연락 경로를 이해할 수 있는지 먼저 점검해야 합니다.']
    ],
    checklist: ['상호와 사업자등록번호가 공개되어 있는가', '고객지원 이메일 또는 문의 경로가 명확한가', '정책 페이지 링크가 한곳에 정리되어 있는가', '회사 정보가 모바일 푸터에서도 누락되지 않는가']
  },
  {
    id: 'digital-delivery',
    hook: '디지털 산출물',
    title: 'PDF·리포트 판매에서 제공 시점과 환불 제한이 중요한 이유',
    keyword: '디지털 상품 고지 점검',
    intent: '리포트·PDF·템플릿처럼 디지털 산출물을 판매하는 페이지의 고지 구조',
    problem: '디지털 산출물은 제공이 시작된 뒤 환불 제한이 생길 수 있어 결제 전 제공 방식과 제한 조건을 분명히 알려야 합니다.',
    tags: ['디지털상품','PDF리포트','제공시점','환불제한','청약철회','결제전고지','전자상거래법','산출물판매','리포트판매','무료진단'],
    faq: [
      ['디지털 산출물은 무엇을 먼저 고지해야 하나요?', '제공 방식, 제공 시작 시점, 확인 가능한 결과물 범위, 환불 제한 가능성을 결제 전 흐름에서 설명하는 것이 중요합니다.'],
      ['리포트 샘플을 보여주는 것이 도움이 되나요?', '고객이 받을 결과물을 예측할 수 있어 문의와 불안을 줄이는 데 도움이 됩니다.']
    ],
    checklist: ['결제 전 제공 방식과 파일 형태를 설명하는가', '제공 시작 후 환불 제한 가능성을 안내하는가', '샘플 리포트나 결과 예시가 있는가', '고객 문의 경로가 결제 화면과 연결되는가']
  },
  {
    id: 'subscription-notice',
    hook: '구독·자동결제',
    title: '정기결제 페이지가 반드시 설명해야 하는 세 가지',
    keyword: '구독 고지 점검',
    intent: '정기결제·구독·자동 갱신 상품의 고지 구조와 해지 안내',
    problem: '결제 주기, 갱신 방식, 해지 방법이 보이지 않으면 고객은 작은 금액이라도 불안하게 느끼고 분쟁 후보가 생깁니다.',
    tags: ['정기결제','구독서비스','자동결제','해지방법','결제주기','갱신안내','온라인사업자','고객분쟁예방','정책점검','무료진단'],
    faq: [
      ['정기결제 페이지에서 가장 중요한 것은 무엇인가요?', '결제 주기, 자동 갱신 여부, 해지 방법을 고객이 결제 전에 쉽게 확인할 수 있어야 합니다.'],
      ['월 구독 상품도 무료 진단 대상인가요?', '공개 페이지에 있는 구독 안내, 결제 전 문구, 해지 안내 링크를 기준으로 확인 필요 항목를 점검할 수 있습니다.']
    ],
    checklist: ['결제 주기와 갱신 조건이 명확한가', '해지 방법이 결제 전 화면에서 연결되는가', '무료 체험 종료 후 과금 조건이 보이는가', '고객지원 경로가 구독 안내와 연결되는가']
  },
  {
    id: 'mobile-compliance',
    hook: '모바일 고지 위치',
    title: '모바일에서 정책 링크가 밀리면 리스크도 커집니다',
    keyword: '모바일 리스크 점검',
    intent: '모바일 화면에서 고객 안내가 실제 고객에게 보이는지 확인',
    problem: 'PC에서는 보이던 환불 기준과 개인정보 링크가 모바일에서는 접혀 숨겨질 수 있습니다. 실제 고객 화면 기준으로 다시 점검해야 합니다.',
    tags: ['모바일점검','모바일가독성','정책링크','개인정보안내','환불정책','결제전고지','버튼배치','전환율개선','온라인사업자','무료진단'],
    faq: [
      ['PC에서는 보이는데 모바일에서 접히면 문제가 되나요?', '고객의 주요 유입이 모바일이라면 실제 고객 화면에서 확인 가능한지가 중요합니다.'],
      ['모바일에서 무엇을 먼저 봐야 하나요?', '버튼 주변 안내, 정책 링크, 문의 경로, 개인정보 동의 문구가 접히거나 너무 작게 보이지 않는지 확인해야 합니다.']
    ],
    checklist: ['모바일에서 결제 버튼과 안내 문구가 함께 보이는가', '정책 링크가 접힌 메뉴 안에만 있지 않은가', '개인정보 동의 문구가 너무 작지 않은가', '문의 경로가 모바일 하단에서도 접근 가능한가']
  },
  {
    id: 'legal-disclaimer',
    hook: '법률 자문 고지',
    title: '점검 서비스가 법률 자문으로 오해되면 안 되는 이유',
    keyword: '법률 자문 아님 고지',
    intent: '자동 점검 서비스가 법률 위반 확정이나 법률 자문으로 오해되지 않게 하는 안내',
    problem: '자동 진단은 공개 화면의 확인 필요 항목를 줄이는 보조 도구입니다. 법적 판단을 확정하지 않는다는 안내가 필요합니다.',
    tags: ['정보성점검','리스크후보','자동진단','고객불안요인','공개화면점검','신뢰점검','안내점검','사업자점검','유료리포트','무료진단'],
    faq: [
      ['VERIDION이 법적 판단을 하나요?', '아니요. VERIDION은 법적 판단을 확정하지 않고 공개 페이지에서 보이는 확인 필요 항목를 정리합니다.'],
      ['그럼 왜 필요한가요?', '법률 검토 전에 공개 화면의 누락 가능성을 빠르게 발견하고, 보완할 위치와 우선순위를 정하는 데 도움이 됩니다.']
    ],
    checklist: ['진단 결과에 법률 확정 표현이 없는가', '보조 도구라는 안내가 보이는가', '유료 리포트도 법률 자문으로 오해되지 않게 설명하는가', '필요 시 전문가 검토 안내가 연결되는가']
  },
  {
    id: 'public-page-check',
    hook: '공개 화면 기준',
    title: '관리자는 보이지만 고객은 못 보는 안내가 생기는 이유',
    keyword: '공개 페이지 점검',
    intent: '관리자 화면이 아니라 고객이 보는 공개 URL 기준으로 점검해야 하는 이유',
    problem: '관리자 화면에 정책이 있어도 고객 공개 화면에서 보이지 않으면 실제 리스크 감소 효과가 약합니다. 공개 URL 기준 점검이 필요합니다.',
    tags: ['공개페이지점검','고객화면','관리자화면','정책노출','사업자정보','개인정보처리방침','환불정책','공개페이지점검','리스크관리','무료진단'],
    faq: [
      ['관리자 페이지에 입력한 정책도 방문자이 읽나요?', '일반적으로 방문자과 고객은 공개 URL 기준으로 접근합니다. 공개 페이지에서 보이지 않는 정보는 점검 대상에서 빠질 수 있습니다.'],
      ['공개 URL만 입력하면 되나요?', '무료 진단은 공개 URL 기준으로 확인 가능한 구조를 먼저 점검합니다. 상세 점검은 유료 리포트에서 더 넓게 정리합니다.']
    ],
    checklist: ['정책 정보가 공개 URL에서 접근 가능한가', '메뉴와 푸터에서 정책 링크가 연결되는가', '방문자이 읽을 수 있는 텍스트 형태인가', '중요 안내가 이미지 안에만 들어가 있지 않은가']
  }
];

function offsetIso(index = 0, now = Date.now()) {
  return new Date(now - index * 20 * MINUTE_MS).toISOString();
}

function normalizeTags(tags = []) {
  return [...new Set(tags.map(tag => String(tag || '').replace(/^#/, '').trim()).filter(Boolean))].slice(0, 10);
}

function buildBody(seed) {
  const interest = [
    ['왜 이 문제가 지금 중요할까요', `${seed.problem} 많은 온라인 사업자는 광고 소재, 상품 설명, 가격 혜택을 먼저 다듬지만 고객이 결제·문의 직전에 확인하는 고객 안내는 뒤로 미룹니다. 문제는 이런 안내가 부족하면 고객의 불안과 문의가 늘고, 운영자는 나중에 환불·민원·분쟁 대응에 더 많은 시간을 쓰게 된다는 점입니다.`],
    ['고객과 방문자이 함께 보는 구조', `방문자은 제목, 요약, 소제목, 내부 링크, 반복되는 핵심 용어를 통해 문서의 주제를 이해합니다. 동시에 사람은 첫 화면에서 “이 사이트가 믿을 만한가”, “문제가 생기면 어디로 연락하나”, “결제 후 취소 기준은 무엇인가”를 확인합니다. 그래서 ${seed.hook} 관련 안내는 한 문장으로 숨기기보다 별도 소제목과 체크리스트로 분리하는 편이 좋습니다.`],
    ['사업자가 자주 놓치는 실제 상황', `관리자 화면에는 정보가 입력되어 있어도 고객 공개 페이지에는 보이지 않는 경우가 있습니다. PC에서는 보이는 정책 링크가 모바일에서는 접혀 있거나, 이미지 안에만 들어간 안내문 때문에 방문자이 문맥을 충분히 읽지 못하는 경우도 있습니다. ${seed.keyword}은 이런 작은 공백을 먼저 발견하는 데서 시작합니다.`]
  ];
  const cta = ['무료 진단으로 먼저 확인할 수 있는 것', `VERIDION 무료 진단은 ${seed.keyword}과 관련된 문제 영역, 영향 요소, 구분별 개수를 빠르게 보여줍니다. 무료 화면에서는 상세 근거와 수정 문구를 과하게 열어두지 않고, 어떤 영역에 확인 필요 항목가 몇 개 있는지 먼저 확인하게 합니다. 이후 기본 리포트와 전문가 리포트에서 페이지별 근거, 수정 문장, 적용 순서, 수동 확인 항목을 확인할 수 있습니다.`];
  const support = ['체크리스트와 FAQ', `${seed.checklist.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}\n\n자주 묻는 질문\nQ. ${seed.faq[0][0]}\nA. ${seed.faq[0][1]}\nQ. ${seed.faq[1][0]}\nA. ${seed.faq[1][1]}\n\n주의: VERIDION은 법적 판단이나 결과를 확정하지 않습니다. 공식 법령과 기관 기준을 바탕으로 공개 화면의 확인 필요 항목를 줄이는 보조 도구입니다.`];
  return [...interest, cta, support].map(([h,t]) => `${h}\n${t}`).join('\n\n');
}

function buildStructuredData(seed, post) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.createdAt,
    dateModified: post.createdAt,
    author: { '@type': 'Organization', name: 'nv0' },
    publisher: { '@type': 'Organization', name: 'nv0', url: 'https://nv0.kr' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://nv0.kr/board#${post.slug}` },
    keywords: post.tags.join(', ')
  };
}

export function buildPublicColumnEnginePosts({ now = Date.now(), pageSize = 20 } = {}) {
  return CTA_COLUMN_SEEDS.map((seed, index) => {
    const createdAt = offsetIso(index, now);
    const slug = seed.id;
    const tags = normalizeTags(seed.tags);
    const title = seed.title;
    const body = buildBody(seed);
    const metaDescription = `${seed.keyword}: ${seed.intent}. 온라인 사업자가 공개 화면에서 놓치기 쉬운 확인 필요 항목를 점검하고 무료 진단으로 연결합니다.`;
    const post = {
      id: seed.id,
      slug,
      title,
      boardType: 'cta',
      boardPurpose: 'cta',
      category: '고객 신뢰 점검 다음 행동 칼럼',
      audienceHook: seed.hook,
      primaryKeyword: seed.keyword,
      searchIntent: seed.intent,
      visibility: 'public',
      createdAt,
      updatedAt: createdAt,
      summary: `${seed.keyword} 관점에서 온라인 사업자가 고객 공개 화면에서 먼저 확인해야 할 지점을 설명하고 무료 진단으로 연결합니다.`,
      metaTitle: `${title} | VERIDION 게시판`,
      metaDescription,
      canonicalPath: `/board#${slug}`,
      headings: ['왜 이 문제가 지금 중요할까요', '고객과 방문자이 함께 보는 구조', '사업자가 자주 놓치는 실제 상황', '무료 진단으로 먼저 확인할 수 있는 것', '체크리스트와 FAQ'],
      faq: seed.faq.map(([question, answer]) => ({ question, answer })),
      checklist: seed.checklist,
      internalLinks: [
        { label: '무료 진단 시작', href: '/products/veridion/demo' },
        { label: '요금제 확인', href: '/plans' },
        { label: '서비스 안내 보기', href: '/service' }
      ],
      tags,
      hashtags: tags.map(tag => `#${tag}`),
      body,
      estimatedWordCount: body.replace(/\s+/g, ' ').trim().split(' ').length,
      contentMix: {
        interestProblem: '60%',
        ctaPersuasion: '20%',
        supportInfo: '20%',
        sectionRatio: { interestProblem: 3, ctaPersuasion: 1, supportInfo: 1 },
        purpose: '100% 다음 행동 목적'
      },
      seoElements: {
        uniqueTitle: true,
        metaDescription: true,
        canonical: true,
        h2Headings: true,
        faqBlock: true,
        checklist: true,
        internalLinks: true,
        tenHashtags: tags.length === 10,
        structuredData: true,
        humanReadableSummary: true
      },
      engine: 'public-cta-column-engine-v5-seo-expanded-purpose-100-mix-60-20-20',
      publicationCadence: '20분마다 1건 발행'
    };
    return { ...post, structuredData: buildStructuredData(seed, post) };
  }).slice(0, pageSize);
}

export function publicColumnStats(posts = []) {
  const visible = posts.filter(item => item.visibility === 'public');
  const allCta = visible.filter(item => item.boardPurpose === 'cta' || item.boardType === 'cta').length;
  return {
    visibleColumns: visible.length,
    ctaPurpose: allCta,
    nonCtaPurpose: visible.length - allCta,
    ratio: { interestProblem: '60%', ctaPersuasion: '20%', supportInfo: '20%' },
    productDefinition: '온라인 사업자의 고지·환불·개인정보 점검 감소',
    seoEnhancement: {
      uniqueTitle: true,
      metaDescription: true,
      headings: true,
      faq: true,
      checklist: true,
      internalLinks: true,
      tenHashtags: visible.every(item => Array.isArray(item.tags) && item.tags.length === 10),
      structuredData: true
    }
  };
}

export function publicColumnTypeLabel() {
  return '고객 신뢰 점검 다음 행동 칼럼';
}

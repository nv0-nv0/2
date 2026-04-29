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
const TOPIC_PACKS = [
  ['diagnosis_summary','cta','진단 결과 요약','전체 위험도를 빠르게 이해하고 상세 리포트로 이어지는 안내','처음 방문한 고객은 상품보다 먼저 사이트가 믿을 만한지 확인합니다. 사업자 정보, 환불 기준, 개인정보 안내, 문의 경로가 흐릿하면 구매나 체험 신청 직전에 멈출 수 있습니다.','정보가 없는 것보다 필요한 순간에 보이지 않는 문제가 더 큽니다. 고객이 결제 버튼을 누르기 전에 확인할 정보가 흩어져 있으면 문의가 늘고 전환 흐름이 느려질 수 있습니다.','무료 진단으로 현재 상태를 확인한 뒤, 상세 리포트에서 페이지별 근거와 수정 우선순위를 받아보세요.'],
  ['risk_alert','notice','운영 리스크 알림','고객 민원이나 분쟁 가능성을 줄이기 위한 우선순위 안내','환불, 배송, 개인정보, 약관은 평소에는 눈에 띄지 않지만 문의가 발생하면 가장 먼저 확인되는 영역입니다.','현재 발견된 항목은 즉시 위반을 뜻하지 않습니다. 다만 기준이 명확하지 않으면 불필요한 문의와 분쟁 가능성이 커질 수 있습니다.','리스크가 보이는 항목부터 정리하려면 상세 리포트에서 수정 위치와 문구 후보를 확인하세요.'],
  ['checklist','notice','전환 전 체크리스트','광고·문의·결제 전 확인해야 하는 실무 점검표','광고를 집행하거나 문의 전환을 늘리기 전에 사이트 안내가 준비되어 있는지 확인해야 합니다.','체크리스트 없이 운영하면 어떤 화면부터 고쳐야 하는지 판단하기 어렵습니다. 푸터, 상세 페이지, 결제 직전, 회원가입 단계는 서로 연결되어야 합니다.','체크리스트를 직접 적용하기 어렵다면 무료 진단 결과를 저장하고 FixPack 또는 Pro 리포트로 이어가세요.'],
  ['before_after','case','수정 전후 비교','고객 안내 문구를 더 명확하게 바꾸는 예시 중심 포스팅','같은 내용이라도 표현 방식에 따라 고객이 느끼는 신뢰가 달라집니다.','대표적인 문제는 조건 없는 표현입니다. 실제 운영 기준과 맞지 않을 경우 오해를 만들 수 있으므로 범위와 예외를 분리해야 합니다.','내 사이트 문구를 수정 전후로 비교하고 싶다면 FixPack에서 바로 붙여 넣을 수 있는 문구안을 확인하세요.'],
  ['case_study','case','운영 사례 기반 안내','비슷한 온라인 사업자가 먼저 정리하는 항목 소개','온라인 사업자는 업종이 달라도 고객이 확인하는 기본 정보가 비슷합니다.','문제가 되는 지점은 대개 한 페이지가 아니라 여러 화면 사이의 연결입니다. 홈에는 안내가 있지만 결제 화면에는 없는 식입니다.','비슷한 구조의 사이트가 어떤 항목부터 정리하는지 보려면 상세 리포트와 Auto 운영 플랜을 함께 검토하세요.'],
  ['plan_compare','cta','플랜 선택 기준','무료 진단 이후 어떤 상품을 선택할지 안내','무료 진단은 문제를 발견하는 데 집중합니다. 실제 반영에는 리포트, 수정 문구, 템플릿, 정기 점검 중 필요한 산출물을 골라야 합니다.','단순 확인, 문구 수정, 문서 초안, 반복 관리는 서로 다른 접근이 필요합니다.','무료 결과를 확인했다면 지금 필요한 산출물 유형을 기준으로 상품을 비교해 보세요.'],
  ['privacy_tip','notice','개인정보 안내 위치 점검','입력 직전 고지와 동의 흐름을 정리하는 안내','개인정보 안내는 문서가 존재하는 것만으로 충분하지 않습니다. 입력하는 순간에 확인할 수 있어야 합니다.','푸터에 링크가 있어도 입력 폼 주변에서 확인하기 어렵다면 고객은 불안감을 느낄 수 있습니다.','개인정보 안내 문구 위치와 표현을 정리하려면 상세 리포트에서 페이지별 점검 결과를 확인하세요.'],
  ['terms_tip','notice','약관 연결 구조 점검','서비스 이용 기준과 제한 조건을 고객 흐름에 맞게 연결','이용약관은 사이트 하단에만 두면 고객이 실제 행동 전에 확인하기 어렵습니다.','약관 내용이 간단하거나 주요 제한 조건이 결제 화면과 떨어져 있으면 분쟁 상황에서 설명 부담이 커질 수 있습니다.','약관 구조와 결제 전 고지를 함께 정리하려면 TemplatePack 또는 FixPack 산출물을 확인하세요.'],
  ['ad_copy_review','case','광고 표현 점검','확정형·보장형 표현을 완화하는 실무 가이드','광고나 랜딩페이지에서는 강한 표현이 전환에 도움이 될 것처럼 보입니다.','무조건, 100%, 완벽, 확정 같은 표현은 공식 근거가 없으면 사용에 주의가 필요합니다.','광고 문구와 CTA를 더 안전하게 정리하려면 FixPack에서 수정 전후 문구안을 받아보세요.'],
  ['rescan','cta','수정 후 재진단','수정이 실제로 반영됐는지 확인하는 재점검 안내','사이트를 한 번 수정했다고 모든 화면이 동시에 정리되는 것은 아닙니다.','수정 후 재진단을 하지 않으면 어떤 부분이 개선됐고 어떤 부분이 남았는지 알기 어렵습니다.','수정 후 상태를 관리하려면 내 사이트에 결과를 저장하고 재진단 기능을 사용하세요.'],
  ['saved_site','cta','사이트 저장과 반복 관리','한 번의 진단을 운영 루틴으로 연결하는 안내','사이트 운영은 한 번 점검으로 끝나지 않습니다. 상품과 이벤트가 바뀌면 안내 문구도 함께 바뀌어야 합니다.','진단 결과를 저장하지 않으면 이전 상태와 현재 상태를 비교하기 어렵습니다.','내 사이트 관리에 결과를 저장하고 반복 점검 루틴을 만들어 보세요.'],
  ['weekly_ops','notice','주간 운영 루틴','정기적으로 사이트 안내와 CTA를 점검하는 운영형 포스팅','사이트는 오픈 직후보다 운영 중에 더 많은 공백이 생깁니다.','방치된 게시판, 오래된 공지, 맞지 않는 CTA는 고객에게 운영이 멈춘 인상을 줄 수 있습니다.','반복 운영이 필요하다면 Auto 정기 케어로 진단과 게시판 발행을 함께 관리하세요.']
].map(([ctaType, boardType, headline, angle, intro, problem, cta]) => ({ ctaType, boardType, headline, angle, intro, problem, cta }));
const PROCESS_COPY = '실행 순서는 1) 고객 행동 직전 화면 확인, 2) 누락·모호·과장 표현 분리, 3) 수정 문구 적용, 4) 모바일 화면 재확인, 5) 같은 기준의 재진단입니다.';
function tagsFor(industry, ctaType) {
  const compact = String(industry || '온라인사업').replace(/\s+/g, '');
  return Array.from(new Set([`#${compact}`, '#사이트점검', '#무료진단', '#고객안내', '#CTA', `#${ctaType.replace(/_/g, '')}`])).slice(0, 8);
}
function listText(items = []) {
  const list = Array.isArray(items) ? items.map(item => String(item || '').trim()).filter(Boolean).slice(0, 3) : [];
  return list.length ? list.join(', ') : '고객 안내, 환불 기준, 개인정보 안내 위치';
}
export function ctaTopicPacks() { return TOPIC_PACKS; }
export function buildCtaBoardArticle(scan = {}, variant = {}, options = {}) {
  const pack = TOPIC_PACKS.find(item => item.ctaType === variant.ctaType) || TOPIC_PACKS[0];
  const target = normalizeText(scan.target, '등록 사이트');
  const industry = normalizeText(scan.industry, '온라인 사업');
  const findingCount = Number.isFinite(Number(scan.totalFindings)) ? Number(scan.totalFindings) : 3;
  const riskScore = Number.isFinite(Number(scan.riskScore ?? scan.score)) ? Math.round(Number(scan.riskScore ?? scan.score)) : null;
  const top = listText(scan.topFindings);
  const scoreLine = riskScore === null ? '현재 점수는 확인 필요 상태입니다.' : `현재 내부 진단 점수는 ${riskScore}/100이며, 점수는 실제 법률 판단이나 성과 보장을 의미하지 않습니다.`;
  const titleCandidates = [
    `${industry} ${pack.headline}: ${pack.angle}`,
    `${industry} 운영자가 ${pack.headline}에서 먼저 볼 기준`,
    `${target} 점검 후 ${pack.headline}을 정리하는 순서`,
    `${industry} 전환 흐름을 위한 ${pack.headline} 체크`,
    `${pack.headline}으로 고객 불안을 줄이는 방법`
  ];
  const title = normalizeText(options.title || variant.title || titleCandidates[0], titleCandidates[0]);
  const tags = Array.isArray(options.tags) && options.tags.length ? options.tags : tagsFor(industry, pack.ctaType);
  const body = [
    `제목 후보\n1. ${titleCandidates[0]}\n2. ${titleCandidates[1]}\n3. ${titleCandidates[2]}\n4. ${titleCandidates[3]}\n5. ${titleCandidates[4]}`,
    `도입\n${target} 운영에서 이번 글의 주제는 ${pack.headline}입니다. ${pack.intro} ${scoreLine} 이 글은 한 줄 홍보 문구가 아니라 현재 진단 신호를 바탕으로 어떤 항목을 먼저 확인하면 좋은지 설명하는 포스팅입니다.`,
    `문제 제기\n이번 점검 기준으로는 ${findingCount}개 항목을 우선 확인 대상으로 보았습니다. 특히 ${top} 항목은 고객이 구매, 문의, 체험 신청 전에 확인하려는 정보와 연결될 수 있습니다. ${pack.problem} 다만 이 결과만으로 법률 위반 여부나 과태료 발생 여부를 단정하지 않습니다.`,
    `해결 과정\n${PROCESS_COPY}`,
    `신뢰 근거\n이 글은 사용자가 입력한 사이트 진단 정보와 서비스 내부 점검 항목을 바탕으로 작성되었습니다. 가격, 법령, 정책, 인증 여부처럼 외부 확인이 필요한 내용은 임의로 단정하지 않습니다. 자동 발행 글은 무료 진단, 상세 리포트, 수정 문구안, 정기 점검 범위 안에서만 안내하며 법률 자문이나 결과 보장을 대신하지 않습니다.`,
    `FAQ\nQ1. 이 글만 보면 모든 문제가 해결되나요?\n아닙니다. 우선순위 안내이며 실제 적용 전에는 운영 서비스 범위와 공식 정책을 확인해야 합니다.\n\nQ2. 무엇부터 고치는 것이 좋나요?\n고객이 행동하기 직전에 보는 정보부터 정리하는 편이 효율적입니다. 문의, 결제, 회원가입, 푸터 순서로 확인합니다.\n\nQ3. 같은 글이 반복 발행되나요?\n아닙니다. 자동 발행은 진단 요약, 체크리스트, 개인정보 안내, 약관 구조, 광고 표현, 재진단, 주간 운영 등 서로 다른 주제를 순환하도록 설계됩니다.`,
    `자연스러운 CTA\n${pack.cta} 무료 진단으로 현재 안내 공백을 먼저 확인하고, 결과를 저장하면 상세 리포트, 수정 문구안, Auto 정기 점검으로 이어서 관리할 수 있습니다. 과장된 보장보다 현재 상태를 정확히 보고 필요한 항목부터 정리하는 것이 핵심입니다.`,
    `태그\n${tags.join(' ')}`
  ].join('\n\n');
  return { title, body, titleCandidates, tags, boardType: pack.boardType, ctaType: pack.ctaType, diversityKey: `${pack.ctaType}:${fingerprint(title)}`, contentFingerprint: fingerprint(body) };
}
export function chooseCtaVariant(db = {}, options = {}) {
  const recent = new Set([...(db.publications || []), ...(db.boards || [])].slice(0, 24).map(item => item.ctaType || item.diversityKey || item.title).filter(Boolean));
  const count = (db.publications || []).filter(item => item.autoPublished || item.type === 'cta').length + (db.boards || []).filter(item => item.autoPublished || item.type === 'cta').length + Number(options.sequenceOffset || 0);
  const rotated = [...TOPIC_PACKS.slice(count % TOPIC_PACKS.length), ...TOPIC_PACKS.slice(0, count % TOPIC_PACKS.length)];
  return rotated.find(pack => !recent.has(pack.ctaType)) || rotated[0];
}
export function ctaFingerprint(value = '') { return fingerprint(value); }

import { buildCtaBoardArticle, chooseCtaVariant } from '../server/core/cta-publication.mjs';

const bannedInBody = [
  'contentFingerprint',
  'fingerprint',
  'CTA',
  'SEO',
  '퍼널',
  '아키타입',
  '랜딩',
  '메타 설명 후보',
  '검색 의도·고객 단계',
  '전환 흐름의 마찰',
  '고도화'
];

const sampleScan = {
  target: 'https://example-shop.kr',
  industry: '온라인 쇼핑몰',
  totalFindings: 6,
  score: 72,
  riskScore: 72,
  topFindings: ['환불 안내 위치가 낮음', '문의 버튼 주변 설명 부족', '개인정보 안내가 눈에 잘 보이지 않음'],
  detailFindings: [
    { title: '환불 안내 위치가 낮음' },
    { title: '문의 버튼 주변 설명 부족' },
    { title: '개인정보 안내가 눈에 잘 보이지 않음' }
  ]
};

const articles = [];
for (let i = 0; i < 80; i += 1) {
  const variant = chooseCtaVariant({ publications: articles }, { seed: `human-${i}`, sequenceOffset: i });
  const article = buildCtaBoardArticle(sampleScan, variant, { seed: `human-${i}`, sequenceOffset: i });
  articles.push(article);
}

const failures = [];
const titleSet = new Set();
const bodySet = new Set();

for (const [index, article] of articles.entries()) {
  titleSet.add(article.title);
  bodySet.add(article.contentFingerprint);
  if (!article.body.includes('왜 이 글을 썼나요?')) failures.push(`sample ${index}: missing reader-friendly intro heading`);
  if (!article.body.includes('고객 입장에서 보면')) failures.push(`sample ${index}: missing customer viewpoint section`);
  if (!article.body.includes('문구를 쉽게 바꾸는 방법')) failures.push(`sample ${index}: missing easy wording section`);
  if (!article.body.includes('자주 묻는 질문')) failures.push(`sample ${index}: missing FAQ section`);
  if (!article.body.includes('다음에 할 일')) failures.push(`sample ${index}: missing next action section`);
  if (!article.toneProfile || article.toneProfile !== 'human_reader_friendly_middle_school') failures.push(`sample ${index}: missing toneProfile`);
  for (const banned of bannedInBody) {
    if (article.body.includes(banned)) failures.push(`sample ${index}: body contains hard word "${banned}"`);
  }
  const tooLong = article.body.split(/[.!?。]|다\.|요\./).some(sentence => sentence.trim().length > 160);
  if (tooLong) failures.push(`sample ${index}: sentence too long for easy-reader target`);
}

if (titleSet.size < 60) failures.push(`title diversity too low: ${titleSet.size}/80`);
if (bodySet.size < 80) failures.push(`body fingerprint diversity too low: ${bodySet.size}/80`);

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures: failures.slice(0, 50) }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  phase: 'P154',
  target: 'humanized CTA board publication',
  samples: articles.length,
  uniqueTitles: titleSet.size,
  uniqueBodies: bodySet.size,
  readabilityTarget: 'middle_school_korean',
  bannedJargonRemoved: true,
  requiredSections: ['왜 이 글을 썼나요?', '지금 보이는 문제', '고객 입장에서 보면', '바로 고칠 수 있는 것', '문구를 쉽게 바꾸는 방법', '자주 묻는 질문', '다음에 할 일']
}, null, 2));

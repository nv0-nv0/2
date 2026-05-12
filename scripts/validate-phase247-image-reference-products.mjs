import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const publicDir = path.join(root, 'apps/public');

const pageFiles = [
  ['home/index.html', ['검색 노출과 전환을 높이는', '사이트 진단 요약', '진단은 이렇게 진행됩니다', '전문가 칼럼', '진단 결과 요약 예시']],
  ['service/index.html', ['서비스 소개', '공개 접근 진단', '구조 분석', '전환 관점 점검', 'nv0가 제공하는 결과']],
  ['solutions/index.html', ['분석 프로세스', 'URL 입력', '접근 확인', '자동 수집', '결과 리포트 제공']],
  ['board/index.html', ['전문가 칼럼', '검색 로봇도 잘 읽고', '검색 노출을 높이는 콘텐츠 구조', '20분']],
  ['guides/index.html', ['가이드', '추천 가이드', '자주 찾는 도움말', '빠른 체크리스트']],
  ['plans/index.html', ['요금제', '무료 진단', '기본 리포트', '전문가 리포트', '요금제 비교']],
  ['veridion-demo/index.html', ['무료 진단', '사이트 주소 하나로', 'demoResult', 'targetUrl']],
  ['documents/index.html', ['문서 생성', '고객 안내문', '정책 초안']],
  ['cases/index.html', ['개선 사례', '커머스 사이트', 'B2B 서비스']],
  ['portal/index.html', ['내 사이트 관리', '최근 진단 요약', 'portalNextActions']],
  ['checkout/index.html', ['결제 확인', '주문 요약', '결제 전에 받을 결과물']],
  ['business-info/index.html', ['사업자 정보', '고객지원']],
  ['terms/index.html', ['이용약관']],
  ['privacy/index.html', ['개인정보처리방침']],
  ['refund/index.html', ['환불']],
  ['auth/index.html', ['로그인', '내 사이트를 저장']]
];

const forbiddenVisible = [
  'Customer View',
  'CTA 게시판',
  '자동발행',
  '자동 발행 200',
  'contentFingerprint',
  'combinationMode',
  'publicDisplayVersion',
  'Editorial Board',
  'Trust Flow',
  'VERIDION SUMMARY',
  '유료 전체 상세 공개 게이트',
  '문제 전체 내용 100% 공개 게이트',
  'undefined',
  'NaN'
];

for (const [rel, needles] of pageFiles) {
  const file = path.join(publicDir, rel);
  assert.ok(fs.existsSync(file), `missing page ${rel}`);
  const html = fs.readFileSync(file, 'utf8');
  assert.ok(html.includes('<nav aria-label="주요 메뉴" class="nv0-nav">'), `top menu missing in ${rel}`);
  for (const label of ['서비스 소개', '분석 프로세스', '전문가 칼럼', '가이드', '요금제']) {
    assert.ok(html.includes(label), `menu label ${label} missing in ${rel}`);
  }
  for (const needle of needles) {
    assert.ok(html.includes(needle), `reference section '${needle}' missing in ${rel}`);
  }
  for (const token of forbiddenVisible) {
    assert.ok(!html.includes(token), `forbidden visible token '${token}' in ${rel}`);
  }
}

const css = read('shared/nv0-clean-slate-20260512.css');
assert.ok(css.includes('PHASE247 image-reference implementation lock'), 'phase247 css lock missing');
assert.ok(!/\.nv0-nav\s*\{[^}]*display\s*:\s*none/i.test(css), 'nv0-nav hidden in css');
assert.ok(!/\.site-menu\s*\{[^}]*display\s*:\s*none/i.test(css), 'site-menu hidden in css');
assert.ok(/\.nv0-nav,.site-menu\{display:flex!important/i.test(css), 'final visible nav override missing');

const demoJs = read('apps/public/veridion-demo/app.js');
for (const token of ['unified-trust-dashboard', 'utd-top-grid', 'utd-urgent-strip', 'result-tabbed-ia']) {
  assert.ok(demoJs.includes(token), `demo result layout token missing: ${token}`);
}
for (const token of ['VERIDION SUMMARY', '문제 전체 내용 100% 공개 게이트', '유료 전체 상세 공개 게이트']) {
  assert.ok(!demoJs.includes(token), `old demo/portal wording remains: ${token}`);
}

console.log(JSON.stringify({ ok: true, checkedPages: pageFiles.length, navVisible: true, demoLayout: true }, null, 2));

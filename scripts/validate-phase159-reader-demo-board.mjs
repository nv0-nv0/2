import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
fs.mkdirSync(docsDir, { recursive: true });
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
const add = (name, ok, details = '') => checks.push({ name, ok: Boolean(ok), details });

const homeHtml = read('apps/public/home/index.html');
const homeJs = read('apps/public/home/app.js');
const demoJs = read('apps/public/veridion-demo/app.js');
const boardHtml = read('apps/public/board/index.html');
const boardJs = read('apps/public/board/app.js');
const boardCss = read('apps/public/board/app.css');
const server = read('server/index.mjs');
const routeSources = [server, 'server/routes/public.mjs'].map(item => item === server ? server : (fs.existsSync(path.join(root, item)) ? read(item) : '')).join('\n');
const cta = read('server/core/cta-publication.mjs');
const pkg = JSON.parse(read('package.json'));

add('home:copy-compressed', !homeJs.includes('mountSmartProductPanel') && (homeHtml.match(/무료 진단/g) || []).length <= 7, '메인 페이지 반복 동적 패널 제거 및 무료 진단 반복 최소화');
add('home:no-url-input', !homeHtml.includes('placeholder="https://your-store.kr"') && !homeHtml.includes('name="target"'), '메인 주소 입력창 없음');
add('home:required-cta-kept', homeHtml.includes('무료 진단 화면으로 이동') && homeHtml.includes('요금제 먼저 보기'), '기존 CTA 검증 호환');
add('demo:prelaunch-turnstile-soft-pass', server.includes('prelaunch_turnstile_token_missing') && server.includes('prelaunch_turnstile_verify_soft_fail'), 'prelaunch에서는 Turnstile 누락/실패가 데모 실패로 직결되지 않음');
add('demo:error-shows-detail', demoJs.includes('상세 오류') && demoJs.includes('보안 확인 토큰이 준비되지 않았습니다'), '데모 실패 시 원인별 안내');
add('board:page-size-five-api', routeSources.includes('const pageSize = 5') && routeSources.includes('pagination: { page, pageSize, total, totalPages'), '게시판 API 5개 페이지네이션');
add('board:frontend-pagination', boardJs.includes('boardPagination') && boardJs.includes("pageSize: '5'") && boardJs.includes('data-page'), '게시판 프론트 페이지 번호 이동');
add('board:html-pagination-container', boardHtml.includes('id="boardPagination"') && boardHtml.includes('한 페이지에 5개씩'), '게시판 UI 안내 및 페이지 컨테이너');
add('board:css-pagination', boardCss.includes('.board-pagination') && boardCss.includes('aria-current="page"'), '페이지네이션 스타일');
add('board:hide-internal-upgrade-box', boardCss.includes('.board-post .upgrade-box{display:none'), '내부 운영 목적 박스 숨김');
add('board:public-transform-api', routeSources.includes('toPublicBoardPost') && routeSources.includes('publicDisplayVersion') && routeSources.includes('reader_helpful_paginated_board'), '기존 조잡한 CTA 글도 공개 응답에서 도움형 글로 변환');
add('cta:no-title-candidates-body', cta.includes('function cleanPublicPhrase') && cta.includes('이 글에서 바로 얻을 수 있는 것') && cta.includes('const body = humanizeBody') && cta.includes('body,'), '신규 자동 글 본문이 도움형 humanizeBody로 교체됨');
add('cta:helpful-sections', ['이런 경우 문제가 됩니다','고객은 이렇게 느낍니다','오늘 바로 확인할 체크리스트','문구를 이렇게 바꿔보세요','마무리'].every(token => cta.includes(token)), '사람이 읽는 도움형 섹션');
add('package:phase159-script', Boolean(pkg.scripts?.['validate:phase159'] && pkg.scripts?.['phase159:final']), '검증 스크립트 등록');

const bannedPublicMarkers = ['제목 후보', 'contentFingerprint', '퍼널', '아키타입'];
for (const marker of bannedPublicMarkers) {
  add(`board-ui:no-marker:${marker}`, !boardHtml.includes(marker) && !boardJs.includes(marker), '게시판 공개 UI 내부용 표현 제거');
}

const report = {
  generatedAt: new Date().toISOString(),
  ok: checks.every(item => item.ok),
  phase: 'P159-reader-demo-board-hotfix',
  scope: 'home copy dedupe, demo turnstile resilience, board pagination, reader-helpful CTA content',
  total: checks.length,
  passed: checks.filter(item => item.ok).length,
  failed: checks.filter(item => !item.ok).length,
  checks,
  failures: checks.filter(item => !item.ok)
};
fs.writeFileSync(path.join(docsDir, 'PHASE159_READER_DEMO_BOARD_HOTFIX_VALIDATION_20260502.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, report: 'docs/PHASE159_READER_DEMO_BOARD_HOTFIX_VALIDATION_20260502.json' }, null, 2));
if (!report.ok) process.exit(1);

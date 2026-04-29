import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
function walk(rel, out = []) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return out;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) walk(child, out);
    else out.push(child);
  }
  return out;
}

for (const rel of [
  'package.json',
  'server/index.mjs',
  'shared/base.css',
  'shared/session-nav.js',
  'scripts/check-source-syntax.mjs',
  'tests/e2e.mjs',
  'tests/routes-smoke.mjs'
]) add(`package-required:${rel}`, exists(rel), 'Docker/Coolify 배포와 로컬 검증에 필요한 필수 파일을 포함한다.');

const runtimeFiles = walk('apps').concat(walk('shared'), walk('server'), walk('deploy')).filter(file => /\.(html|js|mjs|css|sh|yml|yaml|txt|example)$/i.test(file));
for (const token of ['통신판매업 신고 완료 후 표시 예정', '상용 결제 전 입력 필요', '호스팅 제공자 실제 운영 인프라 확정 후 입력 필요', 'support@nv0.kr']) {
  const hits = runtimeFiles.filter(file => read(file).includes(token));
  add(`runtime-no-banned-token:${token}`, hits.length === 0, hits.length ? hits.join(', ') : '상용 런타임 파일 노출 없음');
}

const server = read('server/index.mjs');
const sessionNav = read('shared/session-nav.js');
const baseCss = read('shared/base.css');
const boardHtml = read('apps/public/board/index.html');
const boardJs = read('apps/public/board/app.js');

add('live-root-footer-guard:mail-order-placeholder-hidden', /mailOrderRegistrationNumber[\s\S]*legalFieldBlockPattern\.test/.test(server), '통신판매업 신고번호가 미확정/예정 문구일 때 푸터에서 숨긴다.');
add('session-menu:login-link-present', server.includes('login-link'), '공용 메뉴에 세션 전환 기준점을 둔다.');
add('session-menu:logout-button-active', /\/api\/public\/auth\/logout/.test(sessionNav) && /replaceWith\(button\)/.test(sessionNav), '로그인 상태에서 로그아웃 버튼으로 교체하고 POST 로그아웃을 실행한다.');
add('session-menu:no-html-injection', !/innerHTML/.test(sessionNav) && /textContent/.test(sessionNav), '세션 메뉴는 HTML 삽입 없이 textContent 기반으로 처리한다.');
add('visual-polish:nav-and-brand-css', /\.site-topbar[\s\S]*\.brand-mark[\s\S]*\.nav-logout-button/.test(baseCss), '상단 메뉴와 로그아웃 버튼 시각 스타일을 포함한다.');
add('visual-polish:responsive-menu-css', baseCss.includes('(max-width:900px)') && baseCss.includes('grid-template-columns:repeat(2,minmax(0,1fr))'), '모바일 메뉴 줄바꿈과 터치 영역을 보정한다.');
add('board:no-permanent-loading-copy', !boardHtml.includes('게시글을 불러오고 있습니다.') && !boardJs.includes('게시글을 불러오고 있습니다.'), '게시판 초기 문구가 영구 로딩처럼 보이지 않는다.');
add('board:empty-state-guides-user', boardJs.includes('조건에 맞는 게시글이 없습니다.') && boardJs.includes('Auto 플랜'), '빈 상태가 다음 행동을 안내한다.');
add('accessibility:board-status-live', /id="boardState"[^>]*role="status"[^>]*aria-live="polite"/.test(boardHtml), '게시판 상태 영역은 스크린리더에 변경 사항을 알린다.');

const htmlFiles = walk('apps').filter(file => file.endsWith('.html'));
const buttonsWithoutType = [];
for (const file of htmlFiles) {
  const html = read(file);
  if (/<button\b(?![^>]*\btype=)[^>]*>/i.test(html)) buttonsWithoutType.push(file);
}
add('forms:all-buttons-have-type', buttonsWithoutType.length === 0, buttonsWithoutType.length ? buttonsWithoutType.join(', ') : '모든 HTML button에 type을 지정했다.');

const publicJs = walk('apps/public').filter(file => file.endsWith('.js'));
const unsafeInnerHtmlHits = [];
for (const file of publicJs) {
  const js = read(file);
  if (/innerHTML\s*=/.test(js)) {
    const usesSanitizer = /escapeHtml|escapeAttr|renderList/.test(js);
    if (!usesSanitizer) unsafeInnerHtmlHits.push(file);
  }
}
add('security:public-innerhtml-sanitized', unsafeInnerHtmlHits.length === 0, unsafeInnerHtmlHits.length ? unsafeInnerHtmlHits.join(', ') : '공개 JS innerHTML 사용부는 escape/render helper 기준을 통과했다.');

const failed = checks.filter(check => !check.ok);
const summary = {
  generatedAt: new Date().toISOString(),
  ok: failed.length === 0,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
  limitation: '로컬 패키지 검증은 실제 운영 배포, Cloudflare 캐시, 실결제 승인, 로그인 후 라이브 DOM 시각 상태를 확정하지 못한다. 해당 항목은 배포 후 운영 URL에서 재확인이 필요하다.'
};
fs.writeFileSync(path.join(root, 'docs/PHASE124_FULL_REAUDIT_VALIDATION_20260428.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
process.exit(failed.length ? 1 : 0);

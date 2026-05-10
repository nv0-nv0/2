import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const checks = [];
function add(name, ok, detail = '') { checks.push({ name, ok: Boolean(ok), detail }); }
const read = (file) => fs.readFileSync(file, 'utf8');
const homeHtml = read('apps/public/home/index.html');
const homeCss = read('apps/public/home/app.css');
const plansHtml = read('apps/public/plans/index.html');
const plansCss = read('apps/public/plans/app.css');
const security = read('server/middleware/security.mjs');
const server = read('server/index.mjs');

add('landing-page-visible-value-ladder', /nv0-revenue-ladder/.test(homeHtml) && /nv0-revenue-grid/.test(homeCss), '홈에서 무료→유료 상품 흐름이 JS 없이 보여야 한다.');
add('paid-offer-prices-visible-in-html', ['69,000원','99,000원','299,000원 / 월'].every(v => plansHtml.includes(v)), '가격이 JS API 실패 시에도 노출되어야 한다.');
add('direct-checkout-links-visible-in-html', ['/checkout?plan=Report','/checkout?plan=FixPack','/checkout?plan=Auto'].every(v => plansHtml.includes(v)), '유료 상품은 고객지원 우회 없이 체크아웃으로 연결해야 한다.');
add('fixpack-recommended-in-static-and-js', /clean-plan-card recommended[\s\S]*data-plan-code="FixPack"/.test(plansHtml) && /recommended[^\n]+FixPack|FixPack[^\n]+추천/.test(plansHtml + plansCss), '가장 실행형 상품인 FixPack이 기본 추천으로 보여야 한다.');
add('canonical-host-redirect-app-layer', /canonical_host_redirect/.test(security) && /canonicalBaseUrl: seoBaseUrl\(\)/.test(server), '앱 계층에서도 www/apex 표준화를 보정해야 한다.');
add('canonical-host-redirect-can-be-disabled', /NV0_CANONICAL_HOST_REDIRECT/.test(server), '프록시 정책 충돌 시 환경변수로 비활성화할 수 있어야 한다.');
add('mail-order-placeholder-guard', /isSafePublicOptionalField/.test(server) && /replace\|placeholder/.test(server) && /requireMailOrderShape/.test(server), '통신판매업 신고번호 placeholder를 푸터 출력 전에 차단해야 한다.');
add('package-phase216-final-script', JSON.parse(read('package.json')).scripts['phase216:final'], '최종 게이트 스크립트가 등록되어야 한다.');

const syntax = spawnSync(process.execPath, ['--check', 'server/middleware/security.mjs'], { encoding: 'utf8' });
add('security-middleware-syntax', syntax.status === 0, syntax.stderr || syntax.stdout);

const failed = checks.filter(item => !item.ok);
const result = {
  generatedAt: new Date().toISOString(),
  ok: failed.length === 0,
  scoreAfterPatch: failed.length === 0 ? 100 : Math.max(0, 100 - failed.length * 12),
  checks,
  failed: failed.map(item => item.name),
  limitation: '운영 서버의 Cloudflare/Coolify 리다이렉트와 캐시 정책은 이 로컬 패키지 검증만으로 직접 변경할 수 없으므로, 배포 후 엣지 리다이렉트 규칙을 별도 확인해야 한다.'
};
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);

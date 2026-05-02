import fs from 'node:fs';

const checks = [];
function read(file){return fs.readFileSync(file,'utf8');}
function check(name, ok, detail='') { checks.push({ name, ok: !!ok, detail }); }

const homeHtml = read('apps/public/home/index.html');
const homeCss = read('apps/public/home/app.css');
const demoHtml = read('apps/public/veridion-demo/index.html');
const demoJs = read('apps/public/veridion-demo/app.js');
const plansJs = read('apps/public/plans/app.js');
const turnstileJs = read('shared/turnstile.js');
const server = read('server/index.mjs');

check('home_url_input_removed', !/name="target"|placeholder="https:\/\/your-store\.kr"/.test(homeHtml), '메인 화면 URL input 제거');
check('home_cta_only', homeHtml.includes('무료 진단 화면으로 이동') && homeHtml.includes('요금제 먼저 보기'), '메인 CTA 버튼화');
check('home_css_cta_box', homeCss.includes('.nv67-cta-box'), '입력창 제거 후 CTA 레이아웃 보강');
check('demo_security_not_stuck_copy', demoHtml.includes('준비가 지연되어도 무료 진단 버튼은 계속 사용할 수 있습니다'), '보안 확인 고착 문구 제거');
check('turnstile_timeout_fallback', turnstileJs.includes('fetchJsonWithTimeout') && turnstileJs.includes('continueWithoutChallenge') && turnstileJs.includes('일반 진단 모드'), 'Turnstile timeout/fallback 구현');
check('server_turnstile_effective_flag', server.includes('TURNSTILE_PUBLIC_ENABLED') && server.includes('TURNSTILE_CONFIGURED'), '서버 Turnstile 유효 설정 플래그');
check('server_public_config_hides_placeholder', server.includes('turnstileConfigured: TURNSTILE_CONFIGURED') && server.includes('turnstileSiteKey: TURNSTILE_PUBLIC_ENABLED ? TURNSTILE_SITE_KEY :'), 'placeholder key public 노출 방지');
check('server_turnstile_verify_skips_placeholder', server.includes('turnstile_not_configured_or_placeholder'), 'placeholder/prelaunch verify skip');
check('plans_missing_functions_fixed', plansJs.includes('function discountLabel') && plansJs.includes('function valueLabel'), '요금제 JS 누락 함수 보강');
check('plans_api_fallback', plansJs.includes('function fallbackOffers') && plansJs.includes('기본 요금표를 표시합니다'), '요금제 API 실패 fallback');

const duplicateFunctions = [...demoJs.matchAll(/function\s+([A-Za-z0-9_]+)\s*\(/g)].reduce((acc, m) => { acc[m[1]] = (acc[m[1]] || 0) + 1; return acc; }, {});
const duplicates = Object.entries(duplicateFunctions).filter(([,count]) => count > 1);
check('demo_no_duplicate_function_declarations', duplicates.length === 0, JSON.stringify(duplicates));

const ok = checks.every(item => item.ok);
const result = { ok, checkedAt: new Date().toISOString(), checks };
console.log(JSON.stringify(result, null, 2));
if (!ok) process.exit(1);

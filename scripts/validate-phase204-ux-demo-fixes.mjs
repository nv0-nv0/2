import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const failures = [];
const checks = [];
function pass(id, ok, detail = '') { checks.push({ id, ok, detail }); if (!ok) failures.push(`${id}:${detail}`); }

const home = read('apps/public/home/index.html');
const homeVisible = home.replace(/<[^>]+hidden[^>]*>.*?<\/[^>]+>/gs, '');
pass('home.fixed_72_removed', !/<(?:b|strong)[^>]*>\s*72\s*<\/(?:b|strong)>/.test(homeVisible), 'home still exposes fixed 72 score');
pass('home.clean_preview', home.includes('nv0-dashboard-clean') && home.includes('고정 점수 예시는 제거했습니다'), 'home clean dashboard preview missing');

const demoIndex = read('apps/public/veridion-demo/index.html');
const demoJs = read('apps/public/veridion-demo/app.js');
pass('demo.fixed_72_removed', !demoIndex.includes('<strong>72</strong>') && !demoIndex.includes('무료 진단 결과 예시'), 'demo default fixed score/example remains');
pass('demo.fallback_result', demoJs.includes('buildLocalFallbackScan') && demoJs.includes('client_safe_fallback') && demoJs.includes('renderResult(fallback)'), 'client fallback result missing');
pass('demo.err_only_removed', !demoJs.includes('진단 결과 생성 실패') && !demoJs.includes('이번 실행에서 결과를 끝까지 만들지 못했습니다'), 'ERR-only failure dashboard remains in runtime JS');

const boardIndex = read('apps/public/board/index.html');
const boardJs = read('apps/public/board/app.js');
pass('board.sidebar_controls', (boardIndex.match(/data-filter=/g) || []).length >= 4 && (boardIndex.match(/data-topic=/g) || []).length >= 5, 'sidebar controls are not clickable buttons');
pass('board.topic_runtime', boardJs.includes('topicButtons') && boardJs.includes('postMatchesTopic') && boardJs.includes('updateUrlState'), 'topic/filter runtime missing');

const portal = read('apps/public/portal/index.html');
pass('portal.save_site_promoted', portal.indexOf('class="nv74-card nv74-save-site"') > -1 && portal.indexOf('class="nv74-card nv74-save-site"') < portal.indexOf('id="portalNextActions"'), 'save site section is not above next-actions');

const plansCss = read('apps/public/plans/app.css');
pass('plans.badge_no_overlap', plansCss.includes('position:static !important') && plansCss.includes('recommended-badge'), 'plan badge overlap fix missing');

const sharedCss = read('shared/design-system.css');
pass('global.visibility_guardrails', sharedCss.includes('PHASE203: final global guardrails') && sharedCss.includes('box-sizing:border-box'), 'global guardrails missing');

const server = read('server/index.mjs');
pass('server.soft_timeout', server.includes('SCAN_SOFT_TIMEOUT_MS') && server.includes('buildBuiltinScanResultWithFetchBudget'), 'server scan soft-timeout fallback missing');

const ok = failures.length === 0;
const result = { ok, suite: 'phase204_ux_demo_reliability', checked: checks.length, checks, failures, checkedAt: new Date().toISOString() };
console.log(JSON.stringify(result, null, 2));
process.exit(ok ? 0 : 1);

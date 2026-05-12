import fs from 'node:fs';

const app = fs.readFileSync('apps/public/veridion-demo/app.js', 'utf8');
const css = fs.readFileSync('shared/nv0-clean-slate-20260512.css', 'utf8');
const checks = [];
function add(id, ok, detail) { checks.push({ id, ok: Boolean(ok), detail }); }

add('progress-steps-structured-copy', app.includes("{ title: 'URL 입력', detail: '주소 형식과 공개 접근 가능 여부 확인' }") && app.includes("{ title: '결과 정렬', detail: '점수·근거·다음 행동을 읽기 쉬운 순서로 정리' }"), 'progress steps are split into title/detail, not concatenated inline text');
add('progress-render-has-readable-wrapper', app.includes('demo-progress-steps phase240-readable-steps') && app.includes('<div><b>${escapeHtml(step.title)}</b><p>${escapeHtml(step.detail)}</p></div>'), 'runtime progress markup has a number, title block, and detail block');
add('old-inline-render-removed', !app.includes('<p>${escapeHtml(step)}</p>'), 'old inline single-string renderer is removed');
add('css-grid-step-layout-lock', css.includes('.phase239-copy :where(.phase240-readable-steps li,.demo-progress-steps li)') && css.includes('grid-template-columns:42px minmax(0,1fr);'), 'shared clean-slate CSS locks numbered steps into a two-column readable card');
add('css-marker-duplication-guard', css.includes('::marker{content:""}') && css.includes('li > span'), 'ordered-list marker duplication is suppressed and visible number chip is styled');
add('legacy-loading-steps-readable', css.includes('.phase239-copy .loading-steps > *') && css.includes('.phase239-copy :where(.phase240-readable-steps li b,.demo-progress-steps li b,.loading-steps b)'), 'legacy inline b+text loading steps are forced into stacked readable text');
const phase240Start = css.indexOf('/* Phase240: readable step/pill layout lock');
const phase241Start = css.indexOf('/* PHASE241', phase240Start + 1);
const phase240Block = css.slice(phase240Start, phase241Start > phase240Start ? phase241Start : undefined);
add('mini-steps-not-overridden-by-phase240', !phase240Block.includes('phase239-mini-steps'), 'existing mini-step hero layout is not unintentionally overridden by the emergency patch');

const failed = checks.filter(c => !c.ok);
const result = { ok: failed.length === 0, checks, failed };
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);

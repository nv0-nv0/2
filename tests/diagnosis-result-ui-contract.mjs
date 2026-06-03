import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const js = read('apps/public/demo/app.js');
const css = read('apps/public/demo/app.css');
const html = read('apps/public/demo/index.html');
const checks = [];
function add(name, fn) { try { fn(); checks.push({ name, ok: true }); } catch (error) { checks.push({ name, ok: false, error: error.message }); } }

add('sample-is-controlled-executive-brief', () => assert.match(html, /class="vrd-sample"[\s\S]*FREE PREVIEW · 통제 공개 · CONTROLLED DISCLOSURE[\s\S]*25% OPEN · 75% LOCKED[\s\S]*근거 원장 잠금[\s\S]*수정 명세서 잠금/));
add('executive-report-renderers-exist', () => {
  for (const name of ['executiveReportModel','renderVr360DocumentControl','renderVr360ExecutiveHero','renderVr360ReportIndex','renderVr360ExecutiveBrief','renderVr360RiskMap','renderVr360Journey','renderVr360ControlSnapshot','renderVr360PriorityIssues','renderVr360DecisionMemo','renderVr360Unlock','renderPaidExecutiveReport','renderVr360TechnicalDetails','renderVr360StickyCta','renderVr360Result']) assert.match(js, new RegExp(`function ${name}\\(`), name);
});
add('result-uses-report-system-only', () => {
  const block = js.slice(js.lastIndexOf('function renderResult(scan)'), js.length);
  assert.match(block, /setResultHtml\(renderVr360Result\(view, scan\)\)/);
  assert.doesNotMatch(block, /renderConversionCommandCenter|renderCrisisAreaMap|renderTopRiskSpotlight|renderProgressiveEvidenceDetails/);
});
add('professional-document-control-present', () => {
  assert.match(js, /REPORT ID/);
  assert.match(js, /REPORT CLASS/);
  assert.match(js, /PUBLIC WEB SIGNALS/);
  assert.match(js, /CLIENT CONFIDENTIAL/);
});
add('executive-decision-structure-present', () => {
  assert.match(js, /MANAGEMENT DECISION/);
  assert.match(js, /01 · 경영진 판단 요약/);
  assert.match(js, /중요한 이유/);
  assert.match(js, /확인된 내용/);
  assert.match(js, /다음 조치/);
});
add('free-preview-is-explicitly-limited', () => {
  assert.match(js, /무료 경영진 요약 · 25% 공개/);
  assert.match(js, /통제 공개 · 상세 분석 75% 잠금/);
  assert.match(js, /무료 화면은 전체 리포트의 약 25%만 공개합니다/);
  assert.match(js, /근거 URL, 페이지별 위치, 수정 문구, 실행 순서, 재점검 기준은 상세 리포트에서 공개됩니다/);
});
add('professional-report-chapters-present', () => {
  for (const token of ['Executive Decision','Trust Exposure Map','Buyer Friction Path','Priority Register','Evidence Ledger','Fix Specification','14-Day Roadmap','Recheck Protocol','Executive Appendix','Expert Review Notes']) assert.match(js, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});
add('report-sequence-is-deliberate', () => {
  const block = js.slice(js.indexOf('function renderVr360Result(view, scan)'), js.indexOf('function renderResult(scan)'));
  const order = ['renderVr360ExecutiveHero(view, model, paid)','renderVr360ReportIndex(view, paid, model)','renderVr360ExecutiveBrief(view, model)','renderVr360RiskMap(view, model)','renderVr360Journey(view, model)','renderVr360ControlSnapshot(view, model)','renderVr360PriorityIssues(view, model)','renderVr360DecisionMemo(view, model)','renderVr360Unlock(view, model)','renderVr360TechnicalDetails(view, scan, paid, model)','renderVr360StickyCta(view, model)'];
  let cursor = -1;
  for (const token of order) { const next = block.indexOf(token); assert.ok(next > cursor, token); cursor = next; }
});
add('paid-paths-visible', () => {
  assert.match(js, /checkout\?plan=Report/);
  assert.match(js, /checkout\?plan=Expert/);
  assert.match(js, /페이지별 근거/);
  assert.match(js, /정확한 수정 위치/);
  assert.match(js, /수정 전후 문구/);
  assert.match(js, /14일 로드맵/);
  assert.match(js, /재점검 기준/);
});
add('risk-copy-is-persuasive-but-not-deceptive', () => {
  assert.match(js, /법률 판단이나 실제 매출 손실 확정값이 아니라/);
  assert.match(js, /실제 이탈률 측정값이 아니라/);
  assert.match(js, /공개 화면에서 우선 점검해야 할 신뢰 공백의 상대 강도/);
  assert.doesNotMatch(js, /매출 손실은 확정|반드시 매출|무조건 구매|법률 위반 확정|매출이 떨어집니다/);
});
add('free-technical-details-are-limited', () => {
  const block = js.slice(js.indexOf('function renderVr360TechnicalDetails(view, scan, paid = false'), js.indexOf('function renderVr360StickyCta(view'));
  assert.match(block, /if \(paid\) return/);
  assert.match(block, /75% CONTROLLED DISCLOSURE/);
  assert.doesNotMatch(block.split('if (paid) return')[0], /renderEvidenceFindings/);
});
add('paid-report-has-evidence-and-roadmap', () => {
  const block = js.slice(js.indexOf('function renderPaidExecutiveReport'), js.indexOf('function renderPaidCleanResult'));
  assert.match(block, /Evidence Ledger/);
  assert.match(block, /14-Day Roadmap/);
  assert.match(block, /vrd-paid-row/);
  assert.match(block, /vrd-roadmap-row/);
});
add('csp-safe-no-inline-style', () => assert.doesNotMatch(js, /\bstyle\s*=/i));
add('required-report-css-components', () => {
  for (const token of ['.vrd-report-shell','.vrd-document-control','.vrd-cover','.vrd-score-card','.vrd-kpi-strip','.vrd-report-layout','.vrd-index','.vrd-decision-grid','.vrd-dashboard-grid','.vrd-risk-card','.vrd-journey-card','.vrd-control-grid','.vrd-priority','.vrd-decision-memo','.vrd-premium','.vrd-paid-report','.vrd-details','.vrd-sticky','.vrd-sample-control']) assert.ok(css.includes(token), token);
});
add('aligned-fixed-grid-css', () => {
  assert.match(css, /\.vrd-document-control\{display:grid;grid-template-columns:repeat\(4/);
  assert.match(css, /\.vrd-cover-grid\{display:grid;grid-template-columns:/);
  assert.match(css, /\.vrd-report-layout\{display:grid;grid-template-columns:/);
  assert.match(css, /\.vrd-dashboard-grid\{display:grid;grid-template-columns:/);
  assert.match(css, /\.vrd-kpi-strip\{display:grid;grid-template-columns:repeat\(5/);
});
add('mobile-responsive-css', () => assert.match(css, /@media\(max-width:760px\)[\s\S]*\.vrd-document-control\{grid-template-columns:repeat\(2[\s\S]*\.vrd-cover-grid\{grid-template-columns:1fr[\s\S]*\.vrd-priority-list article\{grid-template-columns:[\s\S]*\.vrd-sticky/));

const failures = checks.filter(item => !item.ok);
const report = { ok: failures.length === 0, contract: 'veridion-2.4-executive-trust-report-ui-contract', checkedAt: new Date().toISOString(), checked: checks.length, failed: failures.length, failures, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/DIAGNOSIS_RESULT_UI_CONTRACT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);

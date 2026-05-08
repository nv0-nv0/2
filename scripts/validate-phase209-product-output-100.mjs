import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const checks = [];
function ok(name, condition, detail = '') {
  checks.push({ name, pass: Boolean(condition), detail });
  if (!condition) console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
}

const service = read('apps/public/service/index.html');
const demo = read('apps/public/veridion-demo/app.js');
const demoCss = read('apps/public/veridion-demo/app.css');
const plans = read('apps/public/plans/index.html');
const server = read('server/index.mjs');
const cta = read('server/core/cta-publication.mjs');
const workOrderPath = 'PHASE209_PRODUCT_OUTPUT_100_WORK_ORDER_AND_TEST_REVIEW_20260508_KO.md';

for (const token of ['무료 데모','상세 리포트','FixPack','Auto 정기 케어']) {
  ok(`서비스 100점 카드 포함: ${token}`, service.includes(token) && service.includes('<strong>100점</strong>'));
}
ok('서비스 페이지 phase209 100 섹션', service.includes('phase209-product-100') && service.includes('100점 완성본'));
ok('서비스 수용 기준 카드', service.includes('phase209-acceptance-grid') && service.includes('무료 데모 수용 기준') && service.includes('Auto 수용 기준'));
ok('공개 서비스 페이지 기존 80점대 점수 제거', !/(84점|86점|82점|80점|83점)/.test(service));

ok('데모 결과 100점 함수 추가', demo.includes('function renderPhase209CompletionScorecard'));
ok('데모 결과 요약 탭에 100점 카드 연결', demo.includes('renderDiscoverySummary(view)}${renderMetricStrip(view)}${renderPhase209CompletionScorecard(view)'));
ok('데모 결과 상품 탭에 100점 카드 연결', demo.includes('renderValueComparison(view)}${renderPhase209CompletionScorecard(view)}${renderPremiumUpgradePanel(view)'));
ok('데모 결과 4개 산출물 100점 표시', ['무료 데모', '상세 리포트', 'FixPack', 'Auto 정기 케어'].every(t => demo.includes(t)) && (demo.match(/'100점'/g) || []).length >= 4);
ok('데모 CSS 100점 카드 반응형', demoCss.includes('phase209-completion-scorecard') && demoCss.includes('phase209-score-grid'));

ok('플랜 페이지 100점 매트릭스', plans.includes('phase209-plan-score-matrix') && plans.includes('100점 산출물 기준'));
ok('플랜 페이지 상세 리포트 보강', plans.includes('전/후 비교 예시') && plans.includes('적용 난이도'));
ok('플랜 페이지 FixPack 보강', plans.includes('복사 가능한 전/후 문구'));
ok('플랜 페이지 Auto 20분 운영 기준 보강', plans.includes('20분 주기 게시판 자동 발행') && plans.includes('중복 방지와 최근 발행 시각'));

ok('CTA 자동발행 20분 기본값 유지', server.includes('CTA_AUTOPUBLISH_DEFAULT_INTERVAL_MS = 20 * 60_000'));
ok('CTA 자동발행 due 체크 유지', server.includes('createCtaPublicationIfDue') && server.includes('ctaAutopublishDueStatus'));
ok('CTA 자동발행 중복 락 유지', server.includes('cta-autopublish-20min'));
ok('CTA 글 마지막 문단 유도 유지', cta.includes('다음에 할 일') && cta.includes('무료 진단') && cta.includes('Auto 정기 케어'));

ok('PHASE209 작업지시서 존재', exists(workOrderPath));
if (exists(workOrderPath)) {
  const report = read(workOrderPath);
  ok('작업지시서 100점 분석 포함', report.includes('정밀 분석 결과') && report.includes('100점 수용 기준'));
  ok('작업지시서 작업 내역 10개 이상', (report.match(/^\d+\./gm) || []).length >= 10);
  ok('작업지시서 롤백 기준 포함', report.includes('롤백 기준') && report.includes('npm run phase209:final'));
  ok('작업지시서 운영 확인 필요 구분', report.includes('운영 배포 후 확인 필요'));
}

const pkg = JSON.parse(read('package.json'));
ok('package test:phase209 스크립트', Boolean(pkg.scripts?.['test:phase209']));
ok('package validate:phase209-product-100 스크립트', Boolean(pkg.scripts?.['validate:phase209-product-100']));
ok('package phase209:final 스크립트', Boolean(pkg.scripts?.['phase209:final']));

const failed = checks.filter(item => !item.pass);
const summary = {
  ok: failed.length === 0,
  phase: '209-product-output-100',
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
  checkedAt: new Date().toISOString()
};
fs.writeFileSync(path.join(root, 'PHASE209_PRODUCT_OUTPUT_100_VALIDATION_20260508.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ ok: summary.ok, passed: summary.passed, total: summary.total, failed: summary.failed }, null, 2));
process.exit(summary.ok ? 0 : 1);

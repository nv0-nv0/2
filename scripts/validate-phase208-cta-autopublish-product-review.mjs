import fs from 'node:fs';
import path from 'node:path';
import { buildCtaBoardArticle, chooseCtaVariant, auditHumanFriendlyCtaArticle } from '../server/core/cta-publication.mjs';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const checks = [];
function ok(name, condition, detail = '') {
  checks.push({ name, pass: Boolean(condition), detail });
  if (!condition) console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
}

const server = read('server/index.mjs');
ok('CTA 기본 발행 주기 20분 상수', server.includes('CTA_AUTOPUBLISH_DEFAULT_INTERVAL_MS = 20 * 60_000'));
ok('CTA 발행 주기 정규화 함수', server.includes('normalizeCtaAutopublishIntervalMs'));
ok('실제 due 상태 확인 함수', server.includes('ctaAutopublishDueStatus'));
ok('스캔 트리거도 due일 때만 발행', server.includes('createCtaPublicationIfDue'));
ok('최근 자동발행 기준으로 20분 간격 계산', server.includes('latestAutoCtaPublication'));
ok('중복 인스턴스 락 적용', server.includes("cta-autopublish-20min"));
ok('서버 시작 후 due 체크', server.includes("startup_due_check"));
ok('DB 설정값 20분 동기화', server.includes('ctaAutopublishIntervalMs'));

for (const rel of ['server/routes/public.mjs','server/routes/account.mjs','server/routes/payment.mjs']) {
  const text = read(rel);
  ok(`${rel} createCtaPublicationIfDue 주입`, text.includes('createCtaPublicationIfDue'));
  ok(`${rel} direct scan CTA 발행 제거`, !text.includes('createCtaPublication(db, result, { autoPublished: true })'));
}

const cta = read('server/core/cta-publication.mjs');
for (const token of [
  'p208-20min-reader-interest-final-cta-v1',
  '지금 보이는 문제',
  '독자가 관심 있어 할 부분',
  '독자가 계속 읽는 구성',
  '다음에 할 일',
  '무료 진단',
  'FixPack',
  'Auto 정기 케어'
]) ok(`CTA 본문 개선 토큰: ${token}`, cta.includes(token));

const variant = chooseCtaVariant({ publications: [], boards: [] }, { seed: 'phase208-validation' });
const article = buildCtaBoardArticle({ target: 'https://nv0.kr', industry: '온라인 서비스', riskScore: 72, totalFindings: 4, topFindings: ['환불 안내', '개인정보 안내', '문의 경로'] }, variant, { seed: 'phase208-validation' });
const audit = auditHumanFriendlyCtaArticle(article);
ok('샘플 CTA 본문 3600자 이상', String(article.body || '').length >= 3600, `length=${String(article.body || '').length}`);
ok('샘플 CTA 본문 감사 통과', audit.ok, JSON.stringify(audit));
ok('샘플 CTA 마지막 문단에 무료 진단 유도', /다음에 할 일[\s\S]*무료 진단[\s\S]*(상세 리포트|FixPack|Auto 정기 케어)/.test(article.body));

const boardApp = read('apps/public/board/app.js');
ok('보드 클라이언트 fallback JS 유효 구조', boardApp.includes('function buildFallbackBody') && boardApp.includes('const FALLBACK_POSTS'));
ok('보드 fallback 글 5개', (boardApp.match(/id: 'fallback-/g) || []).length >= 5);
ok('보드 fallback 새 섹션 반영', ['지금 보이는 문제', '독자가 관심 있어 할 부분', '독자가 계속 읽는 구성', '다음에 할 일'].every(t => boardApp.includes(t)));

const demoApp = read('apps/public/veridion-demo/app.js');
ok('데모 결과에 무료/결제 산출물 비교 추가', demoApp.includes('result-upgrade-compare') && demoApp.includes('무료 결과') && demoApp.includes('결제 산출물'));
const serviceHtml = read('apps/public/service/index.html');
ok('서비스 페이지 산출물 배점 카드 추가', serviceHtml.includes('service-output-score') && serviceHtml.includes('무료 데모') && serviceHtml.includes('Auto 정기 케어'));
const reportPath = 'PHASE208_CTA_AUTOPUBLISH_PRODUCT_RESULT_REVIEW_20260508_KO.md';
ok('제품·서비스 결과물 배점 보고서 존재', exists(reportPath));
if (exists(reportPath)) {
  const report = read(reportPath);
  const itemCount = (report.match(/^\d+\./gm) || []).length;
  ok('개선 포인트 10개 이상', itemCount >= 10, `count=${itemCount}`);
  ok('보고서에 데모/서비스 배점 포함', report.includes('무료 데모') && report.includes('서비스 결과물'));
}

const envFiles = [
  '.env.coolify.example', '.env.example', 'docker-compose.yml',
  'deploy/coolify.env.bulk.txt', 'deploy/coolify.env.example',
  'deploy/docker-compose.coolify.yml', 'deploy/env.commercial.template',
  'deploy/env.production.nv0.kr.example', 'deploy/env.production.template',
  'scripts/generate-r2-coolify-env.mjs'
].filter(exists);
for (const rel of envFiles) {
  const text = read(rel);
  ok(`${rel} 20분 환경값 1200000`, text.includes('1200000'));
}

const failed = checks.filter(c => !c.pass);
const summary = { ok: failed.length === 0, phase: '208-cta-autopublish-product-review', total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks, checkedAt: new Date().toISOString() };
fs.writeFileSync(path.join(root, 'PHASE208_CTA_AUTOPUBLISH_PRODUCT_REVIEW_VALIDATION_20260508.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ ok: summary.ok, passed: summary.passed, total: summary.total, failed: summary.failed }, null, 2));
process.exit(summary.ok ? 0 : 1);

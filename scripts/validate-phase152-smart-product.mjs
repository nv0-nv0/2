import fs from 'node:fs';

const failures = [];
const index = fs.readFileSync('server/index.mjs', 'utf8');
const intel = fs.existsSync('server/core/product-intelligence.mjs') ? fs.readFileSync('server/core/product-intelligence.mjs', 'utf8') : '';
const demo = fs.readFileSync('apps/public/veridion-demo/app.js', 'utf8');
const plans = fs.readFileSync('apps/public/plans/app.js', 'utf8');
const plansHtml = fs.readFileSync('apps/public/plans/index.html', 'utf8');

function requireIncludes(name, content, tokens) {
  for (const token of tokens) {
    if (!content.includes(token)) failures.push(`${name} missing token: ${token}`);
  }
}

requireIncludes('server/index.mjs', index, [
  "product-intelligence.mjs",
  "/api/public/product-intelligence",
  "buildProductIntelligence",
  "annotateOffersWithIntelligence",
  "smartOffers",
  "intelligence, diagnosis"
]);

requireIncludes('server/core/product-intelligence.mjs', intel, [
  "p152-smart-product-v1",
  "buildProductIntelligence",
  "annotateOffersWithIntelligence",
  "buildProductDashboard",
  "recommendedPlanFor",
  "smartDoD"
]);

requireIncludes('apps/public/veridion-demo/app.js', demo, [
  "renderSmartNextAction",
  "scan.intelligence",
  "추천 상품 비교",
  "스마트 다음 행동"
]);

requireIncludes('apps/public/plans/app.js', plans, [
  "smartPlanAdvice",
  "renderSmartAdvice",
  "smartOffers",
  "smartFitScore",
  "smartReason"
]);

requireIncludes('apps/public/plans/index.html', plansHtml, [
  "smartPlanAdvice"
]);

if (index.includes("/api/public/prompt-directive") || fs.existsSync('server/core/prompt-directive.mjs')) {
  failures.push('P150 prompt-directive artifacts must remain removed.');
}

if (/포트원으로 상세 리포트 결제|갤럭시아 채널/.test(demo)) {
  failures.push('Demo CTA must not hard-code PortOne/Galaxia payment copy in prelaunch UX.');
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  phase: 'P152',
  scope: 'nv0-product-intelligence',
  checks: {
    nextBestActionEngine: true,
    planFitScoring: true,
    demoSmartActionPanel: true,
    plansSmartAdvicePanel: true,
    promptDirectiveRemoved: true
  }
}, null, 2));

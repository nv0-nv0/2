import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));
const arg = process.argv[2];
const failures = [];
const check = (name, fn) => {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.error(`not ok - ${name} - ${error.message}`);
  }
};

function hexToRgb(hex) {
  const clean = hex.trim().replace('#', '');
  const norm = clean.length === 3 ? clean.split('').map((x) => x + x).join('') : clean;
  return [0, 2, 4].map((i) => parseInt(norm.slice(i, i + 2), 16) / 255);
}
function linearize(value) {
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}
function contrast(a, b) {
  const lum = (rgb) => 0.2126 * linearize(rgb[0]) + 0.7152 * linearize(rgb[1]) + 0.0722 * linearize(rgb[2]);
  const [l1, l2] = [lum(hexToRgb(a)), lum(hexToRgb(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const checks = {
  'phase352-inventory'() {
    const inv = readJson('docs/current/PHASE352_BASELINE_INVENTORY.json');
    const ui = readJson('docs/current/PHASE352_UI_ELEMENT_INVENTORY.json');
    assert.equal(inv.counts.totalFiles, 499);
    assert.equal(inv.counts.subdirectories, 65);
    assert.equal(ui.totals.forms, 10);
  },
  'unique-remediation-matrix'() {
    const matrix = read('docs/PHASE352_UNIQUE_REMEDIATION_MATRIX.md');
    const ids = [...matrix.matchAll(/\|\s(P352-\d+)\s\|/g)].map((m) => m[1]);
    assert.ok(ids.length >= 7, 'expected seeded remediation rows');
    assert.equal(new Set(ids).size, ids.length, 'duplicate remediation IDs found');
  },
  'diagnosis-single-canonical'() {
    const home = read('apps/public/home/index.html');
    const homeJs = read('apps/public/home/app.js');
    const demo = read('apps/public/demo/index.html');
    assert.doesNotMatch(home, /id="unifiedDiagnosisForm"|id="scanBtn"|id="targetUrl"/);
    assert.match(home, /href="\/products\/veridion\/demo"/);
    assert.doesNotMatch(homeJs, /demo\/app\.js/);
    assert.match(demo, /id="unifiedDiagnosisForm"/);
  },
  'product-catalog-ssot'() {
    const plans = read('apps/public/plans/index.html');
    const plansJs = read('apps/public/plans/app.js');
    const demoJs = read('apps/public/demo/app.js');
    assert.match(plansJs, /shared\/product-catalog\.mjs/);
    assert.match(demoJs, /shared\/product-catalog\.mjs/);
    assert.match(plans, /data-plan-code="Expert"/);
    assert.doesNotMatch(plans, /₩149,000\/건|전문가 검토 요청/);
  },
  'global-nav-contract'() {
    const publicFiles = fs.readdirSync(path.join(root, 'apps/public')).flatMap((entry) => {
      const file = path.join(root, 'apps/public', entry, 'index.html');
      return fs.existsSync(file) ? [file] : [];
    });
    for (const file of publicFiles) {
      const html = fs.readFileSync(file, 'utf8');
      if (!html.includes('data-public-nav="true"')) continue;
      assert.match(html, /서비스/);
      assert.match(html, /솔루션/);
      assert.match(html, /요금/);
      assert.match(html, /진단/);
      assert.match(html, /인사이트/);
      assert.match(html, /고객 포털/);
    }
  },
  'contextual-cta-contract'() {
    const portal = read('apps/public/portal/index.html');
    ['새 사이트 진단', '다시 진단', '진단 리포트 보기', '저장 사이트 관리', '결과 저장하고 이어보기'].forEach((token) => assert.match(portal, new RegExp(token)));
    assert.doesNotMatch(portal, /<h3>사이트 무료 진단 실행<\/h3>/);
  },
  'legacy-token-global'() {
    const audit = readJson('docs/current/PHASE352_LEGACY_TOKEN_AUDIT.json');
    const activeHits = audit.tokens.filter((item) => !/^docs\//.test(item.file));
    assert.ok(activeHits.some((item) => item.token === 'free_diagnosis_start'), 'expected legacy audit to detect generator leftovers');
    const runtimeText = ['apps/public/home/index.html', 'apps/public/plans/index.html', 'apps/public/portal/index.html'].map(read).join('\n');
    assert.doesNotMatch(runtimeText, /무료 진단 시작|₩149,000\/건|전문가 리포트/);
  },
  'calculated-contrast'() {
    const css = read('shared/veridion-rebrand.css');
    assert.match(css, /--vr-button-bg:#075e54/);
    assert.ok(contrast('#075e54', '#ffffff') >= 4.5, 'primary button contrast must be >= 4.5');
    assert.ok(contrast('#0b1220', '#ffffff') >= 4.5, 'secondary button contrast must be >= 4.5');
    assert.ok(contrast('#10a884', '#ffffff') >= 3, 'focus ring contrast must be >= 3');
  },
  'route-alias-contract'() {
    const server = read('server/index.mjs');
    ['/demo', '/pricing', '/contact', '/faq', '/about', '/privacy-policy', '/terms-of-use', '/cancel', '/return', '/exchange'].forEach((token) => {
      assert.match(server, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    });
    assert.match(server, /canonicalRouteRedirect/);
  },
  'insight-fallback'() {
    const board = read('apps/public/board/index.html');
    assert.match(board, /<article class="vr-board-card"/);
    assert.match(board, /사이트 무료 진단 실행/);
  },
  'sample-label-contract'() {
    const demo = read('apps/public/demo/index.html');
    const portal = read('apps/public/portal/index.html');
    ['샘플 결과', '샘플 사이트'].forEach((token) => {
      assert.match(demo + '\n' + portal, new RegExp(token));
    });
  },
  'live-build-fingerprint'() {
    const publicRoutes = read('server/routes/public.mjs');
    const server = read('server/index.mjs');
    assert.match(publicRoutes, /buildFingerprint/);
    assert.match(server, /BUILD_FINGERPRINT/);
    assert.match(server, /payload\.buildFingerprint/);
  },
  'live-package-diff'() {
    const diff = readJson('docs/current/PHASE352_LIVE_PACKAGE_DIFF.json');
    assert.equal(diff.liveProbe.status, 'not_run');
    assert.ok(diff.packageFingerprint.version);
  }
};

if (!checks[arg]) {
  console.error(`Unknown phase352 check: ${arg}`);
  process.exit(2);
}

checks[arg]();
if (failures.length) {
  process.exit(1);
}

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const failures = [];
function expect(condition, message) { if (!condition) failures.push(message); }

const portalHtml = read('apps/public/portal/index.html');
const boardHtml = read('apps/public/board/index.html');
const portalJs = read('apps/public/portal/app.js');
const boardJs = read('apps/public/board/app.js');
const suite = read('server/core/product-agent-suite.mjs');
const polishCss = exists('shared/phase307-professional-polish.css') ? read('shared/phase307-professional-polish.css') : '';

const badPortalGlyphs = /[�□■◆◇●▲▼※★☆♣♥♠♬✓✔✕✖↔⇒⇐⇔⌕▱↻▤▥♢⚖⚙☑⋮🛡█░›↗]/u;
const staleDate = /2025\.[0-9]{2}\.[0-9]{2}|2025-[0-9]{2}-[0-9]{2}/;

expect(exists('shared/phase307-professional-polish.css'), 'phase307 professional polish css is missing');
expect(portalHtml.includes('/shared/phase307-professional-polish.css'), 'portal must load phase307 polish css');
expect(boardHtml.includes('/shared/phase307-professional-polish.css'), 'board must load phase307 polish css');
expect(portalHtml.includes('phase307-premium-polish'), 'portal body must use phase307 premium polish class');
expect(boardHtml.includes('phase307-premium-polish'), 'board body must use phase307 premium polish class');
expect(!badPortalGlyphs.test(portalHtml), 'portal html still contains decorative or broken glyphs');
expect(!staleDate.test(portalHtml), 'portal html must not expose stale 2025 dates');
expect(portalHtml.includes('20분에 1회 발행'), 'portal must expose 20-minute publication cadence');
expect(boardHtml.includes('연결이 지연되면 기본 인사이트를 먼저 표시합니다'), 'board must include stable fallback loading copy');
expect(boardJs.includes('검수된 기본 인사이트'), 'board fallback copy must be quality-gated');
expect(portalJs.includes('20분 주기, 중복 차단, 깨진 문자 차단'), 'portal publish status must mention quality gates');
expect(suite.includes('const DEFAULT_INTERVAL_MS = 20 * 60 * 1000'), 'server agent suite must keep 20-minute interval');
expect(suite.includes('DISALLOWED_PUBLIC_SYMBOLS'), 'server agent suite must include special-character guard');
expect(polishCss.includes('--phase307-blue') && polishCss.includes('.portal-site-table'), 'polish css must include premium tokens and portal table hardening');

const result = {
  ok: failures.length === 0,
  checked: 'phase307-professional-polish',
  score: failures.length === 0 ? 100 : Math.max(0, 100 - failures.length * 8),
  failures,
  summary: {
    portalGlyphSafe: !badPortalGlyphs.test(portalHtml),
    staleDateFree: !staleDate.test(portalHtml),
    cadence20Min: portalHtml.includes('20분에 1회 발행'),
    boardFallbackStable: boardJs.includes('검수된 기본 인사이트')
  }
};

if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));

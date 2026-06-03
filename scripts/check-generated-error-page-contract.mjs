import assert from 'node:assert/strict';
import fs from 'node:fs';
const server = fs.readFileSync('server/index.mjs', 'utf8');
const required = [
  '<meta name="theme-color" content="#ffffff">',
  '<meta name="color-scheme" content="light">',
  '<meta name="format-detection" content="telephone=no">',
  '<meta name="referrer" content="strict-origin-when-cross-origin">',
  '<a class="skip-link" href="#main">본문 바로가기</a>',
  '<main id="main" tabindex="-1" class="vr-error-page">',
  '요청 ID:',
  '무료 진단으로 이동',
  '홈으로 이동',
];
const missing = required.filter((token) => !server.includes(token));
assert.deepEqual(missing, [], JSON.stringify({ missing }, null, 2));
console.log(JSON.stringify({ ok: true, contract: 'generated-error-page-v1', checked: required.length, missing }, null, 2));

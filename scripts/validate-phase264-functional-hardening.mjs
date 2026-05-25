
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (rel) => fs.readFile(path.join(ROOT, rel), 'utf8');
const errors = [];
const home = await read('apps/public/home/index.html');
const demo = await read('apps/public/veridion-demo/index.html');
const service = await read('apps/public/service/index.html');
const board = await read('apps/public/board/index.html');
const auth = await read('apps/public/auth/index.html');
const authJs = await read('apps/public/auth/app.js');
if (!home.includes('href="/products/veridion/demo"') || !home.includes('무료 진단 시작')) errors.push('home free diagnosis CTA is not a working link');
if ((demo.match(/id="targetUrl"/g) || []).length !== 1) errors.push('demo must contain exactly one functional targetUrl input');
if (/readonly|value="nv0\.kr"|value="https?:\/\//i.test(demo)) errors.push('demo target input still has fixed/readonly value');
if ((demo.match(/id="scanBtn"/g) || []).length !== 1 || !demo.includes('id="demoResult"')) errors.push('demo functional scan controls missing');
if (/GDPR|CCPA|EU|유럽|해외 법령 자동 대응 제품입니다/.test(service)) errors.push('service page still contains foreign-compliance positioning');
if (!service.includes('국내 온라인 사업자 전용')) errors.push('service page missing domestic-only positioning');
if (!board.includes('id="boardList"') || !board.includes('id="boardSearch"') || !board.includes('id="boardPagination"')) errors.push('board functional API anchors missing');
if ((auth.match(/<article class="phase264-auth-card"/g) || []).length !== 4) errors.push('auth page must be four compact cards');
if (/id="(?:loginEmail|registerEmail|resetEmail|resetConfirmEmail)"[^>]*value=/.test(auth)) errors.push('auth email inputs must not include default value attributes');
if (/searchParams\.get\(['"]email['"]\)|data\.customer\.email|customer\.email/.test(authJs)) errors.push('auth app exposes or pre-fills email identity');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(JSON.stringify({ ok:true, phase:'264', checks:['home-cta','single-demo-form','domestic-service','board-api-anchors','compact-auth-grid','no-email-prefill']}, null, 2));

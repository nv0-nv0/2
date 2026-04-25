import { readFile } from 'node:fs/promises';

const fail = (message) => { console.error('FAIL:', message); process.exitCode = 1; };
const ok = (message) => console.log('OK:', message);

const server = await readFile('server/index.mjs', 'utf8');
const checkout = await readFile('apps/public/checkout/index.html', 'utf8');
const privacy = await readFile('apps/public/privacy/index.html', 'utf8');
const refund = await readFile('apps/public/refund/index.html', 'utf8');

const requiredServerMarkers = [
  'RELEASE_PHASE',
  '/api/public/release-readiness',
  '/api/admin/release-readiness',
  '/api/public/refund-request',
  '/api/public/payment/retry',
  '/api/public/account/marketing-consent',
  'maskSensitive(meta)',
  'minimum_required_only'
];
for (const marker of requiredServerMarkers) server.includes(marker) ? ok(`server marker ${marker}`) : fail(`missing server marker ${marker}`);

const forbiddenPersonalFields = ['registerName', 'registerCompany', 'buyerName', 'buyerPhone', 'buyerAddress'];
for (const marker of forbiddenPersonalFields) {
  if (server.includes(marker) || checkout.includes(marker)) fail(`unnecessary personal field remains: ${marker}`);
  else ok(`no unnecessary personal field ${marker}`);
}

for (const marker of ['이름, 전화번호, 주소는 수집하지 않습니다', '개인정보 처리방침', '최소수집']) {
  (checkout + privacy).includes(marker) ? ok(`privacy copy ${marker}`) : fail(`missing privacy copy ${marker}`);
}
for (const marker of ['환불', '디지털 산출물', '청약철회']) {
  refund.includes(marker) ? ok(`refund copy ${marker}`) : fail(`missing refund copy ${marker}`);
}

if (process.exitCode) process.exit(process.exitCode);

process.exit(process.exitCode || 0);

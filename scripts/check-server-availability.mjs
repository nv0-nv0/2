import http from 'node:http';
import https from 'node:https';

const baseUrl = process.argv[2] || process.env.NV0_PUBLIC_BASE_URL || `http://${process.env.HOST || '127.0.0.1'}:${process.env.PORT || '3210'}`;
const paths = [
  '/api/public/server-availability',
  '/api/public/commercial-readiness',
  '/portal',
  '/readyz'
];

function request(url) {
  const client = url.startsWith('https:') ? https : http;
  return new Promise((resolve) => {
    const req = client.get(url, { timeout: 3000 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk.slice(0, 1000); });
      res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 500, status: res.statusCode, body: body.slice(0, 500) }));
    });
    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });
    req.on('error', (error) => resolve({ ok: false, status: 0, error: error.message }));
  });
}

const results = [];
for (const p of paths) {
  const url = new URL(p, baseUrl).toString();
  const result = await request(url);
  results.push({ path: p, url, ...result });
}

const serverAvailable = results.some((item) => item.ok && item.status > 0);
const payload = {
  ok: serverAvailable,
  baseUrl,
  checkedAt: new Date().toISOString(),
  results,
  nextActions: serverAvailable
    ? ['브라우저에서 /portal 접속', '상용 준비 상태는 /api/public/commercial-readiness 확인']
    : [
        'npm run start:local 실행',
        '포트 3210 사용 중이면 PORT=다른번호 npm run start:local',
        '방화벽/프록시/호스트 설정 확인',
        '로그에 EADDRINUSE, EACCES, env validation 오류가 있는지 확인'
      ]
};

console.log(JSON.stringify(payload, null, 2));
if (!serverAvailable) process.exit(1);

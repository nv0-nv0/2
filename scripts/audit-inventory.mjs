import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const serverText = await fs.readFile(path.join(ROOT, 'server', 'index.mjs'), 'utf8');
const routeMatches = [...serverText.matchAll(/pathname === '([^']+)'/g)].map(m => m[1]);
const uniqueRoutes = [...new Set(routeMatches)].sort();

async function countDirs(dir) {
  const entries = await fs.readdir(path.join(ROOT, dir), { withFileTypes: true });
  return entries.filter(entry => entry.isDirectory()).length;
}
async function countFiles(dir) {
  const entries = await fs.readdir(path.join(ROOT, dir), { withFileTypes: true });
  return entries.filter(entry => entry.isFile()).length;
}

const counts = {
  publicPages: await countDirs('apps/public'),
  adminPages: await countDirs('apps/admin'),
  uniqueApiRoutes: uniqueRoutes.length,
  sharedModules: await countFiles('shared'),
  scripts: await countFiles('scripts'),
  deployFiles: await countFiles('deploy'),
  docs: await countFiles('docs'),
  tests: await countFiles('tests'),
};
counts.totalTrackedFiles = counts.sharedModules + counts.scripts + counts.deployFiles + counts.docs + counts.tests + 1 + counts.publicPages * 3 + counts.adminPages * 3;

const remainingWork = [
  ['Contabo VPS 생성 및 SSH 보안 초기화', '동작 확인 필요', '실서버 미생성'],
  ['Coolify 설치 및 관리자 계정 초기화', '동작 확인 필요', '실서버 필요'],
  ['DNS 레코드 및 Cloudflare 프록시 연결', '동작 확인 필요', '실도메인 필요'],
  ['Cloudflare Origin CA 설치 및 Full (strict) 검증', '동작 확인 필요', '실서버 필요'],
  ['Cloudflare Cache Rules 적용', '동작 확인 필요', '실도메인 필요'],
  ['Cloudflare Bot Fight Mode / Turnstile 실키 연결', '동작 확인 필요', '실키 필요'],
  ['Coolify 앱 생성 및 빌드/배포', '동작 확인 필요', '실서버 필요'],
  ['운영 환경변수 최종 주입', '동작 확인 필요', '실서버 필요'],
  ['프로덕션 PostgreSQL 연결', '검증 미완료', '현재는 runtime JSON 저장, 컷오버 문서만 제공'],
  ['실결제 공급자 실연동', '동작 확인 필요', 'external_http 어댑터와 모의 공급자 검증 완료, 실사업자 키 필요'],
  ['실스캔 엔진 실연동', '동작 확인 필요', 'external_http 어댑터와 모의 엔진 검증 완료, 실엔진 스펙/키 필요'],
  ['Cloudflare Rate Limit 실룰 적용', '동작 확인 필요', '실도메인 필요'],
  ['배포 후 healthz/readyz 실검증', '동작 확인 필요', '실배포 필요'],
  ['배포 후 공개/관리 E2E 실도메인 검증', '동작 확인 필요', '실배포 필요'],
  ['백업 스케줄러 크론/잡 등록', '동작 확인 필요', '실서버 필요'],
  ['운영 전환 및 컷오버', '동작 확인 필요', '실서비스 시점 필요'],
  ['컷오버 후 24시간 모니터링', '검증 미완료', '운영 전환 이후 가능']
];

const statusSummary = remainingWork.reduce((acc, row) => { acc[row[1]] = (acc[row[1]] || 0) + 1; return acc; }, {});
const report = {
  generatedAt: new Date().toISOString(),
  counts,
  uniqueRoutes,
  remainingWork,
  statusSummary,
};

const outDir = path.join(ROOT, 'docs');
await fs.writeFile(path.join(outDir, 'REMAINING_WORK_INVENTORY_20260423.json'), JSON.stringify(report, null, 2));

const lines = [];
lines.push('# 남은 단계·영역·요소 인벤토리 (2026-04-23)');
lines.push('');
lines.push('## 1. 현재 실제 구현 요소 수');
lines.push('');
lines.push(`- Public 페이지: **${counts.publicPages}**`);
lines.push(`- Admin 페이지: **${counts.adminPages}**`);
lines.push(`- 고유 API/헬스체크 라우트: **${counts.uniqueApiRoutes}**`);
lines.push(`- Shared 모듈: **${counts.sharedModules}**`);
lines.push(`- 운영 스크립트: **${counts.scripts}**`);
lines.push(`- 배포 파일: **${counts.deployFiles}**`);
lines.push(`- 문서: **${counts.docs}**`);
lines.push(`- 테스트 파일: **${counts.tests}**`);
lines.push(`- 추적 대상 총 파일 환산치: **${counts.totalTrackedFiles}**`);
lines.push('');
lines.push('## 2. 구현 영역');
lines.push('');
lines.push('| 영역 | 수량 | 상태 |');
lines.push('|---|---:|---|');
lines.push(`| Public App 페이지 | ${counts.publicPages} | 실제 확인 완료 |`);
lines.push(`| Admin App 페이지 | ${counts.adminPages} | 실제 확인 완료 |`);
lines.push(`| API/헬스체크 라우트 | ${counts.uniqueApiRoutes} | 실제 확인 완료 |`);
lines.push(`| 운영 스크립트 | ${counts.scripts} | 실제 확인 완료 |`);
lines.push(`| 배포 파일 | ${counts.deployFiles} | 실제 확인 완료 |`);
lines.push(`| 테스트 파일 | ${counts.tests} | 실제 확인 완료 |`);
lines.push('');
lines.push('## 3. 남은 단계 수');
lines.push('');
lines.push(`- 총 남은 단계: **${remainingWork.length}**`);
for (const [status, count] of Object.entries(statusSummary)) {
  lines.push(`- ${status}: **${count}**`);
}
lines.push('');
lines.push('## 4. 남은 단계 상세');
lines.push('');
lines.push('| 번호 | 작업 | 상태 | 근거 |');
lines.push('|---:|---|---|---|');
remainingWork.forEach((row, idx) => lines.push(`| ${idx + 1} | ${row[0]} | ${row[1]} | ${row[2]} |`));
lines.push('');
lines.push('## 5. 현재 고유 라우트 목록');
lines.push('');
uniqueRoutes.forEach(route => lines.push(`- \`${route}\``));
await fs.writeFile(path.join(outDir, 'REMAINING_WORK_INVENTORY_20260423_KO.md'), lines.join('\n'));
console.log(JSON.stringify(report, null, 2));

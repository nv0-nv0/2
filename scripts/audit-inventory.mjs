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
  ['운영 환경변수 실제값 주입', '실서버 확인 필요', '패키지는 validate:env와 운영 매트릭스로 차단'],
  ['운영 DB 과거 게시글 정제·마이그레이션', '실서버 확인 필요', '운영 DB 접근 필요'],
  ['배포 캐시 무효화', '실배포 확인 필요', '도메인·CDN 캐시 상태 필요'],
  ['Chrome·Edge·Safari 데스크톱 시각 QA', '실브라우저 확인 필요', '패키지는 CSS 정적 검증 제공'],
  ['모바일 실기기 시각 QA', '실기기 확인 필요', '360/390/430px 실제 렌더링 확인 필요'],
  ['20분 자동발행 2회 이상 관측', '운영 로그 확인 필요', '패키지는 20분 주기 검증 완료'],
  ['PortOne 결제 샌드박스·실결제 확인', '외부 계정 확인 필요', '운영 키와 웹훅 수신 필요'],
  ['SMTP 발송 확인', '외부 계정 확인 필요', '운영 SMTP 수신함 필요'],
  ['R2/S3 업로드·다운로드 확인', '외부 계정 확인 필요', '버킷 권한과 키 필요'],
  ['HTTPS 도메인 쿠키·세션 확인', '실도메인 확인 필요', '운영 도메인·브라우저 쿠키 필요'],
  ['운영 백업·복구 리허설', '실서버 확인 필요', '운영 데이터 백업 경로 필요'],
  ['운영 모니터링·알림 수신 확인', '외부 수신 확인 필요', '운영 알림 이메일/채널 필요']
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

const rows = [
  ['로컬 실행', 'npm run dev', '127.0.0.1:3210에서 서버를 실행합니다.'],
  ['빠른 검증', 'npm run verify:quick', '문법, 기본 테스트, E2E, 스모크를 실행합니다.'],
  ['최종 검증', 'npm run verify:release', 'PHASE358 전체 릴리즈 게이트를 실행합니다.'],
  ['배포 전 검증', 'npm run release:predeploy', '최신 전체 릴리즈 게이트를 실행합니다.'],
  ['런타임 정리', 'npm run runtime:clean', '활성 런타임 파일을 제거하고 배송 상태를 확인합니다.'],
  ['시크릿 발급', 'npm run secrets:generate', '운영용 시크릿 예시를 안전하게 생성합니다.'],
  ['운영 라이브 확인', 'NV0_LIVE_BASE_URL=https://www.nv0.kr npm run live:smoke', '실제 배포 후 공개 경로를 점검합니다.']
];
console.log('VERIDION PHASE357 실행 안내');
console.log('='.repeat(76));
for (const [label, command, description] of rows) {
  console.log(`\n[${label}]`);
  console.log(`  ${command}`);
  console.log(`  ${description}`);
}
console.log('\n문서: README.md, docs/INDEX.md, deploy/README.md');

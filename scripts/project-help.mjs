console.log(`VERIDION 2.7 상용 하드닝 최대화 기준선

핵심 명령:
  npm start                 로컬 서버 실행
  npm run verify:quick      빠른 로컬 검증
  npm run verify:release    전체 릴리즈 게이트 실행
  npm run deploy:precheck   배포 템플릿과 운영자 경로 점검
  npm run secrets:generate  상용 비밀값 후보 생성
  npm run generate:r2-env   Coolify·R2 상용 환경변수 예시 생성
  npm run release:create -- --name veridion-release.zip
                            안전한 배송 ZIP 생성
  npm run clean:runtime && npm run check:runtime-clean
                            활성 로컬 런타임 정리 및 확인

문서:
  docs/DEPLOYMENT.md
  docs/OPERATIONS.md
  docs/QA.md
  docs/ROLLBACK.md`);

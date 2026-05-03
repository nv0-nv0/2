PHASE180 납품 패치 요약

1. 고객지원/사업자정보/푸터 정합성 보강
2. 게시판 KPI와 최근 활동을 실제 API 응답 기반으로 전환
3. Docker rootless USER nv0 실행 적용
4. PostgreSQL snapshot 저장 batch transaction 적용
5. 운영 자산 캐시 env 상한 불일치 수정
6. 146개 강화 항목 문서와 validate:phase180 게이트 추가

검증 명령:
- npm run check:syntax
- npm run test:all
- npm run test:e2e
- npm run test:routes
- npm run check:links -- --summary
- npm run smoke
- npm run validate:phase180
- npm run phase180:final

제한:
실서버 DNS, 실제 결제 승인, 실제 SMTP/R2/PostgreSQL 운영 부하는 로컬 패키지만으로 확인되지 않습니다.

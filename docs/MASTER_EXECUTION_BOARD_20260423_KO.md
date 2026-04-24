# MASTER EXECUTION BOARD (2026-04-23)

## 1. 현재 고정 수치
- 구현 영역: **6개**
- Public 페이지: **6개**
- Admin 페이지: **7개**
- 고유 API/헬스체크 라우트: **20개**
- Shared 모듈: **3개**
- 운영 스크립트: **5개**
- 배포 파일: **4개**
- 문서: 실행 시점 기준 inventory 재생성값 참조
- 테스트 파일: **1개**
- 현재 남은 단계: **20개**

## 2. 우선순위 묶음

### P0. 실배포 진입 전 필수
1. Contabo VPS 생성 및 SSH 보안 초기화
2. Coolify 설치 및 관리자 계정 초기화
3. DNS 레코드 및 Cloudflare 프록시 연결
4. Cloudflare Origin CA 설치 및 Full (strict) 검증
5. Coolify 앱 생성 및 빌드/배포
6. 운영 환경변수 최종 주입
7. 배포 후 healthz/readyz 실검증
8. 배포 후 공개/관리 E2E 실도메인 검증

### P1. 운영 안정화 필수
9. Cloudflare Cache Rules 적용
10. Cloudflare Bot Fight Mode / Turnstile 실키 연결
11. Cloudflare Rate Limit 실룰 적용
12. 백업 스케줄러 크론/잡 등록
13. 복구 리허설 1회 수행
14. 로그 보존/정리 정책 운영 적용

### P2. 기능 고도화 / 외부 연동
15. 프로덕션 PostgreSQL 연결
16. 파일 업로드 영속 스토리지 검증
17. 실결제 연동
18. 실스캔 엔진 연동

### P3. 운영 전환
19. 운영 전환 및 컷오버
20. 컷오버 후 24시간 모니터링

## 3. 지금 패키지에서 즉시 실행 가능한 명령
```bash
npm run audit:inventory
npm run preflight
npm run smoke
npm run test:e2e
npm run backup:runtime
npm run restore:latest
```

## 4. 현재 판정
- 로컬 클린룸 앱: **실제 확인 완료**
- 운영 보조 스크립트: **실제 확인 완료**
- Cloudflare/Coolify/Contabo 문서화: **실제 확인 완료**
- 실배포: **동작 확인 필요**
- 실외부 연동: **확인되지 않음**

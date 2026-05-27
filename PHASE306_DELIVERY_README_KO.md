# PHASE306 납품 안내

이번 패키지는 인사이트 페이지, 20분 자동발행, 내 사이트 페이지 깨진 도형/겹침 문제를 기준으로 재점검한 납품본입니다.

## 핵심 수정

- 인사이트 게시판 빈 화면/로딩 고착 방지용 정적·동적 폴백 게시글 적용
- 서버 자동발행 문구와 품질 게이트를 `20분에 1회 발행` 기준으로 통일
- 내 사이트 페이지 특수기호/깨진 도형 가능 요소 제거
- 내 사이트 상단 메뉴, 1440px/12컬럼 카드 배치, 모바일 재배열 보강
- 오래된 정적 날짜 샘플 제거
- 공개 페이지 링크/라우트/문법/검증 스크립트 전체 통과

## 주요 보고서

- `docs/PHASE306_INSIGHT_PORTAL_REBUILD_WORK_ORDER.md`
- `docs/PHASE306_INSIGHT_PORTAL_REBUILD_REPORT.md`
- `docs/current/PHASE306_INSIGHT_PORTAL_REBUILD_AUDIT.json`

## 검증 명령

아래 검증은 모두 통과했습니다.

```bash
npm run check:syntax
npm test
npm run check:pages
npm run test:routes
npm run check:links
npm run validate:phase289
npm run validate:phase290
npm run validate:phase291
npm run validate:phase295
npm run validate:phase298
```

## 배포 주의

이 ZIP은 코드 수정 완료 패키지입니다. 실제 `nv0.kr` 운영 서버에는 직접 배포하지 않았으므로, 서버에 업로드 후 기존 배포 절차로 반영해야 합니다.

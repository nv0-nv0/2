# PHASE250 테스트 리뷰

## 정적 검증
- `npm run check:syntax`: OK — 313개 소스 검사
- `npm run check:pages`: OK — 34개 라우트 매핑 검사
- `npm run check:links -- --summary`: OK — 432개 링크 검사, 오류 0
- `npm run test:routes`: OK — 24개 핵심 라우트 검사
- `npm run validate:phase250`: OK — 17개 공개 페이지, 5개 메뉴 라벨, 16개 금지 토큰, 게시판 60/20/20 비율 검사

## 런타임 검증
대상:
- `/`
- `/service`
- `/guides`
- `/board`
- `/plans`
- `/products/veridion/demo`
- `/checkout`
- `/solutions`

결과:
- 상단 메뉴 5개 라벨 노출 OK
- 금지 문구 미노출 OK
- `/api/public/plans`: Free / Report / Expert, 0 / 29,000 / 89,000 OK
- `/api/public/board?pageSize=20`: 10개 글, 일반 6 / CTA 2 / 기타 2 OK
- `POST /api/public/diagnose`: 200 OK, result/detailFindings/demoIssueOverview 생성 OK

## 금지 문구 검사 목록
- 전문가 칼럼
- CTA 게시판
- 자동발행
- 자동 발행 200
- Customer View
- Editorial Board
- Trust Flow
- 39,000원
- FixPack
- TemplatePack
- Auto 정기
- contentFingerprint
- combinationMode
- publicDisplayVersion
- undefined
- NaN

## 판정
PHASE250 패키지는 납품 가능 상태입니다.

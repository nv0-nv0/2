# PHASE253 게시판 SEO 확장 보고서

## 적용 기준
- 게시판 글 100% CTA 목적 유지
- 각 글 내부 구성 60% 흥미·문제 인식 / 20% CTA 설득 / 20% 체크리스트·FAQ·보조 정보 유지
- 검색 로봇이 문서를 더 잘 해석하도록 글 단위 SEO 요소 보강

## 반영 항목
- 게시글별 고유 `title`
- 게시글별 `metaTitle`, `metaDescription`
- 게시글별 `canonicalPath`
- 게시글별 `searchIntent`
- H2/H3 구조에 해당하는 본문 소제목 5개
- FAQ 2개 이상
- 체크리스트 4개 이상
- 내부 링크 3개 이상
- 게시글당 해시태그 10개
- 게시글별 Article JSON-LD 구조화 데이터
- 게시판 CollectionPage JSON-LD
- Open Graph title/description
- 본문 분량 소폭 확장

## 검증 결과
- `npm run phase253:final`: OK
- `npm run check:links -- --summary`: OK
- 생성 글 10개 모두 boardPurpose=cta
- 생성 글 10개 모두 해시태그 10개
- 생성 글 10개 모두 60/20/20 구조 유지

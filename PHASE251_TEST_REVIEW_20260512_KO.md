# PHASE251 테스트 리뷰

## 사용자 정정 사항
게시판에 올라가는 글은 100% CTA 목적 글이다. 단, 글 내부 구성만 다음 비율로 유지한다.

- 60%: 일반 독자가 흥미를 느낄 문제 제기·사례·상황 설명
- 20%: CTA 필요성·무료 진단·리포트 전환 설득
- 20%: 체크리스트·FAQ·보조 정보

## 수정 결과
- `public-column-engine-v2-ratio-60-20-20` 폐기
- `public-cta-column-engine-v3-purpose-100-mix-60-20-20` 적용
- 모든 게시글 `boardType=cta`, `boardPurpose=cta` 고정
- 게시글 본문 섹션을 3/1/1 구조로 구성
- 게시판 UI의 잘못된 `일반/CTA/기타 게시글 비율` 안내 제거
- API 필터를 게시글 유형이 아닌 관심 주제 필터로 변경

## 실행 테스트
- `npm run phase251:final` 통과
- `npm run check:links -- --summary` 통과
- 로컬 런타임 `/api/public/board?pageSize=20` 확인

## 런타임 확인 결과
- posts: 10
- boardType: cta only
- boardPurpose: cta only
- contentMix: 60/20/20
- engine: public-cta-column-engine-v3-purpose-100-mix-60-20-20

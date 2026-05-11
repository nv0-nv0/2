# Phase236 작업 지시서

## 목적
nv0.kr 공개 페이지의 시인성 붕괴를 해결한다. 기존 CSS 덧칠 방식은 중단하고, 충돌 CSS를 제거한 단일 UI 시스템으로 전환한다.

## 작업 원칙
- 공개 페이지는 단일 stylesheet만 로드한다.
- 어두운 배경 + 흰 글자 기반 규칙은 공개 페이지에서 제거한다.
- 흩어진 문장, 단계, 가격, CTA, 푸터는 카드형 구조로 정렬한다.
- 밝고 전문적인 SaaS 톤을 유지한다.
- 본문 대비는 최소 4.5:1 이상을 기준으로 검증한다.

## 적용 대상
17개 공개 HTML 페이지 전체.

## 검증 명령
```bash
npm run phase236:final
npm run test:all
npm run check:links -- --summary
```

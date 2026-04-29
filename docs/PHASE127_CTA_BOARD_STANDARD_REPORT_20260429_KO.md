# PHASE127 CTA 게시판 자동발행 기준 반영 보고서

## 목표
자동 발행되는 CTA 게시글을 한 줄 홍보 문구가 아니라 일반 포스팅 수준의 전환형 게시글로 고정한다.

## 반영 기준
- 제목 후보 3~5개 포함
- 도입, 문제 제기, 해결 과정, 신뢰 근거, FAQ, 자연스러운 CTA, 태그 포함
- 한국어 기준 900~1,500자
- 문의 또는 체험 신청 전환 목적
- 사용자 제공 사실과 서비스 내부 점검 결과만 사용
- 가격, 정책, 법률, 인증 여부는 임의 단정 금지
- 법률 자문 또는 결과 보장으로 오인될 표현 금지

## 변경 파일
- server/index.mjs
- apps/public/board/app.js
- apps/public/board/app.css
- apps/admin/publications/app.js
- apps/admin/publications/app.css
- runtime/data/db.json
- runtime/data/db.seed.json
- scripts/validate-phase127-cta-board-standard.mjs
- package.json

## 완료 기준
`npm run phase127:final` 통과 시 CTA 게시판 자동발행 기준 반영 완료로 본다.

# PHASE61 메인 시각 디자인·게시판 자동발행 개선 납품

## 반영 범위
- 메인 페이지를 짧은 카피, 강한 히어로, 위험도 시각 카드, 4단계 액션 카드 중심으로 재설계했습니다.
- “CTA게시판/CTA 자동발행” 표기를 사용자 화면 기준 “게시판/자동 발행”으로 정리했습니다.
- 게시판 자동 발행 기본 주기를 30분으로 변경했습니다.
- 자동 발행 콘텐츠를 단일 문구 반복이 아니라 6개 유형 순환 구조로 변경했습니다.

## 자동 발행 유형
1. 진단 요약형
2. 체크리스트형
3. 개선 사례형
4. 상품 비교형
5. 운영 알림형
6. 재진단 유도형

## 주요 수정 파일
- apps/public/home/index.html
- apps/public/home/app.css
- apps/public/board/index.html
- apps/public/board/app.js
- apps/admin/publications/index.html
- apps/admin/settings/index.html
- server/index.mjs
- .env.example
- .env.coolify.example

## 운영 설정
기본값: `NV0_CTA_AUTOPUBLISH_INTERVAL_MS=1800000`

30분마다 서버가 최신 진단 결과를 기준으로 게시글을 발행합니다. 환경변수로 변경할 수 있습니다.

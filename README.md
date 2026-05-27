# VERIDION phase311 clean redteam delivery

VERIDION 공개/관리 화면을 단일 v311 디자인 시스템으로 정리한 납품 패키지입니다.

## 최종 검증

```bash
npm run phase311:final
```

이 게이트는 문법, 회귀 테스트, E2E, 페이지 무결성, 라우트, 링크, 보안, 배포 번들, 시크릿 위생, 레드팀 전역 감사, 런타임 정리를 한 번에 확인합니다.

## 핵심 기준

- 공개/관리 HTML은 `/shared/veridion-clean-v311.css` 단일 스타일 시스템을 사용합니다.
- 누적 generated/runtime/legacy phase CSS·JS 파일은 제거했습니다.
- `/portal`과 `/board`는 clean v311 화면 기준으로 유지합니다.
- 인사이트 API는 20분 자동 발행 메타데이터를 유지합니다.
- 운영 서버 반영 후 CDN/브라우저 캐시를 비운 뒤 실제 `/`, `/portal`, `/board`, `/products/veridion/demo`, `/plans`, `/auth`를 확인하세요.

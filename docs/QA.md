# QA

## Final gate

```bash
npm run verify:release
```

최종 게이트는 구조 정리 상태, 전역 참조 무결성, 내부 관리자 감사 9종, 구문, 통합 테스트, E2E, 경로, 스모크, 결과 UI, SSRF 방어, 테스트 런타임 격리, 페이지, 링크, 접근성, 반응형, 대비, CSP, 성능, 보안, 공개 API 격리, 배포 번들, Compose 전달값, Coolify 생성 경로, 시크릿 위생, 운영 준비도, 런타임 정리를 확인합니다.

## Manual verification still required

- 실제 브라우저 데스크톱·모바일 육안 검수
- 운영 Docker 이미지 빌드와 Compose 기동
- 실제 DNS와 CDN 캐시
- PortOne 실결제 및 웹훅
- 실제 PostgreSQL·Redis·S3 장애 복구

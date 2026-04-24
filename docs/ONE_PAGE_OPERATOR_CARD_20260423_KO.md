# NV0 / Veridion 1페이지 운영 카드 2026-04-23

## 평시 점검
```bash
npm run preflight
npm run smoke
npm run ops:report
```

## 실배포 검증
```bash
NV0_BASE_URL=https://nv0.kr npm run verify:prod
```

## 백업/복구
```bash
npm run backup:runtime
npm run restore:latest
npm run prune:runtime
```

## 회귀 테스트
```bash
npm run test:e2e
npm run test:session
npm run audit:inventory
```

## 장애 1차 대응 순서
1. `/healthz`, `/readyz` 확인
2. 최근 배포/환경변수 변경 확인
3. 관리자 진단에서 운영 리포트 생성
4. 필요 시 최신 백업 복원
5. `verify:prod` 재실행

## 절대 확인 항목
- 공개 홈에서 관리자 흔적 0
- `/admin`은 키 게이트만
- `/admin/console*`는 세션 없으면 차단
- `NV0_TRUST_PROXY_HEADERS=true`
- Cloudflare SSL mode = Full (strict)

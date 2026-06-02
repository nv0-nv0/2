# Rollback

## Package rollback

배포 전 기존 ZIP과 SHA-256을 보관합니다. 신규 배포 실패 시 이전 ZIP으로 되돌리고 환경변수는 변경 전 스냅샷을 복구합니다.

## Runtime rollback

```bash
npm run backup:runtime
npm run restore:latest
npm run restore:drill
```

운영 PostgreSQL 마이그레이션은 `deploy/postgres/migrations`의 버전 파일 기준으로 관리합니다. 운영 데이터 변경 전에는 DB 백업을 별도로 생성해야 합니다.

## Rollback triggers

- `/readyz` 실패
- 핵심 진단 흐름 실패
- 5xx 급증
- 결제 웹훅 검증 실패
- 저장소 연결 실패

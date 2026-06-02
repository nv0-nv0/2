# Operations

## Routine checks

```bash
npm run verify:quick
npm run runtime:clean
npm run ops:report
npm run ops:matrix
```

## Runtime data policy

배송본에는 `runtime/data/db.seed.json`만 포함합니다. 실제 DB, 세션, 보안 레코드, 업로드, 백업, 리포트는 로컬 또는 운영 런타임에서 생성하며 배송 ZIP에 포함하지 않습니다.

## Observability

- `/healthz`: 프로세스 생존 상태
- `/readyz`: 필수 의존성을 포함한 준비 상태
- 운영 배포 후 `npm run live:smoke`로 공개 경로를 재검증합니다.

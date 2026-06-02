# VERIDION 2.1 Clean Commercial Baseline

온라인 사업자의 공개 웹페이지를 진단하고, 신뢰·고지·전환 위험을 우선순위화하는 상용 서비스 패키지입니다.

## 빠른 시작

```bash
npm run dev
```

로컬 서버는 기본적으로 안전한 MVP 프로파일로 시작합니다. 상용 배포 전에 실제 환경변수를 주입하고 아래 검증을 실행합니다.

```bash
npm run verify:release
npm run deploy:precheck
```

## 핵심 명령

| 목적 | 명령 |
| --- | --- |
| 로컬 실행 | `npm run dev` |
| 격리 로컬 실행 | `npm run start:local` |
| 빠른 검증 | `npm run verify:quick` |
| 전체 릴리즈 검증 | `npm run verify:release` |
| 상용 배포 전 점검 | `npm run deploy:precheck` |
| 상용 비밀값 후보 생성 | `npm run secrets:generate` |
| Coolify·R2 환경변수 예시 생성 | `npm run generate:r2-env` |
| 안전한 ZIP 생성 | `npm run release:create -- --name veridion-release.zip` |
| 런타임 정리 | `npm run runtime:clean` |
| 내부 관리자 감사 검증 | `npm run check:runtime-audits` |
| 운영 매트릭스 생성 | `npm run ops:matrix` |

## 디렉터리

- `apps/`: 공개·관리자 화면
- `server/`: API, 진단, 결제, 운영 로직
- `shared/`: 공통 브라우저 자산과 상품 카탈로그
- `deploy/`: Compose, Coolify, PostgreSQL, R2 배포 자료
- `scripts/`: 운영·검증·복구 도구
- `tests/`: 기능·보안·회귀 테스트
- `docs/`: 현재 기준선 문서
- `runtime/data/db.seed.json`: 배송용 초기 seed

## 배포 원칙

- 실제 `.env`, 세션, 업로드, 백업, 운영 DB는 배송 ZIP에 포함하지 않습니다.
- `prelaunch`에서는 실결제를 비활성화합니다.
- 상용 전환은 PostgreSQL, Redis, S3 호환 스토리지, PortOne 웹훅 검증을 모두 확인한 뒤 진행합니다.
- 운영 배포와 실제 결제 검증은 이 패키지의 로컬 테스트만으로 확정할 수 없습니다.

상세 내용은 `docs/DEPLOYMENT.md`, `docs/OPERATIONS.md`, `docs/QA.md`, `docs/ROLLBACK.md`를 확인하세요.

# VERIDION 배포 파일 안내

배포 환경에 따라 아래 파일을 선택합니다. 실제 시크릿은 저장소에 커밋하지 않습니다.

| 목적 | 파일 | 비고 |
| --- | --- | --- |
| 기본 boot-safe Compose | `../docker-compose.yml` | 최소 실행 기준 |
| Coolify 운영 배포 | `docker-compose.coolify.yml` | 권장 운영 경로 |
| 상용 확장 배포 | `docker-compose.commercial.yml` | 외부 인프라 연동 시 사용 |
| 로컬 MinIO 보조 환경 | `docker-compose.local-minio.yml` | 개발·검증용 |
| Coolify 환경변수 예시 | `coolify.env.example` | 실제 값으로 복사 후 입력 |
| 운영 환경변수 예시 | `env.production.nv0.kr.example` | nv0.kr 운영 점검 기준 |
| 상용 환경 템플릿 | `env.commercial.template` | 일반화된 상용 배포 기준 |
| R2·Coolify 실행 안내 | `R2_COOLIFY_DEPLOYMENT_RUNBOOK_20260429_KO.md` | 상세 절차 |

## 배포 전 필수 순서

```bash
npm run secrets:generate
npm run release:predeploy
```

배포 후에는 실제 주소를 지정하여 라이브 스모크를 실행합니다.

```bash
NV0_LIVE_BASE_URL=https://www.nv0.kr npm run live:smoke
```

## 주의

- `NV0_SESSION_SECRET`은 신규 값으로 발급합니다.
- `NV0_EXPOSE_INTERNAL_PUBLIC_APIS=false`를 유지합니다.
- 결제 redirect allowlist와 웹훅 설정을 운영 도메인 기준으로 확인합니다.
- 공개 사업자 정보는 `../docs/PHASE354_OPERATOR_CONFIRMATION_CHECKLIST.md`에 따라 확인합니다.

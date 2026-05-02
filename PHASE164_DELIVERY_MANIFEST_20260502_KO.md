# PHASE164 납품 매니페스트

## 납품명
`nv0_full_p164_zero_cost_hardening_50_delivery.zip`

## 기준
- 입력 패키지: `nv0_full_p163_remote_backup_security_final(5).zip`
- 출력 패키지: Phase164 Zero Cost Hardening 50
- 원칙: 외부 키·유료 서비스·운영 콘솔 입력 없이 가능한 보강은 패키지 내부에 반영하고, 실제 운영 권한이 필요한 항목은 `operator_required`로 분리

## 주요 변경 파일

### 서버/코어
- `server/index.mjs`
- `server/core/hardening-matrix.mjs`

### 배포/환경
- `.env.example`
- `.env.coolify.example`
- `docker-compose.yml`
- `deploy/docker-compose.coolify.yml`
- `deploy/docker-compose.commercial.yml`
- `deploy/docker-compose.local-minio.yml`
- `deploy/coolify.env.bulk.txt`
- `deploy/coolify.env.example`
- `deploy/env.commercial.template`
- `deploy/env.production.template`
- `deploy/env.production.nv0.kr.example`

### 검증/운영 스크립트
- `scripts/restore-drill.mjs`
- `scripts/stress-smoke.mjs`
- `scripts/validate-phase164-zero-cost-hardening-50.mjs`
- `scripts/check-source-syntax.mjs`
- `scripts/validate-phase160-evidence-first-diagnosis.mjs`
- `scripts/validate-phase161-zero-cost-max-coverage.mjs`
- `scripts/validate-phase162-free-auto-disclosure.mjs`
- `package.json`

### 보고서
- `PHASE164_ZERO_COST_HARDENING_50_REPORT_20260502_KO.md`
- `PHASE164_ZERO_COST_HARDENING_50_VALIDATION_20260502.json`
- `README_PATCH_P164_KO.txt`

## 최종 검증 결과

`npm run phase164:final` 통과.

포함된 게이트:
- 소스 문법 검사: 179개 통과
- 통합 테스트: 86개 통과
- E2E: 통과
- Routes smoke: 24개 통과
- 링크 검사: 149개 통과
- Restore drill: 통과
- Stress smoke: 56 요청 / 0 실패
- Phase156~164 검증: 전부 통과

## 운영자가 배포 전 실제로 처리해야 하는 항목

- 운영 Secret Rotation: Cloudflare R2, SMTP, Turnstile, PortOne, Admin Password 등 실제 키 교체
- R2 IAM 최소 권한 정책 적용
- 외부 PostgreSQL 사용 시 SSL 강제 설정
- iOS Safari / 삼성 인터넷 실기기 확인
- 제2 리전 DR 또는 별도 복구 인프라 구성
- 운영 트래픽 Shadow Deployment가 필요하면 인프라 레벨에서 별도 적용

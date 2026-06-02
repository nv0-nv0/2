# PHASE358 변경 파일 요약

## 핵심 제품·배포 변경

- `.dockerignore`, `.gitignore`: `.env.test` 허용 예외 제거
- `deploy/coolify.env.example`
- `deploy/env.production.template`
- `deploy/env.production.nv0.kr.example`
- `deploy/env.commercial.template`: prelaunch 결제 공급자 `disabled` 정합화
- `deploy/docker-compose.commercial.yml`
- `deploy/docker-compose.local-minio.yml`: Redis strict readiness 기본값과 `/readyz` healthcheck 적용
- `scripts/create-secure-release.mjs`: 임의 `.env*` 차단 및 실제 ZIP 입력 allowlist 적용
- `scripts/validate-deploy-bundle.mjs`: 상용 readiness 계약 강화

## 신규 자동 검증

- `scripts/check-phase358-commercial-deploy-integrity.mjs`
- `scripts/run-phase358-audit.mjs`
- `scripts/run-phase358-final.mjs`

## 릴리즈 연결·문서 정합화

- `package.json`, `RUN_ALL_TESTS.sh`
- `README.md`, `deploy/README.md`, `docs/CURRENT_RELEASE.md`, `docs/INDEX.md`, `docs/PROJECT_STRUCTURE.md`
- PHASE337~357 역사적 릴리즈 계약 검증기: PHASE358 종단 게이트를 정상적인 상위 호환 릴리즈로 인식하도록 확장
- `docs/PHASE358_COMMERCIAL_DEPLOY_INTEGRITY_WORK_ORDER.md`
- `docs/PHASE358_REMEDIATION_MATRIX.md`
- `docs/PHASE358_COMMERCIAL_DEPLOY_INTEGRITY_CLOSEOUT.md`

## 자동 갱신 증거

전체 게이트 재실행으로 `docs/current/` 아래 감사·계약·최종 게이트 JSON 일부가 최신 실행 증거로 갱신되었습니다.

## 제외한 변경

- DB 스키마 변경 없음
- 인증 구조 변경 없음
- 실결제 활성화 없음
- 운영 배포 자동 실행 없음

# Phase 10 상용 런칭 완성/검수 보고서

생성일: 2026-04-24

## 최종 판정

- 로컬 코드/정적/통합 검증: 통과
- 테스트 게이트: 22 / 22 통과
- 공개 런칭 아키텍처 기준: commercial 단일 기준으로 강화
- Docker 빌드: 이 샌드박스에는 Docker가 없어 미실행. GitHub Actions `commercial-release`에서 docker build gate 수행.

## 이번 Phase 10에서 완료한 것

1. GitHub Actions CI 파이프라인 추가
   - `.github/workflows/ci.yml`
   - `.github/workflows/commercial-release.yml`

2. 상용 검증 스크립트 추가
   - `scripts/test-all.mjs`
   - `scripts/ci-strict.mjs`
   - `scripts/validate-pipeline.mjs`
   - `scripts/validate-commercial-runtime.mjs`

3. 배포 인프라 강화
   - `deploy/docker-compose.commercial.yml`
   - PostgreSQL / Redis / MinIO healthcheck 구성
   - Coolify compose를 commercial 기준으로 정리

4. 환경변수 기준 정리
   - `.env.example`
   - `deploy/coolify.env.example`
   - `deploy/env.production.template`
   - `deploy/env.production.nv0.kr.example`
   - `deploy/env.commercial.template`

5. 기존 검증 스크립트 상용 기준 보정
   - `check-env-examples`
   - `validate-deploy-bundle`
   - `validate-prod-env`
   - `preflight`
   - `check-page-integrity`
   - `check-links`
   - `check-data-integrity`

6. e2e 안정화
   - 서버 준비 대기 로직 추가
   - `/readyz` 최신 응답 구조에 맞게 검증 수정

## 통과한 검증

아래 항목은 현재 압축본 기준으로 직접 실행 완료했다.

- check:syntax: PASS (24287ms)
- check:data: PASS (1210ms)
- check:pages: PASS (724ms)
- check:links: PASS (594ms)
- check:env-examples: PASS (480ms)
- check:handoff-docs: PASS (1133ms)
- check:no-debug-client: PASS (570ms)
- check:render-safety: PASS (607ms)
- validate:deploy: PASS (580ms)
- validate:commercial: PASS (649ms)
- validate:pipeline: PASS (652ms)
- validate:commercial-runtime: PASS (341ms)
- test:providers: PASS (1893ms)
- test:session: PASS (3285ms)
- test:runtime: PASS (4217ms)
- test:routes: PASS (1968ms)
- test:contracts: PASS (2129ms)
- test:security-stateful: PASS (2669ms)
- test:portone: PASS (2719ms)
- test:portone-events: PASS (2312ms)
- smoke: PASS (1883ms)
- test:e2e: PASS (4872ms)

## 공개 런칭 전 실서버에서 반드시 확인할 것

아래는 코드 미완이 아니라 외부 운영 자원 연결 검증이다.

1. PortOne 운영 API Secret / Store ID / Channel Key / Webhook Secret 입력
2. PostgreSQL 접속 확인
3. Redis 접속 확인
4. S3-compatible storage 또는 실제 S3 접속 확인
5. 외부 scan provider endpoint/token 확인
6. Coolify에서 `/healthz`, `/readyz` 200 확인
7. PortOne 테스트 결제 1건 생성/완료/웹훅/취소 검증
8. Cloudflare SSL / WAF / Turnstile / cache bypass 확인

## 실패 차단 정책

commercial 모드에서는 다음이 차단된다.

- demo 결제 provider
- JSON primary persistence
- shared admin key 인증
- builtin scan provider
- local filesystem storage
- seed route 운영 노출
- PortOne webhook secret 없는 strict mode

## 최종 명령

```bash
npm run validate:commercial
npm run validate:pipeline
npm run test:all
npm run ci:strict
```

실서버에서는:

```bash
npm run validate:env -- ./deploy/env.commercial.template
npm run preflight
```


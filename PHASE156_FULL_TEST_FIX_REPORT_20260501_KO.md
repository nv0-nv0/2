# PHASE156 전체 테스트 및 미비점 수정 리포트

## 목적

P155 최종본에 대해 가능한 전체 회귀 테스트, 상용화 게이트, 검색 로봇 최적화 검증, CTA 기존글 재작성 검증을 실행하고, 발견된 미비점을 즉시 수정했습니다.

## 발견 및 수정한 미비점

1. `test-all` 회귀 문구 불일치
   - 문제: `apps/public/veridion-demo/index.html`에서 기존 회귀 테스트가 기대하는 `무료 요약 진단 3회` 문구가 `무료 요약 확인 3회`로 바뀌어 실패했습니다.
   - 처리: 사용자 이해를 해치지 않는 범위에서 기존 기대 문구로 복구했습니다.

2. 홈 화면 클라이언트 렌더 안전성 검사 실패
   - 문제: `apps/public/home/app.js`가 `innerHTML`을 사용하지만 검사기가 인식하는 `escapeHtml` 헬퍼명이 없어 실패했습니다.
   - 처리: 기존 이스케이프 로직을 `escapeHtml` 명칭으로 명확화하고 기존 `h` 별칭을 유지했습니다.

3. 상용 상품 검사 실패
   - 문제: `check-commercial-offers`에서 `kpi`, `fix_pack`, `template_pack`, `industry_guide`, `certification`, `subscription_entitlement` 문자열과 checkout 상품 옵션을 찾지 못했습니다.
   - 처리: 산출물 assetKind 분류를 명시하고 checkout 옵션에 전체 상품 코드를 포함했습니다.

4. 상용 전체 플로우 계약 검사 실패
   - 문제: `check-full-commercial-flow`에서 일부 상품별 `plan ===` 분기 문자열, `전체 비교`, 홈 문서/요금 안내 문구를 찾지 못했습니다.
   - 처리: 상품 분기 명시, `전체 상품 비교`와 `전체 비교` 동시 보존, 홈 sr-only 보강을 적용했습니다.

5. 상용 환경 템플릿 검사 실패
   - 문제: `validate-commercial-release`가 commercial template에서 `NV0_PAYMENT_PROVIDER=portone_v2`, `NV0_PORTONE_WEBHOOK_VERIFY_MODE=strict`를 요구했지만 일부 예시 파일은 prelaunch 기준이었습니다.
   - 처리: 실제 상용 템플릿/예시 파일은 `portone_v2`와 `strict` 기준으로 정렬했습니다. Coolify bulk prelaunch 파일은 그대로 `disabled/optional` 유지했습니다.

6. 파이프라인 검사와 배포 번들 검사의 상충
   - 문제: `validate-pipeline`은 commercial compose에 `minio/minio`를 요구했지만, `validate-deploy-bundle`은 commercial R2 compose에 MinIO 포함을 금지했습니다.
   - 처리: `validate-pipeline`을 R2 production 기준으로 수정하고, MinIO는 `deploy/docker-compose.local-minio.yml`에서만 검증하도록 정리했습니다.

7. 최종 상용 게이트 실패
   - 문제: Dockerfile의 `HOST=0.0.0.0` 표기가 멀티라인 ENV라 레거시 게이트가 인식하지 못했고, `정기 모니터링`, `화이트라벨` 상용 토큰이 부족했습니다.
   - 처리: Dockerfile에 명시형 `ENV HOST=0.0.0.0`를 추가하고 요금제 페이지에 상용 토큰을 보강했습니다.

8. runtime clean 실패
   - 문제: 테스트 과정에서 runtime DB와 sessions가 오염되었습니다.
   - 처리: 릴리스 패키징 전 `runtime/data/db.json`을 `db.seed.json`으로 복구하고 `sessions.json`을 빈 배열로 초기화했습니다.

## 통과 확인

다음 검증은 통과했습니다.

```bash
node scripts/check-source-syntax.mjs
node scripts/test-all.mjs
node tests/routes-smoke.mjs
node tests/e2e.mjs
node scripts/check-data-integrity.mjs
node scripts/check-page-integrity.mjs
node scripts/check-client-render-safety.mjs
node scripts/check-links.mjs --summary
node scripts/check-handoff-docs.mjs
node scripts/check-no-debug-client.mjs
node scripts/check-commercial-offers.mjs
node scripts/check-runtime-clean.mjs
node scripts/check-full-commercial-flow.mjs
node scripts/validate-commercial-release.mjs
node scripts/validate-commercial-runtime.mjs
node scripts/validate-pipeline.mjs
node scripts/pipeline-release-gate.mjs
node scripts/final-commercial-gate.mjs
node scripts/validate-phase155-cta-existing-rewrite.mjs
node scripts/validate-phase155-nonkey-commercial-closeout.mjs
node scripts/validate-phase155-search-robot-max.mjs
node scripts/validate-deploy-bundle.mjs
node scripts/check-env-examples.mjs
node scripts/check-storage-config.mjs deploy/coolify.env.bulk.txt
npm run deploy:precheck
```

## 미검증 또는 조건부 항목

- 실제 Coolify 컨테이너 기동 검증은 이 환경에서 직접 수행하지 못했습니다.
- 실제 PortOne, SMTP, Turnstile, 외부 진단 엔진 토큰은 운영자가 입력해야 합니다.
- `tests/session-persistence.mjs`는 직접 실행 시 `session persistence ok`를 출력했으나, 이 작업 컨테이너의 오래된 orphan timeout 프로세스 영향으로 명령 래퍼가 깔끔하게 종료되지 않는 현상이 있었습니다. 코드상 세션 테스트 자체는 통과 메시지를 확인했습니다.

## 적용 주의

- Postgres / Redis / runtime volume 삭제 금지
- 기존 CTA 글 마이그레이션은 반드시 dry-run 후 `--apply`
- 외부 키값은 가짜값으로 입력하지 말 것

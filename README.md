# VERIDION phase355 organization closeout

온라인 사업자의 공개 웹페이지를 기준으로 신뢰·준법·전환 요소를 진단하고, 결과 저장·리포트·고객 포털 흐름으로 연결하는 패키지입니다.

## 1. 처음 실행할 때

```bash
cp .env.example .env
npm run dev
```

기본 주소는 `http://127.0.0.1:3210`입니다. 메인 화면은 서비스 설명과 전용 진단 진입에 집중하며, 실제 무료 진단은 `/products/veridion/demo`에서 실행합니다.

사용 가능한 핵심 명령은 다음 명령으로 확인합니다.

```bash
npm run help
```

## 2. 검증 명령

빠른 로컬 확인:

```bash
npm run verify:quick
```

최종 릴리즈 확인:

```bash
npm run phase355:final
```

아래 명령도 동일한 최신 릴리즈 게이트를 실행합니다.

```bash
npm run verify:release
npm run delivery:final
npm run release:predeploy
./RUN_ALL_TESTS.sh
```

## 3. 주요 개별 점검 명령

```bash
npm test
npm run test:e2e
npm run test:routes
npm run smoke
npm run check:public-product-pipeline
npm run check:public-api-isolation
npm run test:public-probe-minimal
npm run check:compose-env-forwarding
npm run check:phase355-audit
npm run runtime:clean
```

## 4. 운영 반영 후 확인

운영 서버에 직접 배포한 뒤에는 라이브 스모크를 별도로 실행합니다. 패키지 생성 과정에서는 운영 서버 배포를 실행하지 않습니다.

```bash
NV0_LIVE_BASE_URL=https://www.nv0.kr npm run live:smoke
```

## 5. 환경변수와 배포

- 로컬 개발 기본값: `.env.example`
- Coolify 배포 예시: `deploy/coolify.env.example`
- 운영 배포 예시: `deploy/env.production.nv0.kr.example`
- 배포 파일 선택 안내: `deploy/README.md`

실제 API 키, 비밀번호, 토큰은 파일에 하드코딩하지 않습니다. 운영 환경에는 신규 `NV0_SESSION_SECRET`을 발급해 입력합니다.

## 6. 문서 탐색

문서가 누적되어 있으므로 다음 순서로 확인합니다.

1. `README.md`
2. `docs/CURRENT_RELEASE.md`
3. `docs/INDEX.md`
4. `deploy/README.md`
5. `docs/PHASE354_OPERATOR_CONFIRMATION_CHECKLIST.md`

과거 PHASE 문서는 회귀 검증과 롤백 근거이므로 임의 삭제하거나 이동하지 않습니다.

## 7. 롤백

PHASE355 정리 작업은 DB 마이그레이션, 결제 로직 변경, 인증 구조 변경을 포함하지 않습니다. PHASE355 변경으로 문제가 발생하면 **PHASE354 패키지로 복귀**한 뒤 아래 명령을 실행합니다.

```bash
npm run phase354:final
```

PHASE354의 보안·배포 변경까지 함께 되돌려야 하는 경우에만 PHASE353 패키지를 검토합니다.

## 8. PHASE354에서 유지한 보안 기준

- 공개 `/healthz`, `/readyz`는 로드밸런서 확인에 필요한 최소 상태만 반환합니다.
- 운영 환경에는 `NV0_SESSION_SECRET`을 반드시 발급해 입력합니다.
- Coolify boot-safe Compose는 보안·요청 제한·진단 rate limit·데이터 보존·결제 redirect allowlist 값을 컨테이너에 전달합니다.
- `.gitignore`는 `.env`, 활성 런타임 DB, 세션, 보안 레코드, 업로드, 백업, 로그, ZIP을 커밋 대상에서 제외합니다.

# VERIDION phase358 commercial deploy integrity closeout

온라인 사업자의 공개 웹페이지를 기준으로 신뢰·준법·전환 요소를 진단하고, 결과 저장·유료 리포트·고객 포털 흐름으로 연결하는 패키지입니다.

PHASE358은 PHASE357의 전역 QA·CSP 시각화 보강을 유지하면서 상용 배포 템플릿, Redis readiness, 환경파일 유출 방어를 추가 마감한 릴리즈입니다.

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
npm run phase358:final
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
npm run check:csp-inline-style
npm run check:commercial-deploy-integrity
npm run test:phase357-global-contract
npm run check:phase358-audit
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
- Coolify 대량 입력 예시: `deploy/coolify.env.bulk.txt`
- 운영 배포 예시: `deploy/env.production.nv0.kr.example`
- 배포 파일 선택 안내: `deploy/README.md`

실제 API 키, 비밀번호, 토큰은 파일에 하드코딩하지 않습니다. 운영 환경에는 신규 `NV0_SESSION_SECRET`, `NV0_SECURE_RECORDS_KEY`, `NV0_PRIVACY_HASH_KEY`를 발급해 입력합니다.

PHASE357에서는 Compose와 운영 템플릿에 readiness 캐시, SSRF 방어 제한, 진단 timeout, 외부 결제 provider URL·token, 법적 고지 버전, 빌드 식별값 전달 항목을 보강했습니다. PHASE358에서는 prelaunch 결제 공급자를 비활성 상태로 통일하고 상용 Compose의 Redis readiness를 fail-closed로 강화했습니다.

## 6. 문서 탐색

문서가 누적되어 있으므로 다음 순서로 확인합니다.

1. `README.md`
2. `docs/CURRENT_RELEASE.md`
3. `docs/INDEX.md`
4. `deploy/README.md`
5. `docs/PHASE354_OPERATOR_CONFIRMATION_CHECKLIST.md`
6. `docs/PHASE358_COMMERCIAL_DEPLOY_INTEGRITY_CLOSEOUT.md`

과거 PHASE 문서는 회귀 검증과 롤백 근거이므로 임의 삭제하거나 이동하지 않습니다.

## 7. 롤백

PHASE358 변경은 DB 마이그레이션, 결제 실활성화, 인증 구조 변경을 포함하지 않습니다. PHASE358 변경으로 문제가 발생하면 **PHASE357 CSP 시각화 무결성 패치 패키지로 복귀**한 뒤 아래 명령을 실행합니다.

```bash
npm run phase357:final
```

## 8. 유지하는 보안 기준

- 공개 `/healthz`, `/readyz`는 로드밸런서 확인에 필요한 최소 상태만 반환합니다.
- 고객 공개 영역에서 내부 운영 API 30개를 차단합니다.
- 진단 대상 URL은 사설 IP, 루프백, 메타데이터 주소, DNS rebinding 위험, redirect 목적지를 확인합니다.
- Coolify boot-safe Compose는 보안·요청 제한·진단 rate limit·데이터 보존·결제 redirect allowlist 값을 컨테이너에 전달합니다.
- `.gitignore`는 `.env`, 활성 런타임 DB, 세션, 보안 레코드, 업로드, 백업, 로그, ZIP을 커밋 대상에서 제외합니다.

## 9. PHASE356 결과 화면 개편 유지

- 무료 진단 결과 첫 화면에 결제 전 위기도 대형 원형 그래프를 배치했습니다.
- 발견 문제·리스크 영역·점검 요소·직접 확인 항목을 KPI로 정렬했습니다.
- 영역별 위험 막대, 고객 여정 퍼널, 우선 해결 3개, 잠금 리포트 미리보기, 하단 고정 구매 CTA를 제공합니다.
- 기술 근거와 긴 설명은 접이식 상세 영역에서 확인합니다.
- 위기도는 공개 화면 기준 보완 우선순위이며 실제 이탈률이나 법적 결론을 의미하지 않습니다.

## 10. PHASE357 전역 QA 보강

- 관리자 7개 화면에 본문 바로가기를 추가했습니다.
- 무료 진단과 결제 폼은 Enter 키로 실행할 수 있습니다.
- 진단 결과가 열리면 결과 영역으로 포커스가 이동합니다.
- 상태 메시지는 보조기기에 전달되도록 live region을 보강했습니다.
- 최근 진단 기록이 없으면 `최근 기록 비우기` 버튼을 숨기고 비활성화합니다.
- 고객 포털 사이드 메뉴에 접근 가능한 이름을 추가했습니다.
- Coolify Compose와 운영 템플릿의 주요 운영값 전달 여부를 자동 검사합니다.
- 공개 진단 입력은 루프백, 사설 IP, 메타데이터 주소를 입력 단계에서 즉시 거절합니다.
- `NV0_RUNTIME_DIR`을 별도 경로로 설정해도 업로드 저장·다운로드·재시작·복구가 동일하게 작동합니다.
- 결제·TrustOps·스모크·인수 테스트는 전용 임시 런타임을 사용하고 종료 후 정리합니다.
- 로컬 `.env.example`과 상용 배포 템플릿은 역할을 분리하여 검증합니다.
- 엄격한 CSP를 유지하면서 동적 막대·원형 그래프를 클래스 기반으로 렌더링해 브라우저 시각화 차단을 방지합니다.

## 11. PHASE358 상용 배포 무결성 보강

- `prelaunch` 환경 예시는 `NV0_PAYMENT_PROVIDER=disabled`를 유지합니다.
- 실제 `portone_v2` 활성화는 `NV0_DEPLOYMENT_STAGE=commercial_launch` 전환과 웹훅 확인 후 진행합니다.
- 상용 Compose와 로컬 MinIO 검증 프로파일은 앱 healthcheck로 `/readyz`를 사용합니다.
- Redis 세션·rate limit·lock provider가 준비되지 않으면 상용 앱을 healthy로 판정하지 않습니다.
- `.env.example`, `.env.coolify.example` 외 임의 `.env*` 파일은 보안 ZIP에 포함하지 않습니다.

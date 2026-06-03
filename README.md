# VERIDION 2.7 상용 하드닝 최대화 기준선

온라인 사업자의 공개 웹페이지를 진단하고, 신뢰·고지·전환 위험을 우선순위화하는 상용 서비스 패키지입니다.

## 빠른 시작

```bash
npm start
```

로컬 서버는 기본적으로 안전한 MVP 프로파일로 시작합니다. 상용 배포 전에 실제 환경변수를 주입하고 아래 검증을 실행합니다.

```bash
npm run verify:release
npm run deploy:precheck
```

## 핵심 명령

| 목적 | 명령 |
| --- | --- |
| 로컬 실행 | `npm start` |
| 격리 로컬 실행 | `npm run start:local` |
| 빠른 검증 | `npm run verify:quick` |
| 전체 릴리즈 검증 | `npm run verify:release` |
| Stitch 경험 파이프라인 검증 | `node scripts/check-stitch-experience-pipeline.mjs && node tests/stitch-experience-pipeline.mjs` |
| 상용 배포 전 점검 | `npm run deploy:precheck` |
| 상용 비밀값 후보 생성 | `npm run secrets:generate` |
| Coolify·R2 환경변수 예시 생성 | `npm run generate:r2-env` |
| 안전한 ZIP 생성 | `npm run release:create -- --name veridion-release.zip` |
| 런타임 정리 | `npm run clean:runtime && npm run check:runtime-clean` |
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


## Executive Trust Report System

무료 진단 결과는 경영진 판단용 신뢰 리스크 요약 보고서로 렌더링합니다. 무료 공개 범위는 약 25%이며, 상세 리포트에서는 근거 URL, 정확한 수정 위치, 수정 전후 문구, 14일 실행 로드맵, 재점검 기준을 제공합니다.

진단 시작 화면과 보고서 전역 품질은 `npm run test:report-excellence`로 검증하며 100점 미만이면 릴리즈를 차단합니다. 상세 구조는 `docs/REPORT_SYSTEM.md`를 확인하세요.

## 배포 원칙

- 실제 `.env`, 세션, 업로드, 백업, 운영 DB는 배송 ZIP에 포함하지 않습니다.
- `prelaunch`에서는 실결제를 비활성화합니다.
- 상용 전환은 PostgreSQL, Redis, S3 호환 스토리지, PortOne 웹훅 검증을 모두 확인한 뒤 진행합니다.
- 운영 배포와 실제 결제 검증은 이 패키지의 로컬 테스트만으로 확정할 수 없습니다.

상세 내용은 `docs/DEPLOYMENT.md`, `docs/OPERATIONS.md`, `docs/QA.md`, `docs/ROLLBACK.md`를 확인하세요.


## v2.7 스티치 기관형 리디자인 마감

- 전체 공개 화면은 밝은 기관형 디자인과 한글 우선 문구를 사용합니다.
- 정적 CSS·JS는 `?v=2.7.0` 릴리즈 식별자를 사용하며, 식별자가 없는 자산은 장기 캐시하지 않습니다.
- 관리자 로그인은 상용 환경에서 계정 기반 RBAC를 사용하고, `NV0_ADMIN_MFA_REQUIRED=true`인 경우 TOTP 일회용 인증번호를 추가로 요구합니다.
- 운영 리포트에는 CSRF 토큰을 포함하지 않습니다.
- 배포 후에는 CDN·브라우저 캐시 제거와 데스크톱·모바일 육안 검수를 수행합니다.


## v2.7 운영 안정성 마감
- 신규 비밀번호는 15자 이상, 128자 이하로 제한하며 추측하기 쉬운 문자열을 차단합니다.
- 진단 오류 fallback 결과는 캐시에 고정하지 않습니다. 다시 진단하면 서버에 강제 재점검을 요청합니다.
- 브라우저 오류는 개인정보를 제거한 최소 필드만 `/api/public/client-metric`으로 전송합니다.
- 백업, 운영 리포트, 메일 처리, 환경 정리는 `/api/admin/jobs` 비동기 큐에서 실행하고 관리자 화면은 작업 상태를 확인합니다.
- 공개 메뉴는 `진단`, `인사이트`, `요금제`, `고객 포털` 한글 표기를 기준으로 고정합니다.

## 2.7 상용 마감 확인
- 배송본은 `runtime/data/db.seed.json`만 유지하며 `runtime-ui/`를 포함하지 않습니다.
- 정적 HTML은 서버 주입 전에도 canonical·robots 폴백을 포함합니다.
- 전체 검증은 `npm run verify:release`로 실행합니다.

## Stitch 경험 파이프라인

Stitch `Executive Trust Framework` 시안 10종은 홈, 진단 결과, 요금제, 고객 포털, 로그인, 인사이트, 관리자 대시보드에 연결했습니다. `shared/stitch-route-manifest.mjs`가 시안·라우트·상태·기능 연결의 단일 소스이며, 정적 계약 검사와 테스트 전용 내부 API 통합 테스트를 최종 릴리즈 게이트에 포함합니다. 상세 내용은 `docs/STITCH_EXPERIENCE_PIPELINE.md`를 확인하세요. 전체 31개 HTML의 중복 ID·입력 라벨·빈 링크·빈 버튼·정적 자산과 일반 페이지 Host 차단·헬스체크 예외도 별도 릴리즈 계약으로 검증합니다.

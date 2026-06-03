# QA

## Final gate

```bash
npm run verify:release
```

전문 리포트·진단 시작 화면 디자인 전역 배점은 아래 명령으로 별도 확인할 수 있습니다.

```bash
npm run test:report-excellence
```

배점은 100점 만점이며 100점 미만이면 릴리즈를 차단합니다.

Stitch 경험 파이프라인은 아래 명령으로 별도 확인합니다.

```bash
node scripts/check-stitch-experience-pipeline.mjs
node tests/stitch-experience-pipeline.mjs
```

최종 게이트는 Stitch 시안-라우트-기능 파이프라인, 구조 정리 상태, 전역 참조 무결성, 내부 관리자 감사 9종, 구문, 통합 테스트, E2E, 경로, 스모크, 결과 UI, 전문 리포트 100점 전역 배점, SSRF 방어, 테스트 런타임 격리, 페이지, 링크, 접근성, 반응형, 대비, CSP, 성능, 보안, 공개 API 격리, 배포 번들, Compose 전달값, Coolify 생성 경로, 시크릿 위생, 운영 준비도, 런타임 정리를 확인합니다. 추가로 31개 HTML의 중복 ID·입력 라벨·빈 링크·빈 버튼·정적 자산·공통 Stitch CSS를 심층 검사하고, 일반 페이지의 비허용 Host 차단과 헬스체크 예외를 전용 계약 테스트로 검증합니다.

## Manual verification still required

- 실제 브라우저 데스크톱·모바일 육안 검수
- 운영 Docker 이미지 빌드와 Compose 기동
- 실제 DNS와 CDN 캐시
- PortOne 실결제 및 웹훅
- 실제 PostgreSQL·Redis·S3 장애 복구

활성 진단 라우트와 canonical demo 마크업은 동일해야 하며, 입력 퍼널 디자인 배점도 100점 미만이면 차단됩니다.


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

## 추가 상용 마감 계약
- `runtime-ui/` 로컬 스냅샷 혼입을 차단합니다.
- 공개 HTML은 정적 canonical·robots 폴백을 유지합니다.
- 공개 API의 제품 버전 식별자는 의미 기반 이름만 사용합니다.
- 의도적으로 유지하는 호환 사본은 동기화 계약으로 검증합니다.

## UI Foundation 회귀 검증

```bash
node tests/ui-foundation-hardening-contract.mjs
```

검증 범위: 모든 HTML의 foundation CSS·runtime JS 연결, CSS 로드 순서, 진단 리포트의 12px 미만 텍스트 제거, 정책 문서 템플릿, 공개 푸터 단일화, 포털 샘플 배너, 요금제 중복 순번 제거, 모바일 메뉴 접근성 속성.

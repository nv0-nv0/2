# Veridion v2.7 Stitch Executive Trust Framework 상용 인수 문서

## 1. 적용 범위

이 릴리즈는 기존 Veridion v2.7 상용 하드닝 구조를 보존하면서 Stitch 산출물 10종을 실제 서비스 라우트와 기능 흐름에 연결한다.

- 디자인 시스템: `shared/stitch-institutional.css`
- Stitch 시안-라우트 명세: `shared/stitch-route-manifest.mjs`
- 경험 파이프라인: `server/core/stitch-experience-pipeline.mjs`
- 정적 감사: `scripts/check-stitch-experience-pipeline.mjs`
- 통합 테스트: `tests/stitch-experience-pipeline.mjs`

## 2. 경험 파이프라인 레이어

| 레이어 | 엔진 | 에이전트 | 책임 |
| --- | --- | --- | --- |
| 디자인 시스템 | `stitch-design-system-engine` | `design-token-governance-agent` | 공통 토큰, 대비, 상태 UI, 모션 안전성 |
| 라우트 경험 | `stitch-route-experience-engine` | `route-surface-mapping-agent` | Stitch 시안과 실제 라우트 연결 |
| 상태 커버리지 | `stitch-state-coverage-engine` | `interaction-state-coverage-agent` | loading, error, success, empty, permission-denied, mobile 상태 검증 |
| 기능 바인딩 | `stitch-function-binding-engine` | `function-handoff-agent` | 진단, 결제, 포털, 인증, 인사이트, 관리자 기능 연결 |
| 릴리즈 계약 | `stitch-release-contract-engine` | `stitch-regression-gate-agent` | 정적 감사, 통합 테스트, 회귀 차단 |

## 3. 로컬 검증

전체 게이트:

```bash
npm run verify:release
```

빠른 기능 검증:

```bash
npm run verify:quick
```

패키징 전 청결 검증:

```bash
npm run clean:runtime
npm run check:runtime-clean
npm run check:release-secret-hygiene
```

## 4. 추가 심층 릴리즈 계약

- `scripts/check-page-contract-deep.mjs`: 전체 31개 HTML의 문서 구조, 중복 ID, 입력 라벨, 빈 링크, 빈 버튼, 로컬 정적 자산, 공통 Stitch CSS 연결을 독립 검사한다.
- `tests/security-host-guard-contract.mjs`: 일반 페이지의 비허용 Host `421` 차단, 헬스체크의 로드밸런서 호환 예외, 보안 헤더, 관리자 비로그인 차단, 내부 Stitch API 격리를 실제 로컬 서버로 검증한다.

## 5. 운영 반영 전 필수 확인

로컬 검증과 운영 검증은 구분한다. 운영 반영 전에는 다음 항목을 실제 인프라에서 확인한다.

1. DNS, CDN, TLS, Cloudflare 규칙
2. Coolify 또는 Docker Compose 기동과 헬스체크
3. PostgreSQL, Redis, S3 호환 오브젝트 스토리지 연결
4. 결제 사업자 실계정 승인, 결제 성공·취소·웹훅 검증
5. 운영 환경변수와 시크릿 주입
6. 데스크톱·모바일 브라우저 시각 검수
7. 백업, 복구 드릴, 롤백 리허설

## 6. 롤백

1. 배포 전 운영 데이터와 환경변수를 백업한다.
2. 이전 릴리즈 아카이브를 보존한다.
3. 문제 발생 시 애플리케이션 이미지를 이전 릴리즈로 되돌린다.
4. 데이터 마이그레이션이 없는 이번 UI·파이프라인 적용은 코드 롤백으로 복구한다.
5. 런타임 업로드, 백업, 보고서는 배포 ZIP에 포함하지 않는다.

## 7. 릴리즈 판정 원칙

`npm run verify:release`가 전부 통과하면 로컬 패키지 상용 게이트를 통과한 것이다. 실제 운영 배포 완료 판정은 운영 인프라와 외부 연동을 검증한 뒤 확정한다.

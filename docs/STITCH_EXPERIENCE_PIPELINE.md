# Stitch Experience Pipeline

## 목적

Stitch에서 제공된 `Executive Trust Framework` 시안 10종을 단순 HTML 사본으로 배치하지 않고, VERIDION 실제 라우트와 기능 흐름에 연결한 추적 가능한 경험 파이프라인입니다.

## 5개 레이어

1. `design-system-layer`: 디자인 토큰을 `shared/stitch-institutional.css` 로컬 CSS에 고정합니다.
2. `route-experience-layer`: 시안 10종과 홈, 진단, 요금제, 포털, 로그인, 인사이트, 관리자 라우트를 연결합니다.
3. `state-coverage-layer`: 기본, hover, focus-visible, disabled, loading, error, success, empty, permission-denied, 모바일 상태를 검수합니다.
4. `function-binding-layer`: 진단, 결과 렌더링, 요금제, 결제, 포털, 인사이트 발행, 관리자 운영, 정책 푸터를 연결합니다.
5. `release-contract-layer`: 정적 계약 검사와 통합 테스트를 최종 릴리즈 게이트에 포함합니다.

## 주요 파일

- `shared/stitch-route-manifest.mjs`: 시안, 라우트, 상태, 기능 연결 단일 소스
- `server/core/stitch-experience-pipeline.mjs`: 경험 파이프라인 상태와 감사 로직
- `scripts/check-stitch-experience-pipeline.mjs`: 전체 HTML, 로컬 CSS, 시안 매핑, 내부 API 격리 검사
- `tests/stitch-experience-pipeline.mjs`: 테스트 전용 내부 API 통합 검증
- `scripts/check-page-contract-deep.mjs`: 전체 HTML의 문서 구조, 입력 라벨, 링크, 버튼, 로컬 자산 심층 검증
- `tests/security-host-guard-contract.mjs`: Host 차단, 헬스체크 예외, 보안 헤더, 관리자 격리 검증

## 검증

```bash
node scripts/check-stitch-experience-pipeline.mjs
node tests/stitch-experience-pipeline.mjs
node scripts/check-page-contract-deep.mjs
node tests/security-host-guard-contract.mjs
npm run verify:release
```

`/api/public/stitch-experience-pipeline`은 내부 통합 테스트에서만 활성화됩니다. 일반 고객 공개 API에서는 404로 격리됩니다.

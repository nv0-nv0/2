# Phase165 Route Security Validation Fix Report

## 목적

사용자가 지적한 세 영역을 실제 소스 기준으로 재검토하고, 구현 실패 가능성이 높은 부분을 코드/검증/운영 기준으로 보강했다.

## 검토 결론

| 항목 | 판정 | 처리 |
|---|---:|---|
| `server/routes/public.mjs` 분리 | 기존 패키지에는 파일 자체가 없었고, 라우팅이 `server/index.mjs`에 집중되어 있었다. | `/api/public/*` 전용 라우터를 추가하고 index에서 prefix 기준으로 먼저 위임하도록 구성했다. |
| `server/routes/admin.mjs` 분리 | 기존 패키지에는 파일 자체가 없었다. 관리자 API는 index 내부에 중앙 인증 게이트가 있었지만, 파일 분리 상태는 아니었다. | `/api/admin/*` 전용 라우터를 추가하고, IP allowlist → 세션 → CSRF → RBAC 순서의 중앙 게이트를 라우터 내부에 유지했다. |
| `server/config/validation.mjs` | 기존 패키지에는 파일 자체가 없고 `validateConfig()`가 index 내부에 있었다. | 설정 검증 전용 모듈을 추가하고, 숫자 범위/enum/상용 필수값/placeholder/HTTPS/email/admin allowlist 검증을 통합했다. |

## 추가 발견 및 수정

- `server/index.mjs`의 관리자 라이브러리 업로드 경로에서 `putObjectToS3Compatible()`를 호출하지만 import가 없었다.
- 이 분기는 S3/object storage 업로드 시 런타임 오류를 만들 수 있으므로 명시 import를 추가했다.

## 보강된 구조

```text
server/
  config/
    validation.mjs
  routes/
    public.mjs
    admin.mjs
  index.mjs
scripts/
  validate-phase165-route-security-validation-fix.mjs
```

## 검증 기준

- 소스 문법 검사
- 기존 통합 테스트
- E2E 테스트
- route smoke 테스트
- Phase164 검증 유지
- Phase165 전용 검증 추가

## 운영상 남은 항목

아래는 코드 패키지에서 강제할 수 없고 운영 환경에서 입력/확인해야 한다.

- 실제 관리자 IP allowlist 값
- 실제 Redis/PostgreSQL/Object Storage 자격 정보
- 실제 SMTP/PortOne/Turnstile 키
- 운영 도메인 HTTPS 종단 및 Cloudflare 설정

## 실제 실행 결과

| 검증 | 결과 |
|---|---:|
| `npm run check:syntax` | 통과, 183개 소스 문법 정상 |
| `npm run test:all` | 통과, 85개 통합 테스트 성공 |
| `npm run test:e2e` | 통과 |
| `npm run test:routes` | 통과, 24개 라우트 smoke 성공 |
| `npm run test:security-stateful` | 통과, 5개 보안 상태 테스트 성공 |
| `npm run check:links -- --summary` | 통과, 149개 링크 오류 0개 |
| `npm run phase165:final` | 통과, Phase164/Phase165 검증 모두 성공 |

## 주의

기존 `server/index.mjs` 내부에는 과거 inline 라우트 체인이 남아 있으나, `handleApi()` 진입 직후 `/api/public/*`, `/api/admin/*`를 신규 라우터로 먼저 위임한다. 따라서 실제 API 요청은 신규 라우터가 처리한다. 차기 정리 단계에서는 inline 잔여 체인을 제거해 파일 크기를 줄일 수 있다.

# PHASE223 오류·충돌·깨짐·누락 리스크 전역 개선 완료 보고서

## 목적

PHASE222에서 리다이렉트 루프를 차단한 뒤에도 운영 환경에서는 다음 유형의 리스크가 남을 수 있습니다.

1. Cloudflare/Coolify/앱 리다이렉트 담당자 충돌
2. 이전 캐시 또는 정적 파일 로딩 실패로 인한 화면 깨짐
3. 없는 경로 또는 서버 오류가 plain text로 노출되어 제품 완성도가 낮아 보이는 문제
4. public SEO title과 실제 페이지 title/H1 불일치
5. CTA 자동발행 글 길이 기준 일부 runtime 설정 불일치
6. placeholder 사업자 정보·호스팅·전화번호 값의 공개 노출 가능성
7. 배포 후 운영자가 즉시 확인할 수 있는 위험 상태 API 부재

이번 PHASE223은 위 항목을 전역 오류·충돌·깨짐·누락 리스크로 보고, 제품 품질과 운영 안정성을 동시에 강화했습니다.

## 적용한 개선

### 1. 배포 리스크 가드 추가

신규 파일: `server/core/deployment-risk-guard.mjs`

- `NV0_PUBLIC_BASE_URL` 유효성 확인
- `NV0_ALLOWED_HOSTS`와 public host 정합성 확인
- apex/www host 허용 여부 확인
- Cloudflare/Coolify/앱 중 redirect 담당자가 2개 이상 충돌하는지 확인
- `NV0_CANONICAL_HOST_REDIRECT=true`가 명시된 경우에만 앱 redirect를 허용
- 통신판매업 신고번호, 호스팅 제공자, 고객센터 전화번호 placeholder 값 탐지
- `/readyz`, `/health`, `/api/public/health`, `/api/public/risk-guard`에서 상태 확인 가능
- 응답 헤더에 `x-nv0-risk-guard`, `x-nv0-redirect-owner` 추가

### 2. 운영 환경 변수 템플릿 정리

다음 파일에 안전 기본값을 반영했습니다.

- `.env.example`
- `.env.coolify.example`
- `deploy/coolify.env.example`
- `deploy/coolify.env.bulk.txt`
- `deploy/env.production.template`
- `deploy/env.production.nv0.kr.example`
- `deploy/env.commercial.template`

운영 추천값:

```env
NV0_PUBLIC_BASE_URL=https://www.nv0.kr
NV0_CANONICAL_HOST_REDIRECT=false
NV0_REDIRECT_OWNER=edge
NV0_DEPLOYMENT_RISK_STRICT=false
```

현재 라이브가 apex에서 www로 이동하는 구조라면 위 값이 가장 안전합니다. 앱 내부 redirect는 꺼두고 Cloudflare/Coolify edge에서만 담당하게 해야 합니다.

### 3. 사용자 친화적 오류 페이지 추가

기존에는 없는 경로 또는 서버 오류가 `Not found` 같은 plain text로 노출될 수 있었습니다. 이제 public HTML 요청에서는 다음을 제공합니다.

- `페이지를 찾을 수 없습니다` 404 페이지
- `일시적인 오류가 발생했습니다` 500 계열 안내 페이지
- 홈/무료 진단 CTA 제공
- 동일한 상단 메뉴·푸터·전역 디자인 시스템 적용
- request id 노출로 운영 추적 가능

### 4. 클라이언트 깨짐 감지 가드 추가

신규 파일: `shared/client-risk-guard.js`

- 정적 JS/CSS 로딩 실패 감지
- unhandled promise rejection 감지
- client runtime error 감지
- 사용자에게 하단 안내 배너 표시
- 기존 페이지 기능을 중단하지 않는 방식으로 작동

관련 스타일은 `shared/phase218-fresh-premium.css`에 추가했습니다.

### 5. SEO/title/테마 컬러 정합성 보정

`server/index.mjs`의 runtime `routeMeta`가 실제 public page title과 다르게 남아 있던 부분을 정리했습니다.

통일 기준:

- 홈: `NV0 / Veridion | AI 기반 웹사이트 신뢰 진단 & 전환 개선 플랫폼`
- 무료 진단: `무료 진단 | NV0 / Veridion`
- 상품·요금: `상품·요금 | NV0 / Veridion`
- 문서: `문서·작업지시서 생성 | NV0 / Veridion`
- 결제: `결제 확인 | NV0 / Veridion`

테마 컬러도 기존 어두운 `#0B0F14`에서 현재 디자인 시스템의 딥네이비 `#0B1D3A`로 맞췄습니다.

### 6. CTA 글 길이 설정 통일

runtime 기본 설정의 `ctaTargetLengthKo`가 일부 `3800-4500`으로 남아 있던 부분을 `4200-5200`으로 통일했습니다. PHASE217 전문가형 CTA 자동발행 기준과 일치합니다.

### 7. 신규 검증 게이트 추가

신규 테스트/검증 파일:

- `tests/phase223-global-risk-guard.mjs`
- `scripts/validate-phase223-global-risk-guard.mjs`

신규 package scripts:

```json
{
  "test:phase223": "node tests/phase223-global-risk-guard.mjs",
  "validate:phase223": "node scripts/validate-phase223-global-risk-guard.mjs",
  "phase223:final": "npm run phase222:final && npm run test:phase223 && npm run validate:phase223"
}
```

## 검증 결과

실행 명령:

```bash
npm run phase223:final
```

주요 결과:

- `check:syntax` PASS — 270개 소스 확인
- `check:pages` PASS — 34개 라우트 확인
- `test:routes` PASS — 24개 라우트 확인
- `check:links` PASS — 496개 링크 오류 0건
- `test:phase217` PASS — CTA 20분 주기 유지
- `validate:phase216` PASS
- `validate:phase218` PASS
- `validate:phase219` PASS
- `validate:phase220` PASS
- `validate:phase221` PASS
- `validate:phase222` PASS
- `test:phase223` PASS
- `validate:phase223` PASS — scoreAfterPatch 100

추가 로컬 서버 curl 확인:

- `/` 200 OK
- `/plans` 200 OK
- `/products/veridion/demo` 200 OK
- `/checkout` 200 OK
- `/not-existing` 404 HTML 오류 페이지 정상
- `/api/public/risk-guard` 200 OK
- `/readyz` 200 OK
- `/shared/client-risk-guard.js` 200 OK

브라우저 스크린샷 캡처는 실행 환경의 Chromium 네트워크 차단 정책으로 수행하지 못했습니다. 대신 로컬 서버 HTTP 응답, headers, HTML body, API payload 기준으로 검증했습니다.

## 배포 후 즉시 확인할 명령

```bash
curl -I -L --max-redirs 5 https://nv0.kr/
curl -I -L --max-redirs 5 https://www.nv0.kr/
curl -s https://www.nv0.kr/api/public/risk-guard
curl -s https://www.nv0.kr/readyz
```

정상 기준:

- `ERR_TOO_MANY_REDIRECTS` 없음
- `x-nv0-risk-guard: phase223-deployment-risk-guard-v1` 표시
- `/api/public/risk-guard`의 `ok`가 `true`
- 공개 푸터에 `replace-with-number` 노출 없음
- 없는 경로 접속 시 plain text가 아니라 정돈된 404 페이지 표시

## 남는 운영 주의사항

이 패키지는 코드·패키지 기준의 개선 완료본입니다. 실제 `nv0.kr`의 Cloudflare/Coolify redirect rule, 배포 캐시, 브라우저 쿠키, 이전 컨테이너 이미지는 패키지 밖 운영 설정입니다. 배포 후 Cloudflare Purge Everything과 Coolify redeploy가 필요합니다.

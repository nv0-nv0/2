# VERIDION 2.7.1 상용 최적화 WAVE 3 보고서

기준일: 2026-06-04  
릴리즈: `2.7.1-commercial-optimization`  
작업 범위: clean-rebase 이후 공개 UX, 캐시 안전성, 반복 요청 성능, 릴리즈 재현성, 운영 편의 보강

## 1. 핵심 판정

이번 WAVE는 운영 DB, 결제 데이터, 실제 production 환경변수를 변경하지 않는 저위험 상용 최적화다. 브라우저 캐시 식별자와 패키지 버전을 `2.7.1` 기준으로 정렬하고, production 공개 HTML 렌더링의 반복 디스크 읽기와 반복 변환 비용을 줄였다. 관리자 렌더 결과는 공개 페이지 캐시와 분리했다.

## 2. 반영 항목

1. `shared/release-version.mjs`를 추가해 패키지 버전과 자산 버전의 단일 기준을 만들었다.
2. 변경된 CSS·JS가 기존 `?v=2.7.0` 장기 캐시에 묶이지 않도록 모든 브라우저 자산 식별자를 `?v=2.7.1`로 올렸다.
3. production에서 HTML 원본 템플릿을 메모리에 캐시한다.
4. production에서 공개 페이지의 변환 완료 HTML을 경로별로 캐시한다.
5. 관리자 화면은 변환 완료 공개 페이지 캐시에 포함하지 않는다.
6. 공개 HTML에 ETag를 붙이고 `If-None-Match`가 일치하면 304를 반환한다.
7. 레거시 동적 삽입 자산도 중앙 버전 함수를 통해 버전 URL을 사용한다.
8. root Compose와 Coolify Compose의 버전 자산 기본 캐시를 60초에서 31,536,000초로 정렬했다.
9. `.env.example`, `.env.coolify.example`에 공개 HTML과 정적 자산 캐시 정책을 명시했다.
10. 성능 예산 검사를 자산 버전, CSS 총량, 최대 JS 크기, 캐시 계약까지 검증하도록 강화했다.
11. 보안 호스트 계약 테스트에 공개 HTML 캐시 hit, ETag 304, 버전 자산 immutable, 무버전 자산 재검증 검사를 추가했다.
12. 이전 WAVE의 route registry, 릴리즈 체크포인트 재개, 비밀번호 재설정 토큰 URL 제거, 포털 샘플 명확화, 월간 상품 수동 갱신 문구 정렬을 유지했다.

## 3. 자동 성능 계약 기준

- 개별 HTML: 180,000바이트 이하
- 개별 CSS: 220,000바이트 이하
- 개별 JS: 260,000바이트 이하
- 공개 공통·화면 CSS 총량: 140,000바이트 이하
- 최대 공개 JS: 120,000바이트 이하
- 모든 로컬 CSS·JS·MJS 참조: `?v=2.7.1`
- Coolify 버전 자산 기본 캐시: 31,536,000초 + `immutable`
- 공개 HTML: ETag 재검증 지원

## 4. production 적용 전 남은 확인

다음 항목은 운영 계정 또는 실제 배포 권한이 필요하므로 패키지에서 자동 적용하지 않았다.

1. Coolify staging 배포 후 외부 응답 헤더 확인
2. Cloudflare 캐시 HIT, 무효화, 새 자산 버전 반영 확인
3. PortOne 샌드박스 결제와 웹훅 중복·지연·재전송 검증
4. PostgreSQL, Redis, R2 실연결과 장애 주입 검증
5. SMTP 실발송 검증
6. 모바일 실기기, 키보드 전용, 스크린리더 수동 QA
7. 사업자 고지, 개인정보 처리 위탁, 환불 문구의 법률 검토

## 5. 롤백

DB 마이그레이션은 없다. 문제가 발생하면 직전 `2.7.0` 정리 후보 ZIP으로 교체하고 Cloudflare 캐시를 무효화한다. 브라우저 자산 식별자가 `2.7.1`로 분리되어 있으므로 자산 캐시 충돌 없이 되돌릴 수 있다.

## 레거시 문서 정리

- 반복 HOTFIX 문서 6개를 `docs/archive/hotfix/`로 이동했습니다.
- 과거 제어면 최종 보고서 3개를 `docs/archive/control-plane/`로 이동했습니다.
- 삭제 대신 보관소로 이동해 운영 문서 표면을 단순화하고 과거 추적성을 유지했습니다.

## 환경변수 템플릿 드리프트 방지

- 상용 템플릿 4종의 키 집합을 `deploy/env.commercial.template` 기준으로 강제 동기화합니다.
- `deploy/coolify.env.bulk.txt`는 Compose가 관리하는 DB 키 4개만 생략할 수 있습니다.
- `.env.coolify.example`은 부팅 최소 템플릿으로 분류하고, 버전 자산 캐시 1년 기본값을 계약으로 검증합니다.
- 릴리즈 게이트 식별자는 중앙 버전 레지스트리에서 생성해 이전 체크포인트와 새 후보가 섞이지 않도록 했다.
- 개발용 `.env.example`, 부팅 최소형, 상용 전체형, Coolify 일괄형의 목적을 구분해 불필요한 통합을 피했습니다.

## 공급망 재현성

- 직접 npm 의존성은 0개입니다.
- `package-lock.json`을 추가해 빈 의존성 상태도 명시적으로 고정했습니다.
- `npm audit --omit=dev`를 실제 실행했으며 취약점은 0개였습니다.
- clean baseline 계약에서 lockfile 버전, 패키지 버전 일치, 예상치 못한 의존성 추가 여부를 검사합니다.

## 로컬 production 크롤링 회귀 검사

- 정규 공개 경로 전체의 HTML 200 응답과 중복 ID 부재를 확인합니다.
- 과거·대체 주소의 301 canonical 이동을 확인합니다.
- 관리자 보호 경로가 세션 없이 게이트로 이동하는지 확인합니다.
- production 렌더 캐시 적중, HTML ETag 304, 버전 정적 자산 1년 immutable, 무버전 자산 재검증을 실제 로컬 서버에서 확인합니다.
- 로컬 반복 요청 p95는 운영 성능 보증값이 아니라 회귀 탐지용 지표로만 사용합니다.

## 공개 페이지 캐시 모듈 분리

- 공개 HTML 템플릿 캐시, 렌더 완료 페이지 캐시, HTML ETag 비교 로직을 `server/core/public-page-cache.mjs`로 분리했습니다.
- production에서는 반복 렌더 비용을 줄이고, 개발 모드에서는 파일을 다시 읽어 수정 반영성을 유지합니다.
- `tests/public-page-cache-contract.mjs`를 추가해 캐시 활성·비활성, clear, ETag 안정성, `If-None-Match` 목록·와일드카드를 검증합니다.

## 구조 부채 회귀 상한

- `server/index.mjs`는 아직 대형 모놀리스이므로 270KB·5,000줄을 초과하지 못하도록 상한을 걸었습니다.
- `shared/veridion-rebrand.css` 반복 선택자 191개, `apps/public/demo/app.css` 반복 선택자 106개를 현재 부채 기준선으로 기록했습니다.
- CSS 병합은 자동 적용하지 않았습니다. cascade 순서와 반응형 예외가 많아 staging 스크린샷 비교 후 별도 축소 WAVE에서 처리해야 합니다.
- 성능 예산 검사는 파일 크기뿐 아니라 구조 부채가 더 늘어나는 것도 차단합니다.

## 공개 텍스트 응답 압축

- 공개 HTML과 정적 CSS·JS·JSON·SVG·TXT에만 Brotli 우선, gzip 보조 압축을 적용했습니다.
- 인증·결제·개인정보가 섞일 수 있는 동적 JSON 응답은 압축 대상에서 제외했습니다.
- 압축 결과는 제한된 메모리 캐시로 재사용하며, `Vary: Accept-Encoding`을 설정합니다.
- 단위 계약과 로컬 production 크롤링에서 Brotli 응답을 확인합니다.

## 릴리즈 러너 종료 안정성

- 로컬 서버 기반 계약은 SIGTERM 후 실제 `exit` 이벤트를 기다리고, 800ms 후 SIGKILL로 승격합니다.
- 공개 API 격리 검사와 공개 상품 파이프라인 검사는 랜덤 로컬 포트를 사용해 이전 프로세스와 충돌하지 않도록 했습니다.
- 릴리즈 게이트 개별 단계의 기본 시간 제한을 60초로 낮춰 무한 대기를 차단했습니다.

## 비동기 릴리즈 게이트 러너

- 장시간 단일 게이트에서 동기식 `spawnSync`가 서버 기반 계약 뒤 정지할 수 있어 비동기 `spawn` 실행기로 교체했습니다.
- 각 단계의 stdout·stderr는 최근 12KB만 보관하고, 60초 초과 시 SIGTERM 후 SIGKILL로 승격합니다.
- 단계별 체크포인트 저장과 재개 기능은 유지됩니다.

## 릴리즈 게이트 구간 실행 오케스트레이터

- 기존 `npm run verify:release` 진입점은 유지한다.
- 내부적으로 기본 2단계 단위의 짧은 worker 프로세스를 실행하고 `docs/current/RELEASE_GATE_REPORT.json` 체크포인트에서 자동 재개한다.
- 각 구간은 종료 후 프로세스 자원을 반납하므로 장시간 연쇄 실행에서 발생하던 종료 누수와 정지 위험을 줄인다.
- 기본 실행은 `npm run verify:release`이다. 이전 실행이 `running`, `resuming`, `partial` 상태로 중단되면 같은 명령을 다시 실행할 때 체크포인트에서 자동 재개한다.
- 완전 초기화가 필요하면 `node scripts/run-release-gate.mjs --fresh`를 사용한다.
- `NV0_RELEASE_SEGMENT_SIZE`, `NV0_RELEASE_SEGMENT_TIMEOUT_MS`, `NV0_RELEASE_MAX_SEGMENTS`, `NV0_RELEASE_RESUME`으로 운영자가 세부 동작을 조정할 수 있다.
- worker 상세 출력은 내부 tail로만 수집하고 상위에는 구간 요약만 표시해 로그 역압을 줄인다.
- 각 검사 자식 프로세스는 독립 프로세스 그룹으로 실행하며 종료 시 잔여 스트림과 하위 프로세스를 정리한다.
- 검증 결과: 저장된 50단계 지점부터 자동 재개해 73/73 통과. 완전 초기화 재검증도 별도로 수행한다.

## 안전 ZIP 파일별 manifest 보강

- ZIP 체크섬 sidecar가 파일별 manifest 해시를 기록하면서 manifest 본체를 생성하지 않던 누락을 최종 무결성 검증에서 탐지했습니다.
- `scripts/create-secure-release.mjs`가 `${zipPath}.files-manifest`를 실제로 생성하도록 보강했습니다.
- `sha256sum -c VERIDION_NV0_COMMERCIAL_OPTIMIZED_CANDIDATE_20260604.zip.sha256.txt` 실행 시 ZIP 본체와 파일별 manifest가 모두 `OK`인지 확인합니다.
- 상용 정적 하드닝 계약에 manifest 파일 생성 구문을 추가해 재발을 차단합니다.

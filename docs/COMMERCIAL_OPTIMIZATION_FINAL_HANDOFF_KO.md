# VERIDION 2.7.1 상용 최적화 최종 인수 문서

기준일: 2026-06-04  
릴리즈: `2.7.1-commercial-optimization`  
판정: **로컬 패키지 상용 하드닝 완료 · staging 배포 후보 · production 전환은 외부 환경 인수 검사 후 승인**

## 1. 완료 범위

이번 최적화는 기존 clean-rebase 이후 남은 공개 UX, 캐시 안전성, 반복 요청 속도, 응답 전송량, 릴리즈 재현성, 공급망 감사, 환경변수 템플릿 드리프트, 문서 표면, 테스트 러너 안정성을 보강했다. 운영 DB, 실제 결제 계정, production 비밀정보, 운영 서버는 변경하지 않았다.

핵심 반영 내용:

1. `shared/release-version.mjs`를 추가해 package·자산 버전을 `2.7.1`로 중앙화했다.
2. 모든 공개 로컬 자산 URL을 `?v=2.7.1`로 정렬하고 버전 자산 캐시 기본값을 1년 immutable로 조정했다.
3. 공개 HTML 템플릿·렌더 결과 캐시를 `server/core/public-page-cache.mjs`로 분리했다.
4. 공개 HTML ETag와 `If-None-Match` 304 재검증을 추가했다.
5. 공개 HTML·정적 텍스트 자산에 Brotli 우선, gzip 보조 압축을 추가했다.
6. 인증·결제·개인정보가 섞일 수 있는 동적 JSON은 압축 대상에서 제외했다.
7. route registry, 공개 API 최소 응답, 비밀번호 재설정 URL 토큰 제거, 포털 샘플 상태 명확화, 수동 갱신 문구 정렬을 유지·재검증했다.
8. 상용 환경 템플릿 4종의 146개 키 동기화와 Coolify bulk 예외 4개를 계약으로 고정했다.
9. `package-lock.json`을 추가하고 빈 의존성 상태도 재현 가능하게 고정했다.
10. 반복 HOTFIX 문서 6개와 과거 제어면 문서 3개를 삭제하지 않고 archive로 이동했다.
11. 릴리즈 게이트를 2단계 worker 구간 실행 방식으로 바꾸고 체크포인트 자동 재개, 로그 tail 제한, 프로세스 그룹 정리를 추가했다.
12. 자동 재개는 72/73 partial 체크포인트를 만든 뒤 동일 `npm run verify:release` 재실행으로 73/73 복구되는 것을 확인했다.
13. 안전 ZIP 생성기는 ZIP SHA-256뿐 아니라 파일별 SHA manifest sidecar를 실제 파일로 생성하고, 체크섬 파일에서 두 항목을 모두 검증할 수 있도록 보강했다.

## 2. 성능 증거

로컬 production-mode 크롤링 기준이며 실서비스 네트워크 성능 보증값은 아니다.

| 항목 | 결과 |
|---|---:|
| 정규 공개 HTML 경로 | 26개 모두 200 |
| 과거·대체 주소 | 22개 모두 301 canonical 이동 |
| 관리자 보호 경로 | 11개 세션 없이 게이트 이동 |
| 반복 홈 요청 | 30회 cache hit |
| 반복 홈 요청 p50 | 0.819ms |
| 반복 홈 요청 p95 | 1.272ms |
| 반복 홈 요청 max | 1.353ms |
| 홈 HTML Brotli | 13,125B → 4,094B, 68.8% 감소 |
| 공통 런타임 JS Brotli | 4,724B → 1,413B, 70.1% 감소 |
| HTML ETag 재검증 | 304, body 0B |
| 압축 버전 자산 ETag 재검증 | 304, `Vary: Accept-Encoding` |

## 3. 최종 자동 검증

| 검증 | 결과 |
|---|---:|
| 릴리즈 게이트 | 73/73 통과, 실패 0 |
| 빠른 회귀 게이트 | 통과 |
| 소스 구문 검사 | 224개 통과 |
| UI 회귀 계약 | 864/864 통과 |
| Stitch experience pipeline | 10/10 통과 |
| E2E | 통과 |
| Smoke | 통과 |
| 상용 정적 하드닝 계약 | 153/153 통과 |
| 상용 런타임 하드닝 계약 | 26/26 통과 |
| 로컬 production 크롤링 | 14/14 통과 |
| 공개 페이지 캐시 단위 계약 | 8/8 통과 |
| 공개 응답 압축 단위 계약 | 8/8 통과 |
| 링크 검사 | 547개 오류 0 |
| 참조 무결성 | 통과 |
| 비밀정보 위생 | findings 0 |
| npm audit | 취약점 0 |
| clean baseline | 파일 349개·package script 70개 기준 통과 |
| 정적 재스캔 | 대상 322개, 빈 파일 0, 예상 밖 중복 0, 비밀정보 패턴 0 |

## 4. 성능·구조 회귀 상한

아직 자동 병합하지 않은 구조 부채는 수치 상한을 걸어 더 악화되지 않도록 했다.

| 항목 | 현재 | 상한 |
|---|---:|---:|
| `server/index.mjs` | 262,205B | 270,000B |
| `server/index.mjs` 줄 수 | 4,806 | 5,000 |
| 공개 CSS 총량 | 128,252B | 140,000B |
| 최대 공개 JS | 85,631B | 120,000B |
| 공통 rebrand CSS 반복 선택자 | 191 | 191 |
| 진단 CSS 반복 선택자 | 106 | 106 |

CSS 반복 선택자는 cascade와 반응형 예외가 많아 자동 병합하지 않았다. staging 스크린샷 비교를 붙인 별도 축소 WAVE에서 처리한다.

## 5. 실행 명령

```bash
npm run verify:quick
npm run verify:release
npm run deploy:precheck
npm run release:create -- --name VERIDION_NV0_COMMERCIAL_OPTIMIZED_CANDIDATE_20260604.zip
```

릴리즈 게이트가 외부 실행 제한이나 운영자 중단으로 `partial` 상태가 되면 동일 명령을 다시 실행한다.

```bash
npm run verify:release
```

기존 체크포인트를 무시하고 처음부터 재검증하려면 다음 명령을 사용한다.

```bash
node scripts/run-release-gate.mjs --fresh
```

## 6. production 적용 전 승인 대기

아래 항목은 패키지 내부에서 확인할 수 없다. staging 또는 실제 운영 계정이 필요하다.

1. Coolify staging 배포와 실제 환경변수 주입
2. PostgreSQL 과거 데이터 정제·마이그레이션 검토
3. Redis 장애 주입과 재연결
4. Cloudflare 캐시 HIT·무효화·`2.7.1` 자산 반영
5. PortOne 샌드박스 결제, webhook 중복·지연·재전송·멱등성
6. SMTP 실발송과 수신함 확인
7. R2/S3 업로드·다운로드와 권한 확인
8. HTTPS 도메인 쿠키·세션 유지
9. 운영 백업·복구 리허설
10. 모니터링·알림 수신
11. Chrome·Edge·Safari 데스크톱 시각 QA와 모바일 360·390·430px 실기기 QA
12. 키보드 전용·스크린리더 QA
13. 사업자 고지, 개인정보 처리 위탁, 환불·수동 갱신 문구의 법률 검토
14. 운영 진단 처리시간 p50·p95, 자동발행 20분 주기 2회 이상 관측

## 7. 롤백

DB 마이그레이션은 포함하지 않았다. staging에서 문제가 발생하면 직전 clean-rebase 후보 ZIP으로 교체하고 CDN 캐시를 무효화한다. 자산 식별자가 `2.7.1`로 분리되어 브라우저 장기 캐시 충돌을 피할 수 있다.

## 8. 최종 판단

- 로컬 패키지 품질: **상용 staging 인수 가능한 수준**
- production 배포: **보류**
- 보류 사유: 외부 계정·실서버·실브라우저·법률 검토는 접근 권한 없이 확인할 수 없음
- 다음 안전 작업: staging 배포 후 `docs/POST_DEPLOYMENT_ACCEPTANCE_KO.md` 순서대로 실환경 인수 검사

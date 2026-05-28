# VERIDION phase343 final-perfect closeout

VERIDION은 온라인 사업자의 공개 웹사이트를 기준으로 고객 신뢰·고지·환불·개인정보·전환 이슈를 진단하고, 무료 미리보기 → 유료 리포트 → 전문가 검토 → 고객 포털 관리로 이어지는 상용 진단 서비스 패키지입니다.

## 최종 실행

```bash
npm run phase343:final
```

`release:predeploy`와 `delivery:final`은 모두 `phase343:final`을 바라봅니다. 납품 전에는 아래 명령 중 하나만 실행해도 동일한 최종 게이트를 통과해야 합니다.

```bash
npm run release:predeploy
npm run delivery:final
./RUN_ALL_TESTS.sh
```

## 최종 게이트에 포함된 검증

- 구문 검사, 단위 테스트, E2E, route smoke, link check
- public page integrity, responsive contract, performance budget
- SSRF/CSRF/header/secret hygiene 보안 검증
- public API isolation live audit
- operational readiness contract
- runtime active state clean check
- Phase340/341/342/343 누적 validator

## public API 원칙

고객 public 화면과 public JSON에는 내부 엔진, hardening, release gate, 운영 queue, sentinel, rollback, prelaunch, admin hint가 노출되지 않아야 합니다. 운영·게이트·진단 엔진 상태는 고객 public API가 아니라 인증된 내부 운영 영역에서만 다룹니다.

## 운영 반영 후 필수 확인

1. 운영 환경변수 실제값 입력
2. `NV0_PAYMENT_REDIRECT_ALLOWED_HOSTS`에 실제 결제사/도메인 등록
3. PostgreSQL / Redis / Object Storage 운영 연결
4. `npm run release:predeploy`
5. CDN/브라우저 캐시 삭제
6. `/`, `/service`, `/solutions`, `/plans`, `/products/veridion/demo`, `/portal`, `/board`, `/insights`, `/checkout`, `/auth`, `/privacy`, `/refund`, `/business-info` 실화면 확인
7. PortOne 등 실제 결제 소액 결제, 웹훅, 산출물 다운로드 확인
8. 환불 요청/관리자 처리 확인
9. 모바일/브라우저별 화면 확인
10. 개인정보처리방침·약관·환불정책 법무 검토

패키지 내부 검증 점수와 실서버 운영 확인은 분리됩니다. 운영 도메인에서 live smoke와 결제 웹훅까지 통과해야 실제 배포 완료로 봅니다.

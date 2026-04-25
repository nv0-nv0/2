# Phase39 런칭 게이트 강화 보고서

## 처리 목적
Phase38까지의 운영 안정화 항목을 실제 오픈 직전 차단 게이트로 강화했다. 테스트 통과만으로는 실운영 준비를 보장하지 못하므로, 운영 환경변수·placeholder·SMTP·Turnstile·관리자 IP·미처리 환불·실패 이메일까지 한 번에 차단한다.

## 추가/수정 내용

1. 릴리즈 phase를 `phase39-launch-gate-hardening`으로 갱신
2. 운영 환경변수 placeholder 감지 함수 추가
3. `/api/public/launch-checklist` 추가
4. `/api/admin/launch-checklist` 추가
5. 상용 모드 필수 환경변수에 SMTP, Turnstile, 관리자 IP allowlist 포함
6. HTTPS 공개 URL 게이트 추가
7. SMTP 거래성 이메일 설정 게이트 추가
8. 미처리 환불 요청 차단 게이트 추가
9. 실패 이메일 차단 게이트 추가
10. Phase39 검증 스크립트 추가

## 운영자 확인 사항

- `.env`의 `replace-with-*`, `example.com`, `localhost`, `dummy`, `test_` 값은 상용 오픈 전 제거해야 한다.
- `NV0_SMTP_URL`은 실제 거래성 이메일 발송 계정으로 설정해야 한다.
- `NV0_ADMIN_IP_ALLOWLIST`는 실제 관리자 접속 IP 기준으로 설정해야 한다.
- `/api/admin/launch-checklist`가 200을 반환하기 전에는 유료 광고 집행과 본 오픈을 금지한다.

## 검증 명령

```bash
npm run check:syntax
npm run test:all
npm run validate:phase38
npm run validate:phase39
```

# Coolify TOTP 시크릿 preflight 정렬 핫픽스

## 증상

상용 prelaunch JSON에는 `errors: []`가 표시되지만, 서버 시작 직후 아래 오류로 컨테이너가 반복 종료될 수 있었습니다.

```text
NV0_ADMIN_TOTP_SECRET must be a finalized Base32 TOTP secret with at least 16 characters.
```

## 원인

기존 경량 preflight는 `NV0_ADMIN_TOTP_SECRET`의 존재 여부와 placeholder 여부만 검사했습니다. 서버 runtime 검증은 Base32 형식과 최소 길이까지 검사했습니다. 따라서 형식이 잘못된 값이 경량 preflight를 지나 서버 시작 시점에 차단될 수 있었습니다.

## 보강

- `scripts/check-commercial-totp-preflight.mjs`를 추가했습니다.
- 상용 컨테이너 엔트리포인트가 서버 시작 전에 전용 TOTP 검증을 항상 실행합니다.
- 실제 시크릿 값은 로그에 출력하지 않습니다.
- MVP 모드에는 개입하지 않습니다.
- 기존 MFA fail-closed 핫픽스 파일은 변경하지 않았습니다.

## 운영 복구

로컬 안전 환경에서 아래 명령으로 상용 시크릿 묶음을 생성합니다.

```sh
npm run secrets:generate
```

출력 중 `NV0_ADMIN_TOTP_SECRET=` 값만 Coolify의 동일 이름 Runtime Variable에 저장하고 Redeploy 합니다. 시크릿 값은 채팅, 이슈, 로그, 스크린샷에 붙여넣지 않습니다.

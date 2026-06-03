# Commercial runtime startup preflight 보강

## 목적
TOTP 검증 다음 단계에서 `NV0_SESSION_SECRET` 등 다른 필수 설정 오류가 서버 import 이후에 발견되어 컨테이너가 반복 종료되는 문제를 차단한다.

## 동작
- 상용 프로필은 서버 import 전에 `scripts/check-commercial-runtime-startup-preflight.mjs`를 실행한다.
- prelaunch에서 필수 설정이 잘못되면 애플리케이션 트래픽을 열지 않고 안전 설정 대기 모드로 들어간다.
- commercial_launch에서는 기존 fail-closed 종료를 유지한다.
- 로그에는 문제가 된 환경변수 이름과 복구 방향만 표시하고 실제 시크릿은 출력하지 않는다.

## 로컬 일괄 생성
```sh
npm run secrets:generate
```

출력되는 보안값은 Coolify Runtime Variable에 저장하고 채팅·로그·스크린샷에 노출하지 않는다.

## TOTP 등록을 유지한 채 나머지 핵심값 일괄 생성
Windows에서는 아래 파일을 실행한다.

```text
tools/RUN_COPY_REMAINING_CORE_SECRETS_FOR_DEVELOPER_VIEW.bat
```

이 도우미는 기존 `NV0_ADMIN_TOTP_SECRET`을 변경하지 않고 나머지 핵심 시크릿과 내부 PostgreSQL·Redis 연결값만 클립보드에 복사한다.

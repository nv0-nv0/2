# TOTP prelaunch 안전 대기 모드

## 목적

상용 prelaunch 환경에서 `NV0_ADMIN_TOTP_SECRET`이 비어 있거나 TOTP Base32 형식이 아니면 애플리케이션을 시작하지 않습니다. 기존처럼 짧은 주기로 종료·재시작하며 로그를 반복하지 않고, 트래픽을 제공하지 않는 안전 대기 모드로 유지합니다.

## 보안 원칙

- 관리자 MFA를 우회하지 않습니다.
- 잘못된 일반 API 키를 TOTP 키로 변환하지 않습니다.
- 실제 시크릿을 로그에 출력하지 않습니다.
- 정상 Base32 값을 Coolify Runtime Variable에 저장하고 Redeploy해야만 애플리케이션이 시작됩니다.

## 자동 동작

`NV0_TOTP_PREFLIGHT_FAILURE_MODE=auto`가 기본값입니다.

- `prelaunch`이며 `NV0_COMMERCIAL_LAUNCH_READY=false`: 안전 대기 모드
- `commercial_launch` 또는 엄격 운영 단계: 실패 후 종료

## 안전 진단

컨테이너 Terminal에서 다음 명령을 실행하면 실제 값을 출력하지 않고 상태만 확인할 수 있습니다.

```sh
node scripts/diagnose-admin-totp-env.mjs
```

출력에는 값 존재 여부, 길이, Base32 적합성, 입력 실수 유형만 포함됩니다.

## 로컬 생성

Coolify Normal View의 Value 칸에는 다음 도구로 복사한 원시 Base32 값만 넣습니다.

```text
tools/RUN_COPY_TOTP_FOR_NORMAL_VIEW.bat
```

Developer View에 한 줄을 붙여넣을 때만 아래 도구를 사용합니다.

```text
tools/RUN_COPY_TOTP_FOR_DEVELOPER_VIEW.bat
```

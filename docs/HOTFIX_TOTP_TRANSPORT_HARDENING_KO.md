# TOTP 입력 전달 경로 하드닝

## 원인

TOTP용 Base32 키가 아니라 다른 애플리케이션 시크릿을 `NV0_ADMIN_TOTP_SECRET`에 넣으면 상용 게이트가 차단합니다. Base32 허용 문자는 `A-Z`, `2-7`, 선택적 패딩 `=`입니다.

## 안전한 자동 보정

엔트리포인트는 동일한 Base32 값을 보존하는 전달 형식 오류만 자동 보정합니다.

- `NV0_ADMIN_TOTP_SECRET=...` 전체 줄을 Value 칸에 붙여넣은 경우
- 앞뒤 따옴표
- 공백, 줄바꿈, 시각적 구분용 하이픈
- 소문자

다른 종류의 랜덤 시크릿을 Base32로 임의 변환하지 않습니다. OTP 앱과 서버가 다른 값을 사용하게 되는 잠금 사고를 막기 위해서입니다.

## Normal View 권장 절차

`tools/RUN_COPY_TOTP_FOR_NORMAL_VIEW.bat`를 실행하면 Coolify Normal View의 Value 칸에 붙여넣을 원시 Base32 값만 클립보드에 복사합니다.

## Developer View 절차

`tools/RUN_COPY_TOTP_FOR_DEVELOPER_VIEW.bat`를 실행하면 `NV0_ADMIN_TOTP_SECRET=...` 한 줄을 클립보드에 복사합니다.

## 실패 루프 완화

잘못된 값이면 애플리케이션은 실행되지 않습니다. 다만 기본 15초 대기 후 종료해 재시작 루프의 로그 압력을 줄입니다.

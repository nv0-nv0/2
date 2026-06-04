# VERIDION v2.7 Coolify MFA Preflight 복구 핫픽스

## 증상

Coolify 배포 로그에서 아래 오류가 반복되며 컨테이너가 재시작됩니다.

```text
NV0_ADMIN_MFA_REQUIRED must be true for commercial deployments
```

`prelaunch`에서 통신판매업 신고번호가 비어 있다는 경고는 실결제가 비활성화된 상태에서는 정상입니다.

## 원인

상용 프로필은 관리자 계정 RBAC와 TOTP MFA를 필수로 요구합니다. 기존 boot-safe Compose 두 파일은 Coolify 환경변수 `NV0_ADMIN_MFA_REQUIRED`가 누락됐을 때 `false`를 기본값으로 전달했습니다. 따라서 운영 화면에서 해당 환경변수가 누락되면 preflight가 보안상 정상적으로 배포를 차단하지만, 누락을 복구하기 전까지 재시작 루프가 발생할 수 있었습니다.

## 반영 내용

- `/docker-compose.yml`: `NV0_ADMIN_MFA_REQUIRED` 기본값을 `true`로 변경
- `/deploy/docker-compose.coolify.yml`: `NV0_ADMIN_MFA_REQUIRED` 기본값을 `true`로 변경
- `/scripts/validate-coolify-env-detection.mjs`: 두 boot-safe Compose의 MFA fail-closed 기본값 회귀 검사 추가
- `/scripts/preflight.mjs`: Coolify 환경변수 수정과 재배포가 필요하다는 실행형 오류 메시지 추가
- `/deploy/COOLIFY_R2_DEPLOYMENT_RUNBOOK_KO.md`: commercial prelaunch 복구 절차와 신고번호 경고의 의미 보강

## Coolify에서 즉시 적용할 값

Coolify 프로젝트의 Environment Variables에서 아래 값을 저장하고 재배포합니다.

```env
NV0_ADMIN_MFA_REQUIRED=true
```

이미 설정된 실제 `NV0_ADMIN_TOTP_SECRET`은 유지합니다. 아직 통신판매업 신고번호가 발급되지 않았다면 아래 상태를 유지합니다.

```env
NV0_DEPLOYMENT_STAGE=prelaunch
NV0_COMMERCIAL_LAUNCH_READY=false
NV0_PAYMENT_PROVIDER=disabled
```

## 검증

패키지 기준 `npm run verify:release` 통합 릴리즈 게이트를 실행해 59개 단계 전체 통과를 확인했습니다. 실제 Coolify 운영 환경변수 저장과 라이브 재배포는 운영 화면에서 별도로 수행해야 합니다.

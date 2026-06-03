# VERIDION v2.7 Coolify MFA stale-value 런타임 자동 복구

## 증상

Coolify 배포 로그에서 아래 오류가 반복된다.

```text
NV0_ADMIN_MFA_REQUIRED must be true for commercial deployments
```

## 원인

Compose 기본값은 이미 `true`지만, Coolify Environment Variables에 과거 `NV0_ADMIN_MFA_REQUIRED=false`가 명시적으로 저장돼 있으면 외부 값이 우선한다. 단순 재시작만으로는 저장된 값이 바뀌지 않는다.

## 적용한 보강

`deploy/entrypoint.sh`는 `NV0_PLATFORM_TARGET=commercial`일 때 MFA 값이 누락되거나 `true`가 아니면 컨테이너 내부에서 아래처럼 fail-closed 정규화한다.

```env
NV0_ADMIN_MFA_REQUIRED=true
NV0_ADMIN_MFA_RECOVERY_NORMALIZED=true
```

이 처리는 MFA를 끄는 우회가 아니라 상용 보안 정책을 강제하는 복구층이다. 실제 TOTP 시크릿이 비어 있거나 placeholder면 preflight는 계속 차단한다.

## Coolify에서 반드시 저장할 값

Environment Variables에서 중복 값을 제거하고 아래 값을 하나만 남긴다.

```env
NV0_ADMIN_MFA_REQUIRED=true
NV0_ADMIN_TOTP_SECRET=실제_BASE32_TOTP_시크릿
NV0_DEPLOYMENT_STAGE=prelaunch
NV0_COMMERCIAL_LAUNCH_READY=false
NV0_PAYMENT_PROVIDER=disabled
```

저장 후 단순 Restart가 아니라 Redeploy를 실행한다. 경고가 계속 나오면 Coolify Terminal에서 아래처럼 런타임 값을 확인한다.

```sh
printenv NV0_ADMIN_MFA_REQUIRED
printenv NV0_ADMIN_MFA_RECOVERY_NORMALIZED
node scripts/preflight.mjs
```

정상 결과는 첫 번째 값이 `true`이고, preflight의 `errors` 배열이 비어 있는 상태다. 통신판매업 신고번호 경고는 prelaunch에서 결제가 비활성화돼 있으면 부팅을 차단하지 않는다.

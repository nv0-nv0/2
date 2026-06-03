# VERIDION 시스템 제어면 운영 체크리스트

## 배포 직후

- [ ] Coolify 환경변수와 상용 startup preflight를 확인했습니다.
- [ ] `/healthz`, `/readyz` 응답을 확인했습니다.
- [ ] 관리자 MFA 로그인을 확인했습니다.
- [ ] 관리자 콘솔의 시스템 제어면 카드가 표시됩니다.
- [ ] `/api/admin/system-control-plane/audit`가 100점을 반환합니다.
- [ ] P0 파이프라인에 차단 상태가 없습니다.

## 장애 기록

- [ ] 파이프라인을 선택했습니다.
- [ ] 상태를 `observing`, `degraded`, `blocked` 중 하나로 선택했습니다.
- [ ] correlation ID에 배포 ID 또는 사고 ID를 입력했습니다.
- [ ] 메모에 실제 시크릿, 비밀번호, 토큰을 입력하지 않았습니다.
- [ ] 필요한 경우 `hold`, `review`, `rollback`, `redeploy` 조치를 기록했습니다.

## 복구 확인

- [ ] 원인 제거 후 같은 파이프라인에 `recovered` 또는 `healthy` 이벤트를 기록했습니다.
- [ ] 후속 파이프라인의 차단 전파가 해소됐습니다.
- [ ] 공개 고객 흐름과 관리자 흐름을 다시 확인했습니다.
- [ ] 실결제 활성화 전에는 `NV0_PAYMENT_PROVIDER=disabled`를 유지했습니다.

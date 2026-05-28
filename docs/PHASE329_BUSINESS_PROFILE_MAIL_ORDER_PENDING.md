# PHASE329 — NV0 사업자 정보 반영 및 통신판매업 신고번호 보류 게이트

## 적용 시나리오

Coolify 환경변수에는 아래 사업자 정보가 이미 입력되어 있고, `NV0_MAIL_ORDER_REGISTRATION_NUMBER`만 아직 미입력인 상태를 기준으로 복구했습니다.

```env
NV0_BUSINESS_TRADE_NAME=엔브이제로(NV0)
NV0_BUSINESS_REPRESENTATIVE=나금상
NV0_BUSINESS_REGISTRATION_NUMBER=584-77-00586
NV0_BUSINESS_ADDRESS=경기도 남양주시 와부읍 덕소로97번길 34, 105동 402호(덕소주공아파트 1단지)
NV0_MAIL_ORDER_REGISTRATION_NUMBER=
```

## 게이트 정책

- `prelaunch`: 위 사업자 정보가 입력되어 있으면 서버 부팅을 허용합니다.
- `prelaunch`: 통신판매업 신고번호가 비어 있으면 warning만 출력합니다.
- `commercial_launch`: 통신판매업 신고번호가 비어 있으면 계속 차단합니다.
- `commercial_launch`: PortOne 실결제, Turnstile, 통신판매업 신고번호가 모두 준비된 경우에만 정식 오픈 게이트를 통과합니다.

## 공개 화면 처리

- `/business-info` 정적 fallback에 실제 사업자등록증 기준 정보를 반영했습니다.
- 런타임에서는 환경변수 기준으로 `/business-info` 본문을 보정합니다.
- 통신판매업 신고번호가 없을 때는 공개 화면에 임의 번호나 placeholder를 노출하지 않습니다.

## 검증 명령

```bash
npm run validate:phase329
npm run phase329:final
```

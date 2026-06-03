# VERIDION 실서버 상용 전환 인수 검사

로컬 릴리즈 게이트 통과와 실제 운영 전환은 구분한다. 다음 순서로 실서버를 확인한다.

## 1. prelaunch 배포

```env
NV0_PLATFORM_TARGET=commercial
NV0_DEPLOYMENT_STAGE=prelaunch
NV0_COMMERCIAL_LAUNCH_READY=false
NV0_PAYMENT_PROVIDER=disabled
NV0_ADMIN_MFA_REQUIRED=true
```

필수 확인:

- `/healthz` HTTP 200
- `/readyz` HTTP 200
- 관리자 로그인에서 실제 TOTP 인증 성공
- 관리자 로그인 실패 제한 작동
- PostgreSQL 연결 및 재시작 후 데이터 유지
- Redis 세션·rate limit·lock 연결
- R2 업로드·다운로드
- SMTP 테스트 메일 수신
- 공개 무료 진단 fallback 동작
- 모바일 360px, 390px, 430px 육안 확인
- Chrome, Edge, Safari 육안 확인

## 2. 결제 전환 승인

통신판매업 신고번호, PortOne 키, 웹훅 시크릿, Turnstile 키를 입력한다.

```env
NV0_MAIL_ORDER_REGISTRATION_NUMBER=실제값
NV0_ENABLE_TURNSTILE=true
NV0_PAYMENT_PROVIDER=portone_v2
NV0_PORTONE_WEBHOOK_VERIFY_MODE=strict
NV0_PAYMENT_REDIRECT_ALLOWED_HOSTS=nv0.kr,www.nv0.kr
```

샌드박스 결제에서 주문 생성, 결제 승인, 웹훅 수신, 중복 웹훅 멱등성, 산출물 생성, 포털 조회, 환불 요청 흐름을 확인한다.

## 3. commercial_launch 전환

```env
NV0_DEPLOYMENT_STAGE=commercial_launch
NV0_COMMERCIAL_LAUNCH_READY=true
NV0_HEALTHZ_STRICT=true
NV0_DEPLOYMENT_RISK_STRICT=true
```

확인 후 Cloudflare 캐시를 무효화하고 `/healthz`, `/readyz`, 홈, 진단, 요금제, 결제, 포털, 관리자 화면을 다시 점검한다.

## 4. 복구 기준

다음 중 하나라도 발생하면 직전 이미지와 환경변수 스냅샷으로 롤백한다.

- `/healthz` 또는 `/readyz` 503 지속
- MFA 로그인 불가
- PostgreSQL 또는 Redis 연결 실패
- R2 산출물 업로드 실패
- 웹훅 서명 검증 실패
- 중복 주문 또는 결제 상태 불일치
- 공개 화면 핵심 CTA 작동 불가

# 실서비스 오픈 직전 외부환경 체크리스트

## 1. 도메인/SSL
- nv0.kr A 또는 CNAME 레코드가 운영 서버를 가리키는지 확인
- HTTPS 인증서 발급 및 자동 갱신 확인
- HTTP → HTTPS 리다이렉트 확인

## 2. Cloudflare
- 개발 중에는 HTML 캐시 우회 또는 짧은 TTL 적용
- 정적 파일만 immutable 캐시 적용
- 배포 후 Cache Purge 실행
- Security Level, WAF, Bot Fight Mode가 결제/관리자 흐름을 막지 않는지 확인

## 3. 운영 환경 변수
- NV0_PLATFORM_TARGET=commercial
- NV0_ADMIN_AUTH_MODE=account_rbac
- NV0_PAYMENT_PROVIDER=portone_v2
- NV0_PORTONE_WEBHOOK_VERIFY_MODE=strict
- demo/json/builtin 모드가 운영값에 남아있지 않은지 확인

## 4. 데이터 저장소
- Postgres 연결 확인
- Redis 세션 연결 확인
- S3 또는 MinIO 업로드/다운로드 확인
- 백업 생성 및 복구 리허설 1회 실행

## 5. 결제
- PortOne 실상점 키 적용
- 결제 승인 성공 확인
- 결제 실패/취소 확인
- 웹훅 서명 검증 확인
- 주문/fulfillment 생성 확인

## 6. 운영 안정성
- /healthz 200 확인
- /readyz 200 확인
- 관리자 로그인/CSRF 확인
- 24~72시간 로그/메모리/디스크 모니터링

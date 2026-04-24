# 외부 17단계 1장 실행 카드

목표: 내부 완성 패키지를 실운영으로 넘기는 데 필요한 외부 단계 17개를 **순서 + 명령 + 체크포인트**로 한 장에 정리한다.

## 준비물
- 도메인
- Contabo 서버 정보
- Cloudflare 계정
- Coolify 접속 정보
- 실결제 키
- 실스캔 엔진 키
- PostgreSQL 접속 정보

## 실행 순서

1. Contabo VPS 생성 및 SSH 보안 초기화  
   체크: `ssh` 접속 가능, 비밀번호 로그인 차단

2. Coolify 설치 및 관리자 계정 초기화  
   체크: Coolify 대시보드 로그인 가능

3. DNS 레코드 및 Cloudflare 프록시 연결  
   체크: `@`, `www` 모두 Proxied

4. Origin CA 설치 및 Full (strict) 적용  
   체크: HTTPS 접속, 인증서 정상

5. Cache Rules 적용  
   체크: 홈/가이드/문서/플랜 캐시 헤더 정상

6. Turnstile 실키 연결  
   체크: 공개 스캔 시 위젯 표시 및 검증 통과

7. Coolify 앱 생성  
   체크: 리포지토리/도커 설정 정상

8. 운영 환경변수 주입  
   체크: `validate:env` 기준 필수 키 충족

9. PostgreSQL 연결  
   체크: 앱 기동 후 저장/조회 정상

10. 실결제 공급자 연동  
    체크: 주문 → 외부 결제 세션 생성

11. 실스캔 엔진 연동  
    체크: `external_http` 공급자 응답 정상

12. Cloudflare Rate Limit 적용  
    체크: 과다 요청 시 차단

13. 배포 후 `healthz/readyz` 확인  
    체크: 200, runtimeWritable/설정 정상

14. 공개/관리 E2E 실도메인 검증  
    체크: 홈, 문서, 가이드, 결제, 포털, 관리자 로그인

15. 백업 스케줄러 등록  
    체크: 백업 파일 자동 생성

16. 운영 전환 및 컷오버  
    체크: 공개 트래픽 전환

17. 컷오버 후 24시간 모니터링  
    체크: 에러율/로그/주문/스캔/알림 이상 없음

## 즉시 실행 명령

```bash
cp deploy/external.cutover.env.example deploy/external.cutover.env
# 실제 값 입력 후
bash deploy/run-external-cutover.sh ./deploy/external.cutover.env
```

## 통과 기준
- `healthz` 200
- `readyz` 200
- 공개 퍼널 정상
- 관리자 로그인/설정 저장 정상
- 실결제/실스캔 공급자 응답 정상
- 백업 생성 정상
- 롤백 경로 확보

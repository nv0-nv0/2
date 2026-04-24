# NV0 / Veridion P0 실배포 실행 플레이북

## 목적
실서버 정보가 들어오면 바로 실행할 수 있도록, P0 8단계를 **서버 명령 / Coolify 입력 / Cloudflare 설정 / 검증 / 롤백** 단위로 고정한다.

## 상태 정의
- 실제 확인 완료
- 동작 확인 필요
- 검증 미완료
- 확인되지 않음

## P0-1. Contabo VPS 준비
### 입력
- 서버 공인 IP
- SSH 포트
- 운영 계정
- SSH 공개키

### 실행
1. Contabo Tokyo VPS 생성
2. Ubuntu LTS 선택
3. 고정 IP 확인
4. SSH 공개키 등록
5. 방화벽 정책 최소화

### 검증
- `ssh USER@SERVER_IP`
- `uname -a`
- `df -h`
- `free -m`

### 롤백 기준
- 디스크/메모리/네트워크 이상
- SSH 불안정

## P0-2. 서버 부트스트랩
### 실행
1. `scp deploy/contabo-bootstrap.sh USER@SERVER_IP:/tmp/`
2. `ssh USER@SERVER_IP 'chmod +x /tmp/contabo-bootstrap.sh && sudo /tmp/contabo-bootstrap.sh'`

### 검증
- Docker 설치
- 방화벽 활성화
- 시간대/기본 패키지 설치

## P0-3. Coolify 설치
### 실행
1. Coolify 공식 설치 절차 수행
2. 브라우저에서 대시보드 접속
3. 관리자 계정 설정

### 검증
- Coolify UI 접속
- 서버 연결 상태 green

## P0-4. Cloudflare DNS + SSL
### 실행
1. `nv0.kr` 존 추가
2. A 레코드 생성: `@`, `www`
3. 필요 시 `admin`, `demo` 서브도메인 생성
4. 프록시 활성화(orange cloud)
5. SSL/TLS = Full (strict)
6. Origin CA 발급 후 서버/앱 프록시에 설치
7. Always Use HTTPS, Automatic HTTPS Rewrites, TLS 1.3, HTTP/3 활성화

### 검증
- 브라우저에서 HTTPS 자물쇠
- 혼합 콘텐츠 없음

## P0-5. 앱 업로드/연결
### 실행
1. Git 저장소 연결 또는 ZIP 업로드
2. 브랜치: `release`
3. Build Pack: Dockerfile
4. Port: `3210`
5. Health Check Path: `/readyz`
6. Persistent storage 경로 연결

### 검증
- 빌드 성공
- 컨테이너 healthy

## P0-6. 운영 환경변수 입력
### 필수
- `NV0_ADMIN_KEY`
- `NV0_TRUST_PROXY_HEADERS=true`
- `NODE_ENV=production`
- `PORT=3210`
- 필요 시 Turnstile 키
- 필요 시 운영 도메인 origin 허용값

### 검증
- Coolify env 저장 후 재배포
- `/readyz` 200

## P0-7. 실배포 검증
### 실행
1. `NV0_BASE_URL=https://nv0.kr npm run verify:prod`
2. 브라우저 수동 점검
3. 관리자 게이트 확인
4. 관리자 세션 없는 콘솔 차단 확인

### 기대
- 홈 200
- demo 200
- admin 200
- admin/console 302 -> /admin
- healthz 200
- readyz 200

## P0-8. 컷오버
### 실행
1. DNS TTL 확인
2. 기존 서비스 유지 상태에서 새 서비스 점검
3. 컷오버 시점 기록
4. 컷오버 후 15분 집중 관찰
5. 24시간 모니터링

### 롤백 기준
- readyz 실패
- 관리자 인증 실패
- demo 제출 실패
- 5xx 급증

## 실배포 직후 10분 체크
- 홈 렌더 정상
- 관리자 흔적 공개 노출 0
- `/admin` 공란 게이트
- `/admin/console` 차단
- `/api/public/config` 응답 정상
- 캐시/보안 헤더 점검

## 실배포 직후 24시간 체크
- 백업 1회 성공
- 감사 로그 생성 확인
- 운영 리포트 생성 확인
- 오류 로그 폭증 없음
- 업로드/복원/발행 동작 이상 없음

# PHASE13 코드 내부 운영 최종 재검수·수정개선보완 보고서

생성일: 2026-04-24
대상: veridion_public_launch_phase12_final_hardened_20260424.zip
결과: 코드 내부 운영 관점 보강 완료

## 최종 판정

- 로컬 코드·런타임·배포 번들 기준: 상용 배포 후보 상태
- 실제 운영 확정 조건: 실서버 Docker build, Coolify 배포, 도메인/SSL/Cloudflare/외부 연동 실검증 필요

## 이번 보강 내역

1. PostgreSQL 결제 이벤트 영속화 SQL 오류 수정
   - payment_events INSERT 컬럼 수와 values 수 불일치 수정
   - 실제 PostgreSQL 운영 모드에서 결제 이벤트 저장 실패 가능성 제거

2. 상용 모드 기본 데이터 오염 방지
   - NV0_PLATFORM_TARGET=commercial 실행 시 데모 주문/구독/게시물/스캔/결제 이벤트/감사 로그가 기본값으로 주입되지 않도록 분리
   - 운영 DB가 비어 있어도 데모 데이터가 섞이지 않도록 강화

3. 관리자 정적 리소스 접근 제한
   - /apps/admin/gate/* 는 로그인 화면 구동에 필요한 범위만 허용
   - /apps/admin/* 나머지 리소스는 관리자 세션 없으면 403 처리
   - 관리자 앱 내부 JS/CSS/HTML 직접 노출 범위 축소

4. 공개 스캔 SSRF 방어 보강
   - localhost, 127.0.0.1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16, ::1, fc/fd/fe80 계열, .local, metadata.google.internal 차단
   - 공개 URL 스캔 기능이 내부망/메타데이터 엔드포인트를 직접 때리지 않도록 방어

5. 운영 설정값 숫자 검증 추가
   - PORT, 세션 TTL, 요청 바디 제한, 레이트리밋, 백업 보관 수, 감사 로그 보관 수, 스캔 캐시 TTL 범위 검증
   - 잘못된 환경변수로 인한 런타임 비정상 동작을 시작 단계에서 차단

6. 500 오류 응답 정보 노출 완화
   - 내부 예외 메시지를 그대로 클라이언트에 노출하지 않고 requestId 기반 일반 오류로 응답
   - 로그에는 requestId가 남아 운영자가 추적 가능

7. 서버 시작 실패 처리 강화
   - ensureRuntime/readDb/writeDb/bootstrap 단계 실패 시 명시적으로 로그 출력 후 종료
   - 반쯤 떠 있는 비정상 상태 방지

8. 런타임 리셋 자산 보완
   - runtime/data/db.seed.json 추가
   - npm run reset:demo 정상 동작 확인
   - 배포 패키지에 테스트 찌꺼기 없는 초기 db.json/sessions.json 포함

## 검증 결과

실행 완료:

- npm run test:all → PASS 20/20
- npm run validate:deploy → PASS
- npm run validate:commercial-runtime → PASS
- npm run validate:pipeline → PASS
- npm run validate:commercial → PASS
- npm run reset:demo → PASS

Docker CLI는 현재 작업 환경에 없어 실제 docker build는 수행하지 못했습니다.

## 운영 전 남은 외부 확인

- Coolify No Cache Build
- Docker 실제 빌드 성공 여부
- PostgreSQL schema.sql 적용 여부
- Redis 연결 여부
- S3/MinIO 업로드 권한
- PortOne 실제 결제/웹훅 서명 검증
- 외부 스캔 공급자 API 연결
- nv0.kr HTTPS, HSTS, Cloudflare 캐시 반영
- 관리자 로그인, 결제 생성, 웹훅 수신, 자료 업로드, 백업/복구 클릭 테스트

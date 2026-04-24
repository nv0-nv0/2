# 상용 하이브리드 전환 2차 즉시 실행 보고서

## 이번 턴에서 실제 반영한 항목

1. **관리자 인증 코어 분리**
   - `server/core/passwords.mjs` 추가
   - `server/core/admin-auth.mjs` 추가
   - 비밀번호 해시/검증(scrypt) 도입
   - 역할 카탈로그 및 권한 집합 계산 도입

2. **계정형 관리자 로그인(account_rbac) 골격 구현**
   - `NV0_ADMIN_AUTH_MODE=account_rbac` 지원
   - `NV0_BOOTSTRAP_ADMIN_EMAIL` / `NV0_BOOTSTRAP_ADMIN_PASSWORD` / `NV0_BOOTSTRAP_ADMIN_NAME` 기반 초기 관리자 자동 부트스트랩
   - 세션에 관리자 식별자, 이메일, 역할, 권한 저장
   - `/api/admin/session` 응답에 `adminUser` 포함
   - 로그인/로그아웃 시 `adminSessions` 영속 기록 반영

3. **데이터 모델 확장**
   - `adminUsers`
   - `adminRoleBindings`
   - `adminSessions`
   를 런타임 저장소 기본 스키마에 추가

4. **상용 정책 검증 강화**
   - `NV0_ADMIN_AUTH_MODE=account_rbac` 일 때 bootstrap 관리자 환경변수 강제
   - 상용 타깃에서 shared key로의 회귀를 더 어렵게 만듦

5. **운영 가시성 보강**
   - ops report에 adminUsers / adminRoleBindings / adminSessions 카운트 추가
   - 환경요약에 bootstrap 관리자 변수 존재 여부 노출

## 이번 단계에서 의도적으로 아직 남겨둔 것

- Postgres 저장소 전환
- Redis 세션/레이트리밋 전환
- S3 object storage 전환
- PortOne 실결제 어댑터
- 세분화된 API 권한 체크 미들웨어
- MFA

즉, 이번 단계는 **공용 키 -> 계정형 관리자 구조로 넘어가는 경계 고정**에 집중했습니다.

## 검증 결과

아래 검증을 재실행하여 통과 확인:

- `npm run test:e2e`
- `npm run test:session`
- `npm run test:runtime`
- `npm run test:providers`
- `npm run test:routes`
- `npm run test:contracts`
- `npm run test:security-stateful`
- `npm run smoke`

## 현재 의미

이제 백엔드 코어는 다음 단계에서 Postgres/Redis로 전환해도 **관리자 인증 도메인 자체를 다시 설계하지 않고** 저장소만 교체하는 형태로 갈 수 있습니다.

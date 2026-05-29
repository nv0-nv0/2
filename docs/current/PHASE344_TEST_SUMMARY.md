# PHASE344 216개 레드팀 개선 처리 보고서

- 생성 시각: 2026-05-28T14:33:12Z
- 상태: 실제 패키지 수정 완료 + 검증 완료
- 범위: 데모 서버 오류 복구, 운영 env 정합성, healthcheck, 프론트 오류 UX, 회귀 테스트, 배포 게이트
- 중요 한계: 실제 nv0.kr 운영 서버에는 이 패키지를 배포해야 반영됩니다. 이 저장소 수정만으로 운영 서버가 자동 변경되지는 않습니다.

## 핵심 변경

1. `/api/public/diagnose`는 외부 진단 provider 장애 시 `builtin_fallback` 결과를 반환합니다.
2. `localhost`, 사설 IP, metadata 계열 대상은 서버 500 대신 `completed_limited_blocked_target` 제한 결과를 반환합니다.
3. Docker/Coolify healthcheck는 HTTP status뿐 아니라 JSON `ok:true`까지 확인합니다.
4. `NV0_SCAN_PROVIDER_FALLBACK=false`가 무료 데모 장애로 이어지지 않도록 preflight/production validator가 차단합니다.
5. 데모 화면은 서버 장애 시에도 requestId/문의 코드와 로컬 안전 결과를 표시합니다.

## 변경 파일
- `server/index.mjs`
- `apps/public/demo/app.js`
- `apps/public/veridion-demo/app.js`
- `tests/diagnose-fallback.mjs`
- `package.json`
- `docker-compose.yml`
- `deploy/docker-compose.commercial.yml`
- `deploy/docker-compose.coolify.yml`
- `deploy/docker-compose.local-minio.yml`
- `deploy/env.commercial.template`
- `deploy/env.production.nv0.kr.ci-check.env`
- `scripts/preflight.mjs`
- `scripts/validate-prod-env.mjs`
- `scripts/generate-r2-coolify-env.mjs`
- `server/bootstrap/commercial-env.mjs`
- `server/config/validation.mjs`
- `server/core/admin-auth.mjs`
- `server/core/phase313-operations-governance.mjs`

## 216개 처리 내역

### DAPI. 데모/진단 API 복구성 — 18개
1. [DAPI] 외부 진단 provider 장애 시 public demo 강제 fallback — 처리 완료
2. [DAPI] provider 연결 거부/timeout/DNS 실패를 제한 결과로 전환 — 처리 완료
3. [DAPI] 사설 IP·localhost·metadata 계열 URL을 blocked_target_limited로 처리 — 처리 완료
4. [DAPI] blocked target을 500이 아닌 제한 진단 결과로 반환 — 처리 완료
5. [DAPI] upstreamProviderStatus.fallbackApplied 상태를 결과에 포함 — 처리 완료
6. [DAPI] resultStatus completed_limited_fallback 표준화 — 처리 완료
7. [DAPI] resultStatus completed_limited_blocked_target 추가 — 처리 완료
8. [DAPI] resultLimitNotice로 사용자 표시용 한계 고지 — 처리 완료
9. [DAPI] PUBLIC_DEMO_FORCE_SCAN_FALLBACK 운영 스위치 추가 — 처리 완료
10. [DAPI] SCAN_PROVIDER_FALLBACK=false일 때도 무료 데모 보호 — 처리 완료
11. [DAPI] 외부 provider 오류 메시지 내부 노출 축소 — 처리 완료
12. [DAPI] 내장 진단 fallback에서도 AI review 계층 유지 — 처리 완료
13. [DAPI] 대상 fetch soft-timeout 안전 요약 유지 — 처리 완료
14. [DAPI] fetch 실패 시 empty result 대신 보수 점수 반환 — 처리 완료
15. [DAPI] 진단 requestId 누락 시 uid 보정 — 처리 완료
16. [DAPI] legacy diagnostic start 호환 유지 — 처리 완료
17. [DAPI] 결과 저장/portal handoff 유지 — 처리 완료
18. [DAPI] 신규 회귀 테스트 tests/diagnose-fallback.mjs 추가 — 처리 완료

### ENV. 운영 환경변수/상용 게이트 정합성 — 26개
19. [ENV] NV0_SCAN_PROVIDER_FALLBACK=true 운영 기준 통일 — 처리 완료
20. [ENV] commercial env matrix의 관리자 키 이름을 BOOTSTRAP 기준으로 수정 — 처리 완료
21. [ENV] Turnstile SECRET/SECRET_KEY alias 허용 — 처리 완료
22. [ENV] admin email/password alias 허용 — 처리 완료
23. [ENV] preflight에서 fallback=false를 오류로 차단 — 처리 완료
24. [ENV] validate-prod-env에서 fallback=false를 오류로 차단 — 처리 완료
25. [ENV] CI production-shape env에 secure records key 추가 — 처리 완료
26. [ENV] CI production-shape env에 privacy hash key 추가 — 처리 완료
27. [ENV] CI production-shape env에 backup encryption secret 추가 — 처리 완료
28. [ENV] CI production-shape env에 backup encryption required 추가 — 처리 완료
29. [ENV] generate-r2-coolify-env fallback true로 변경 — 처리 완료
30. [ENV] env.commercial.template fallback true로 변경 — 처리 완료
31. [ENV] commercial prelaunch payment disabled 경계 유지 — 처리 완료
32. [ENV] commercial_launch portone_v2 경계 유지 — 처리 완료
33. [ENV] prelaunch missing business profile warning 유지 — 처리 완료
34. [ENV] commercial_launch missing business profile error 유지 — 처리 완료
35. [ENV] Turnstile enabled 시 alias 기반 검증 — 처리 완료
36. [ENV] bootstrap admin account env alias 지원 — 처리 완료
37. [ENV] commercial-env warnings에 scan fallback risk 추가 — 처리 완료
38. [ENV] commercial-env warnings에 turnstile secret missing 추가 — 처리 완료
39. [ENV] production validator output 안정화 — 처리 완료

전체 216개 처리표는 `docs/PHASE344_216_REDTEAM_REMEDIATION_REPORT.md`를 확인하세요.

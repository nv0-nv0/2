# PHASE169 데모·DevOps·운영성 보강

## 처리 항목

1. 상단 메뉴의 중복 CTA 제거: `무료 진단` 메뉴만 유지하고 우측 `진단 시작` 중복 버튼 제거.
2. 데모 실패 방어: 프리런치에서 외부 스캔 제공자가 실패해도 내장 엔진으로 자동 fallback.
3. Dockerfile 멀티 스테이지 적용: source/runtime 분리, non-root `nv0` 사용자, readyz 기반 healthcheck.
4. `.gitignore`/`.dockerignore` 보강: 실제 `.env`, runtime, uploads, reports, backups, node_modules 제외.
5. DB 스키마 버전 폴더 추가: `deploy/postgres/migrations/V001__initial_schema.sql` 기준화.
6. Compose healthcheck 강화: app은 `/readyz`, Postgres/Redis는 service_healthy 의존성 유지, Redis strict readiness ENV 추가.
7. SEO 메타 로직 유지/강화: 서버 라우트별 동적 meta/canonical/OG/JSON-LD 주입 구조 보존.
8. CI/CD 통합: syntax, test-all, routes, e2e, link, validation JSON, Docker build gate 추가.
9. 로그/모니터링 도입점 문서화: json-file rotation 유지, Sentry/ELK는 ENV 기반 확장 후보로 분리.
10. CTA 엔진 유연성: 코드형 조합 엔진 유지, 향후 Headless CMS 연동 후보를 문서화.
11. API 보안 강화 기반: host allowlist, request limit, CORS/JWT TTL ENV 자리 확보.
12. 문서 자동화: `docs/wiki/README_KO.md` 내부 위키 인덱스 추가.

## 운영 주의

- `NV0_SCAN_PROVIDER_FALLBACK=true` 권장. 외부 스캔 API 장애 시 무료 진단 UX가 죽지 않습니다.
- 개발 기간에는 `NV0_PUBLIC_ASSET_CACHE_SECONDS=60` 권장.
- 실서비스에서 `.env`는 절대 이미지/깃에 포함하지 않습니다.

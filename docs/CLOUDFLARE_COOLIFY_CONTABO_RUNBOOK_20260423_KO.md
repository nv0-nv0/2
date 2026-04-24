# Cloudflare + Coolify + Contabo Tokyo 운영 런북

## 목표
- 1인 운영 기준 최소 노동/최소 비용/최대 안정성 구조 확립

## 고정 구조
- 서버: Contabo Tokyo VPS 1대
- 배포: Coolify
- 앞단: Cloudflare Proxy
- 앱: Public / Admin / API 분리
- 저장: 현재 runtime 볼륨, 추후 Postgres 전환

## Cloudflare 필수 설정
### SSL/TLS
- Universal SSL: ON
- Encryption mode: Full (strict)
- Always Use HTTPS: ON
- Automatic HTTPS Rewrites: ON
- TLS 1.3: ON
- HTTP/3: ON

### 캐시
- `/apps/*`, `/shared/*`: 장기 캐시
- `/`: 짧은 캐시
- `/demo`, `/plans`, `/checkout`: 짧은 캐시
- `/admin*`: no-store
- `/api/*`: no-store

### 보안
- Bot Fight Mode: ON
- Turnstile: `/demo`, `/admin` 폼에 적용 예정
- Rate limit 우선 대상: `/api/admin/session`

## Coolify 설정
- Build Pack: Dockerfile 또는 Docker Compose
- Healthcheck URL: `/readyz`
- Environment:
  - `NV0_ADMIN_KEY`
  - `NV0_ADMIN_SESSION_TTL_MS`
  - `NV0_TRUST_PROXY_HEADERS=true`
  - `NODE_ENV=production`
- Persistent Volume: `/app/runtime`

## 배포 순서
1. Contabo VPS 생성
2. Docker 설치
3. Coolify 설치
4. GitHub 리포 연결
5. Environment 설정
6. Persistent Volume 연결
7. 도메인 연결
8. Cloudflare Proxy ON
9. Healthcheck 확인
10. E2E 확인

## 운영 점검 체크리스트
- `/healthz` 200
- `/readyz` 200
- 공개 홈에 `/admin` 흔적 없음
- `/admin` 게이트만 노출
- 잘못된 키 401
- 올바른 키 200 + HttpOnly 쿠키
- 로그아웃 후 `/admin/console` 302

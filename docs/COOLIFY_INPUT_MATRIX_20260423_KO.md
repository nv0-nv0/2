# Coolify 입력값 매트릭스 (2026-04-23)

## 1. 애플리케이션 기본
| 항목 | 값 | 상태 |
|---|---|---|
| Application Type | Docker Compose | 실제 확인 완료 |
| Compose File | `deploy/docker-compose.coolify.yml` | 실제 확인 완료 |
| Port | `3210` | 실제 확인 완료 |
| Health Check URL | `/readyz` | 실제 확인 완료 |
| Restart Policy | unless-stopped | 동작 확인 필요 |

## 2. 필수 환경변수
`deploy/env.production.template`를 그대로 복사한 뒤 아래 값만 실제 운영값으로 교체한다.

- `NV0_ADMIN_KEY` : 길고 임의성이 높은 관리자 키
- `NV0_ALLOWED_ADMIN_ORIGINS` : `nv0.kr,www.nv0.kr`
- `NV0_ENABLE_TURNSTILE` : 필요 시 `true`
- `NV0_TURNSTILE_SITE_KEY`, `NV0_TURNSTILE_SECRET` : Turnstile 실키

## 3. 볼륨
| 목적 | 컨테이너 경로 | 비고 |
|---|---|---|
| runtime data | `/app/runtime` | 실제 확인 완료 |

## 4. 배포 직후 확인
1. `/healthz` = 200
2. `/readyz` = 200
3. `/admin` = 키 게이트만 노출
4. `/admin/console` 비로그인 접근 차단
5. `npm run smoke` 기준 흐름 수동 재확인

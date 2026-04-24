# Cloudflare 입력값 매트릭스 (2026-04-23)

## DNS
| Type | Name | Target | Proxy | 상태 |
|---|---|---|---|---|
| A | `@` | Contabo 서버 IP | Proxied | 동작 확인 필요 |
| A | `www` | Contabo 서버 IP | Proxied | 동작 확인 필요 |

## SSL/TLS
| 항목 | 권장값 | 상태 |
|---|---|---|
| Encryption mode | Full (strict) | 동작 확인 필요 |
| Always Use HTTPS | On | 동작 확인 필요 |
| Automatic HTTPS Rewrites | On | 동작 확인 필요 |
| TLS 1.3 | On | 동작 확인 필요 |
| HTTP/3 | On | 동작 확인 필요 |

## Cache Rules
1. `/admin*` → Bypass cache
2. `/api/*` → Bypass cache
3. `/apps/*`, `/shared/*` → Cache 강화
4. `/runtime/uploads/*` → 필요 시 짧은 private 성격 유지

## Security
- Bot Fight Mode: On
- Turnstile: `/api/public/scan`, `/api/admin/session` 앞단 폼에 연결
- Rate Limit 우선순위 1: `/api/admin/session`

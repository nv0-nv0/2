# API 계약서 (2026-04-23)

## 목적
클린룸 패키지 기준 공개 앱 / 관리자 앱 / 운영 스크립트가 동일한 API 계약을 참조하도록 고정한다.

## 상태 요약
- 공개 API: 실제 확인 완료
- 관리자 API: 실제 확인 완료
- 헬스체크 API: 실제 확인 완료
- 외부 결제 API: 확인되지 않음
- 외부 스캔 엔진 API: 확인되지 않음

## 인증 원칙
- `/api/public/*`: 인증 없음
- `/api/admin/session`: 관리자 키 + 선택적 Turnstile
- `/api/admin/*`: 서버 세션 + HttpOnly 쿠키
- 관리자 쓰기 요청: `x-nv0-csrf` 필수

## 헬스체크
| 메서드 | 경로 | 설명 | 상태 |
|---|---|---|---|
| GET | `/healthz` | 프로세스 생존 | 실제 확인 완료 |
| GET | `/readyz` | 런타임 저장소/환경 준비 상태 | 실제 확인 완료 |

## 공개 API
| 메서드 | 경로 | 설명 | 주요 입력 | 주요 출력 | 상태 |
|---|---|---|---|---|---|
| GET | `/api/public/config` | Turnstile/공개 설정 조회 | 없음 | `turnstileEnabled`, `turnstileSiteKey` | 실제 확인 완료 |
| GET | `/api/public/health` | 공개 영역 상태 조회 | 없음 | `ok`, `area`, `time` | 실제 확인 완료 |
| POST | `/api/public/scan` | Veridion 스캔 요청 | `target`, `turnstileToken?` | `result` | 실제 확인 완료 |

### `/api/public/scan` 입력 규칙
- `target`은 `http://` 또는 `https://`로 시작해야 한다.
- Turnstile이 켜진 경우 `turnstileToken`이 필요하다.
- Rate limit 적용 대상이다.

## 관리자 세션 API
| 메서드 | 경로 | 설명 | 상태 |
|---|---|---|---|
| GET | `/api/admin/session` | 현재 세션 상태 / csrfToken 반환 | 실제 확인 완료 |
| POST | `/api/admin/session` | 관리자 로그인 | 실제 확인 완료 |
| POST | `/api/admin/logout` | 로그아웃 | 실제 확인 완료 |

## 관리자 운영 API
| 메서드 | 경로 | 설명 | 상태 |
|---|---|---|---|
| GET | `/api/admin/status` | 요약 상태 | 실제 확인 완료 |
| GET | `/api/admin/diagnostics` | 런타임/스토리지/감사로그 요약 | 실제 확인 완료 |
| GET | `/api/admin/audit-logs` | 감사로그 목록 | 실제 확인 완료 |
| GET | `/api/admin/ops-report` | 운영 리포트 즉시 조회 | 실제 확인 완료 |
| POST | `/api/admin/ops-report/run` | 운영 리포트 스냅샷 생성 | 실제 확인 완료 |
| POST | `/api/admin/maintenance/prune` | 백업/로그 정리 실행 | 실제 확인 완료 |

## 관리자 설정/발행 API
| 메서드 | 경로 | 설명 | 상태 |
|---|---|---|---|
| GET | `/api/admin/settings` | 설정 조회 | 실제 확인 완료 |
| POST | `/api/admin/settings` | 설정 저장 | 실제 확인 완료 |
| POST | `/api/admin/publications/publish-now` | 즉시 발행 | 실제 확인 완료 |
| POST | `/api/admin/publications/seed` | 시드 생성 | 실제 확인 완료 |

## 관리자 주문 API
| 메서드 | 경로 | 설명 | 상태 |
|---|---|---|---|
| GET | `/api/admin/orders` | 주문 목록 조회 | 실제 확인 완료 |
| POST | `/api/admin/orders/status` | 결제 상태 전환 | 실제 확인 완료 |
| POST | `/api/admin/orders/advance` | 다음 단계 진행 | 실제 확인 완료 |

## 관리자 자료실 API
| 메서드 | 경로 | 설명 | 상태 |
|---|---|---|---|
| GET | `/api/admin/library` | 자료 목록 조회 | 실제 확인 완료 |
| POST | `/api/admin/library/post` | 글 등록 | 실제 확인 완료 |
| POST | `/api/admin/library/upload` | 파일 업로드 | 실제 확인 완료 |

## 관리자 백업 API
| 메서드 | 경로 | 설명 | 상태 |
|---|---|---|---|
| GET | `/api/admin/backups` | 백업 목록 조회 | 실제 확인 완료 |
| POST | `/api/admin/backups/run` | 백업 생성 | 실제 확인 완료 |
| POST | `/api/admin/backups/restore` | 백업 복원 | 실제 확인 완료 |

## 공통 오류 규칙
| 코드 | 의미 |
|---|---|
| 400 | 입력값 오류 / Turnstile 검증 실패 |
| 401 | 인증 실패 |
| 403 | CSRF 실패 / 허용되지 않은 origin |
| 404 | 리소스 없음 |
| 413 | 요청 크기 초과 |
| 429 | rate limit 초과 |
| 500 | 서버 내부 오류 |

## 계약 변경 규칙
- 공개/관리 API 경로는 클린룸 라우팅 원칙을 깨지 않는 범위에서만 확장한다.
- 관리자 쓰기 API는 CSRF 없이 추가하지 않는다.
- 공개 홈에 관리자 흔적이 노출되는 변경은 금지한다.

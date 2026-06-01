# PHASE354 원자 보완 매트릭스

| ID | 영역 | 문제 | 처리 | 상태 |
| --- | --- | --- | --- | --- |
| P354-001 | 보안 | 공개 `/healthz`가 PID, Node 버전, 메모리, 내부 릴리즈 문자열을 노출 | 최소 liveness 응답으로 축소 | 완료 |
| P354-002 | 보안 | 공개 `/readyz`가 런타임 경로, 환경 누락 목록, 저장소 구조를 노출 | 최소 readiness 응답으로 축소 | 완료 |
| P354-003 | 보안 | `/readyz` 오류 응답이 내부 오류 문자열을 노출할 수 있음 | 외부에는 `not_ready` 상태만 반환하고 내부 로그에 원문 유지 | 완료 |
| P354-004 | 인증 | 상용 필수 `NV0_SESSION_SECRET`이 루트 예시에 없음 | 로컬 예시에 placeholder 추가 | 완료 |
| P354-005 | 인증 | 상용 필수 `NV0_SESSION_SECRET`이 Coolify·운영 템플릿에 없음 | 배포 예시와 CI shape 파일에 placeholder 추가 | 완료 |
| P354-006 | 인증 | 범용 시크릿 생성기가 세션 시크릿을 발급하지 않음 | `generate-commercial-secrets.mjs` 출력 추가 | 완료 |
| P354-007 | 인증 | R2 Coolify 환경 생성기가 세션 시크릿을 발급하지 않음 | 자동 생성값과 출력 라인 추가 | 완료 |
| P354-008 | 배포 | boot-safe Compose에서 내부 API 격리 스위치가 명시적으로 전달되지 않음 | `false` 기본 전달 | 완료 |
| P354-009 | 배포 | 결제 redirect allowlist가 Compose로 전달되지 않음 | Compose 전달값 추가 | 완료 |
| P354-010 | 배포 | 요청 timeout·본문 크기·로그 조절값이 Compose로 전달되지 않음 | 운영 조절값 전달 추가 | 완료 |
| P354-011 | 배포 | 진단 rate limit·관리자 인증 rate limit이 Compose로 전달되지 않음 | 운영 조절값 전달 추가 | 완료 |
| P354-012 | 배포 | 데이터 보존·삭제 유예·환불 기간·규칙 버전이 Compose로 전달되지 않음 | 운영 조절값 전달 추가 | 완료 |
| P354-013 | 배포 | AI 리뷰 provider·Gemini 옵션이 Compose로 전달되지 않음 | 선택형 전달값 추가 | 완료 |
| P354-014 | 형상관리 | `.gitignore`가 없어 `.env`, 활성 런타임, 업로드, 로그, ZIP 커밋 위험 | 안전한 제외 규칙 추가 | 완료 |
| P354-015 | QA | 공개 프로브 정보 최소화 회귀 테스트 부재 | `test:public-probe-minimal` 추가 | 완료 |
| P354-016 | QA | Compose 환경 전달 회귀 검사 부재 | `check:compose-env-forwarding` 추가 | 완료 |
| P354-017 | QA | 최신 릴리즈 게이트 연결 부재 | `phase354:final`, 별칭, 원클릭 진입점 갱신 | 완료 |
| P354-018 | QA | 구형 PHASE351 호환 검증기가 README와 원클릭 스크립트에서 `phase353:final`만 허용 | 최신 `phase354:final`도 허용하도록 전방 호환 계약 수정 | 완료 |


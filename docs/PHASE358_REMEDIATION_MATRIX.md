# PHASE358 보완 매트릭스

| ID | 등급 | 영역 | 문제 | 조치 | 상태 |
| --- | --- | --- | --- | --- | --- |
| P358-001 | BLOCKER | 배포 | prelaunch 템플릿 일부가 `portone_v2`를 활성화하여 preflight와 충돌 | prelaunch 템플릿은 `disabled`로 통일하고 상용 전환 시점에만 활성화 | 완료 |
| P358-002 | CRITICAL | 운영 | 상용 Compose가 Redis를 필수 의존성으로 선언하면서 앱 healthcheck는 `/healthz`만 확인 | strict Redis readiness 기본값 `true`, 앱 healthcheck `/readyz` 전환 | 완료 |
| P358-003 | CRITICAL | 보안 | 임의 `.env*` 파일이 커밋·빌드 컨텍스트·ZIP에 섞일 수 있음 | `.env.test` 예외 제거, secure release 동적 deny 규칙 추가 | 완료 |
| P358-004 | MAJOR | QA | 위 문제의 자동 회귀 검사가 없음 | PHASE358 계약·감사·최종 게이트 추가 | 완료 |
| P358-005 | CRITICAL | 보안 | secure release가 검사된 allowlist가 아니라 전체 디렉터리를 다시 압축 | 실제 ZIP 입력을 검증 완료 파일 목록으로 제한 | 완료 |

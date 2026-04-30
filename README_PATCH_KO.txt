# nv0 P145 패치 안내

이번 패치는 P144 이후 남은 /readyz 503 문제를 해결합니다.

증상:
- 서버는 정상 기동
- prelaunch 검증은 errors/warnings 없이 통과
- /readyz만 503 반복
- Redis request timeout 로그 발생

수정:
- prelaunch 단계에서는 /readyz가 Redis ping timeout 때문에 실패하지 않도록 변경
- Redis 상태는 advisory로 반환
- 정식 commercial launch 또는 NV0_READYZ_REDIS_STRICT=true 에서는 strict Redis ping 유지

적용:
1. 압축 해제
2. 프로젝트에 덮어쓰기
3. Coolify Reload Compose File
4. Save
5. Redeploy

주의:
- Postgres/Redis/runtime volume 삭제하지 마세요.
- prelaunch 모드를 유지하세요.

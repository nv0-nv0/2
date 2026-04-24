# PostgreSQL 컷오버 계획 (2026-04-23)

## 목적
현재 `runtime/data/db.json` 기반 저장소를 PostgreSQL 기반 영속 저장소로 옮길 때, 데이터 구조와 전환 절차를 사전에 고정한다.

## 현재 상태
- 현재 저장소: `runtime/data/db.json`
- 상태: 실제 확인 완료
- PostgreSQL 연결: 검증 미완료

## 전환이 필요한 이유
- 다중 요청 동시성 보강
- 데이터 무결성 향상
- 백업/복구 표준화
- 관리자 세션/감사로그/주문 상태 변경 추적 강화

## 제안 스키마
`deploy/postgres/schema.sql` 참조.

## 테이블 매핑
| JSON 키 | 대상 테이블 |
|---|---|
| settings | settings |
| orders | orders |
| publications | publications |
| library | library_items |
| scans | scans |
| auditLogs | audit_logs |
| sessions.json | admin_sessions |

## 컷오버 순서
1. PostgreSQL 인스턴스 생성
2. `schema.sql` 적용
3. 기존 `db.json`, `sessions.json` 백업 생성
4. 초기 데이터 1회 이관
5. 읽기 검증
6. 쓰기 검증
7. 백업 생성/복원 검증
8. 파일 저장 유지 여부 확정
9. runtime JSON read-only 또는 제거

## 검증 체크포인트
- 주문 수 일치
- 발행 수 일치
- 자료실 수 일치
- 최근 감사로그 수 일치
- 관리자 세션 로그인/로그아웃 동작
- 백업 후 복원 가능

## 롤백 기준
- 주문/설정 저장 실패
- 관리자 로그인 실패
- 감사로그 누락
- 복원 실패

## 롤백 절차
1. 앱 write 차단
2. PostgreSQL 사용 중단
3. 직전 `db.json` / `sessions.json` 복원
4. smoke / verify:security 재실행
5. 원인 분석 후 재시도

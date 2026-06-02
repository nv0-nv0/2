# PostgreSQL 스키마 버전 관리

운영 배포에서는 `schema.sql`을 직접 덮어쓰기보다 `deploy/postgres/migrations`의 버전 파일을 기준으로 이력을 관리합니다.

현재 패키지는 외부 의존성을 늘리지 않기 위해 PostgreSQL 공식 이미지의 `/docker-entrypoint-initdb.d` 초기화 규칙을 사용합니다.
운영 DB가 이미 생성된 이후의 변경은 다음 규칙을 따릅니다.

1. 새 변경은 `V002__description.sql`, `V003__description.sql`처럼 추가 파일로 작성합니다.
2. 기존 `V001__initial_schema.sql`은 수정하지 않습니다.
3. Flyway 또는 Prisma Migrate 도입 시에도 이 폴더를 기준 이력으로 삼습니다.
4. Coolify 신규 설치는 `docker-compose.yml`이 이 폴더를 자동 마운트합니다.

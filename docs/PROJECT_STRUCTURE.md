# VERIDION 프로젝트 구조 지도

이 문서는 PHASE357 기준 유지보수용 구조 지도입니다. 과거 PHASE 문서와 회귀 스크립트는 삭제하지 않고 원래 경로를 유지합니다.

```text
veridion/
├─ apps/
│  ├─ public/                 # 홈, 진단, 요금, 결제, 포털, 정책, 인사이트 공개 화면
│  └─ admin/                  # 콘솔, 진단, 게이트, 주문, 설정 등 관리자 화면
├─ server/
│  ├─ bootstrap/              # 상용 환경 부팅 설정
│  ├─ config/                 # 환경변수와 검증 규칙
│  ├─ core/                   # 진단·운영·TrustOps·품질 엔진
│  ├─ infrastructure/         # DB, Redis, 세션, 저장소, 결제 인프라 어댑터
│  ├─ middleware/             # 보안 미들웨어
│  ├─ routes/                 # public, account, payment, admin, ops API
│  ├─ services/               # 감사 로그, 관측성, 주문 이행, 진단 신뢰 서비스
│  └─ index.mjs               # 서버 진입점
├─ shared/                    # 공통 CSS, 공개·관리자 클라이언트 공통 모듈
├─ tests/                     # E2E, 결제, 보안, TrustOps, 공개 계약 통합 테스트
├─ scripts/                   # 검사, 릴리즈 게이트, 배포, 복구, 운영 스크립트
├─ deploy/                    # Compose, Coolify, 운영 환경 예시, 배포 안내
├─ runtime/
│  └─ data/db.seed.json       # 배송 허용 초기 seed. 활성 상태 파일은 배송 금지
├─ docs/
│  ├─ INDEX.md                # 문서 탐색 시작점
│  ├─ CURRENT_RELEASE.md      # 현재 릴리즈 요약
│  ├─ PROJECT_STRUCTURE.md    # 이 구조 지도
│  ├─ current/                # 자동 생성 검증 결과
│  └─ PHASE*.md               # 과거 개선·회귀 보존 기록
├─ .env.example               # 로컬 환경변수 예시
├─ .gitignore                 # 시크릿·활성 런타임·배송 산출물 제외
├─ docker-compose.yml         # boot-safe 기본 Compose
├─ package.json               # 알파벳 정렬된 실행 명령 목록
├─ README.md                  # 설치·실행·검증·롤백 시작점
└─ RUN_ALL_TESTS.sh           # 최신 전체 게이트 원클릭 실행
```

## 핵심 유지보수 명령

```bash
npm run help
npm run dev
npm run verify:quick
npm run verify:release
npm run runtime:clean
```

## 변경 시 주의 영역

| 영역 | 위험도 | 원칙 |
| --- | --- | --- |
| `runtime/data/` | 높음 | seed 외 활성 상태 파일을 배송 ZIP에 넣지 않음 |
| `runtime/uploads/` | 높음 | `NV0_RUNTIME_DIR` 외부 경로에서도 실제 `UPLOADS_DIR`과 제공 경로를 일치시킴 |
| `server/routes/public.mjs` | 높음 | 내부 운영 API를 고객 공개 경로에 노출하지 않음 |
| 결제 환경변수 | 높음 | redirect allowlist와 웹훅을 운영 도메인 기준으로 확인 |
| `docs/PHASE*.md` | 중간 | 회귀 검증 참조 가능성이 있으므로 임의 이동·삭제 금지 |
| `package.json` | 중간 | 최신 납품 별칭은 반드시 `phase358:final`을 가리킴 |

## PHASE358 상용 배포 무결성

- `scripts/check-phase358-commercial-deploy-integrity.mjs`
- `scripts/run-phase358-audit.mjs`
- `scripts/run-phase358-final.mjs`


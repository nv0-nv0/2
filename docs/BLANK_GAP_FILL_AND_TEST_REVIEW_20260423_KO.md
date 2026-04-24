# 빈칸 보강 및 테스트 리뷰 (2026-04-23)

## 실제로 찾은 내부 빈칸
1. `/documents` 공개 페이지 누락
2. 관리자 단축 경로(`/admin/publications`, `/admin/library`, `/admin/orders`, `/admin/settings`, `/admin/diagnostics`) 미노출
3. 자동수정 롤백 API 미노출
4. 규칙 저장 API 부재
5. 관리자 발행/자료실 화면이 입력 중심이라 기존 데이터 확인성이 낮음
6. `verify:prod` 검증 범위가 신규 공개 퍼널과 관리자 단축 경로를 충분히 보지 않음
7. `acceptance`의 `verify:prod`가 기존 3210 포트 프로세스를 재사용할 수 있어 로컬 환경에서 오판 가능

## 실제 반영 내용
- `/documents` 페이지 추가
  - `apps/public/documents/index.html`
  - `apps/public/documents/app.js`
  - `apps/public/documents/app.css`
- 관리자 단축 경로 alias 추가
  - `/admin/orders`
  - `/admin/publications`
  - `/admin/library`
  - `/admin/settings`
  - `/admin/diagnostics`
- 자동수정 롤백 API 추가
  - `POST /api/admin/auto-fix-jobs/rollback`
- 규칙 저장 API 추가
  - `POST /api/admin/rules`
- 관리자 화면 보강
  - 발행 목록 / 공개 콘텐츠 피드 표시
  - 자료실 목록 / 공개 반영 자료 표시
  - 주문·사이트 운영 화면에 자동수정 승인/롤백 버튼 연결
- 검증 하네스 보강
  - E2E에 `/documents`, `/guides`, 관리자 단축 페이지, 규칙 저장, 자동수정 롤백 추가
  - `verify:prod`에 `/documents`, `/guides`, `/plans`, `/checkout`, `/portal`, 관리자 단축 경로 추가
  - `acceptance`의 `verify:prod`를 별도 포트(3224)로 고정

## 테스트 리뷰
### 실제 확인 완료
- `npm run test:e2e`
- `npm run verify:prod` (`NV0_BASE_URL=http://127.0.0.1:3222 PORT=3222`)
- `npm run acceptance`

### 검증 범위 확대된 항목
- 공개 문서 생성 페이지
- 공개 가이드 페이지
- 관리자 발행/자료실/주문/진단/설정 단축 경로
- 자동수정 승인 후 롤백
- 규칙 저장
- 프로덕션 검증 하네스 신규 페이지 포함 여부

## 현재 판정
- 외부 연동 제외 내부 제품 보강: **실제 확인 완료**
- 로컬 acceptance 전체 통과: **실제 확인 완료**
- 외부 실서버/실도메인/실키 기반 전환: **동작 확인 필요**

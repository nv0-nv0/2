# Veridion 납품 메모 (2026-04-23)

## 이번 반영 핵심
- 공개 스캔을 실제 결과 구조로 확장
- 스캔 시 사이트/구독/지침/자동수정 대기/CTA 발행 동시 생성
- 관리자 허브를 1인 운영 KPI 중심으로 재구성
- 사이트 재스캔, 구독 업서트, 법령 업데이트 조회, 규칙 카탈로그, 자동수정 승인 API 추가
- 공개 포털에 공지/콘텐츠 피드 연결
- 시연용 시드 데이터 포함

## 핵심 엔드포인트
- `POST /api/public/scan`
- `GET /api/public/board`
- `GET /api/admin/status`
- `GET /api/admin/sites`
- `POST /api/admin/sites/rescan`
- `GET /api/admin/subscriptions`
- `POST /api/admin/subscriptions/upsert`
- `GET /api/admin/legal-updates`
- `GET /api/admin/rules`
- `GET /api/admin/auto-fix-jobs`
- `POST /api/admin/auto-fix-jobs/approve`
- `POST /api/admin/publications/cta-generate`

## 실행 및 검증
```bash
npm start
npm run smoke
npm run test:e2e
npm run test:session
```

## 포함된 시드 데이터
- 샘플 사이트 1건
- 샘플 스캔 1건
- 활성 구독 1건
- 대기 자동수정 1건
- 가이드 문서 1건
- 공지/CTA 게시물 각 1건

## 주의
- 현재 스캔 엔진은 원격 HTML 수집 + 규칙 기반 휴리스틱 1차 버전입니다.
- 실제 법률 자문 또는 기관 판정 대체 용도는 아니며, 운영용 예방 도구 기준입니다.
- 자동수정은 승인형 상태 관리까지 구현되어 있고, 실제 외부 CMS 반영은 후속 연동 범위입니다.


## 로컬 완성 선언 방법
```bash
npm run acceptance
```
- 전체 통과 시 `docs/LOCAL_ACCEPTANCE_SUMMARY_20260423.json` 생성
- 이후 `npm run package:prep` 상태가 유지되어 납품용 runtime 이 깨끗하게 정리됩니다.

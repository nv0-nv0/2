# nv0.kr 현재 상용 시스템 인수 문서

## 현재 기준

- 기준 패키지: `phase256-reglobal-audit-cleanup`
- 제품 축: 공개 웹사이트의 법률·규제·과태료 리스크 후보, 결제 전 고지, 환불·청약철회, 개인정보 안내, 표시·광고 문구 점검
- 결과 확인 방식: 이메일 발송 중심이 아니라 `/portal`의 내 사이트 관리·확인 기록 중심
- 게시판 운영 방식: 20분마다 1건을 실제 발행 상태로 저장하고 공개 API에서 조회
- 결제 방식: 외부 온라인 결제 연동 준비 상태. 실제 상점 키, PG 승인, 웹훅 시크릿은 운영 환경에서 확인 필요

## 필수 실행 명령

```bash
npm start
npm test
npm run phase256:final
```

## 주요 검증 명령

```bash
npm run check:syntax
npm run check:pages
npm run test:routes
npm run check:links -- --summary
npm run test:phase256
npm run validate:phase256
```

## 기능 유지 범위

다음 경로는 실행 기능에 필요하므로 정리 대상에서 제외했습니다.

- `apps/`
- `server/`
- `shared/`
- `scripts/`
- `tests/`
- `deploy/`
- `docs/current/`

## 정리 정책

이전 phase 보고서, 중복 README 패치 문서, 과거 manifest, 과거 checksum 파일은 납품 패키지에서 제외했습니다. 실행 코드와 현재 검증 스크립트는 유지했습니다.

## 배포 전 운영 확인

- 실제 도메인의 HTTPS 설정
- `NV0_PUBLIC_BASE_URL`
- 결제 제공자 환경변수
- 외부 결제 상점 키와 웹훅 시크릿
- 운영 DB/런타임 볼륨 권한
- 게시판 발행 데이터 저장 경로

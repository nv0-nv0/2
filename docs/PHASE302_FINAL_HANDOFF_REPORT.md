# VERIDION Phase302 Final Handoff Report

## 1. 현재 판단

Phase301 패키지는 내부 검증을 통과했지만, 최종 납품 표현에서 두 가지 오해 가능성이 남아 있었다.

1. 운영 매트릭스가 live 검증 0건이어도 98점으로 표시되어 실제 상용 오픈 완료처럼 보일 수 있었다.
2. CI 전용 S3/R2 더미 키가 `AKIA` 형태처럼 보여 외부 secret scanner에서 실제 AWS 키로 오탐될 수 있었다.

Phase302는 이 두 항목을 마감 보강 대상으로 확정하고, 상용화 전 패키지 검증과 실제 배포 후 go-live 검증을 명확히 분리했다.

## 2. 주요 변경

| 항목 | 변경 내용 | 이유 |
|---|---|---|
| 운영 점수 체계 | `packageScore`, `liveScore`, `goLiveScore` 분리 | 패키지 준비와 실제 운영 검증을 혼동하지 않게 하기 위함 |
| 운영 매트릭스 버전 | `phase302-final-delivery-ops-engine-v2.0.0` | Phase302 기준 반영 |
| CI 더미 키 | AWS 키처럼 보이는 `AKIA...` 문자열 제거 | secret scanner 오탐 방지 |
| secret hygiene 검사 | `scripts/check-release-secret-hygiene.mjs` 추가 | 실제 키/토큰 형태가 납품물에 포함되는 것을 차단 |
| 브랜드 잔여 정리 | Admin title, 발송 메일 subject, bootstrap admin name 일부 정리 | 사용자/운영자 노출 표기를 VERIDION으로 통일 |
| 배포 명령 분리 | `release:predeploy`, `release:postdeploy` 추가 | 로컬 검증과 라이브 검증의 책임 분리 |
| Phase302 게이트 | `validate-phase302-final-handoff.mjs` 추가 | Phase302 보강 항목을 자동 검증 |

## 3. 최종 구조 트리

```txt
project-root/
├─ apps/
│  ├─ public/
│  │  ├─ home/
│  │  ├─ veridion-demo/
│  │  ├─ plans/
│  │  ├─ checkout/
│  │  ├─ portal/
│  │  ├─ board/
│  │  ├─ privacy/
│  │  ├─ terms/
│  │  ├─ refund/
│  │  └─ business-info/
│  └─ admin/
├─ server/
│  ├─ index.mjs
│  ├─ routes/
│  ├─ core/
│  │  └─ final-delivery-ops-engine.mjs
│  ├─ infrastructure/
│  ├─ middleware/
│  └─ services/
├─ shared/
│  └─ product-catalog.mjs
├─ scripts/
│  ├─ check-release-secret-hygiene.mjs
│  ├─ validate-phase302-final-handoff.mjs
│  ├─ verify-prod.mjs
│  └─ validate-price-catalog.mjs
├─ deploy/
│  ├─ env.production.nv0.kr.example
│  └─ env.production.nv0.kr.ci-check.env
├─ docs/
│  ├─ PHASE300_STRUCTURE_TREE.md
│  ├─ PHASE301_FINAL_CLOSEOUT_REPORT.md
│  └─ PHASE302_FINAL_HANDOFF_REPORT.md
├─ runtime/
│  └─ data/
├─ tests/
├─ package.json
├─ RUN_ALL_TESTS.sh
└─ DELIVERY_README.txt
```

## 4. 실행 명령

### 배포 전 패키지 검증

```bash
npm run release:predeploy
```

### 배포 후 라이브 검증

```bash
npm run release:postdeploy
```

또는 명시적으로 다음을 실행한다.

```bash
NV0_BASE_URL=https://www.nv0.kr npm run verify:prod
npm run ops:production-matrix
```

## 5. 점수 기준

| 점수 | 의미 |
|---|---|
| packageScore | 패키지 내부 자동 검증 준비도 |
| liveScore | 실제 운영 환경에서 확인된 항목 비율 |
| goLiveScore | 패키지와 라이브 확인을 합산한 출시 판단 점수, 즉 go-live score |

Phase302 기본 패키지 상태에서는 다음이 정상이다.

```txt
packageScore: 100
goLiveScore: 70
finalJudgement: package-delivery-ready-live-verification-required
```

이는 패키지가 준비되었지만, 실제 nv0.kr 서버 배포·캐시 삭제·결제/메일/스토리지/스캔 공급자 검증 전까지는 `commercial-live-ready`로 판정하지 않는다는 뜻이다.

## 6. 남은 작업

- 실제 서버에 Phase302 패키지 배포
- 실제 `.env.production` 값 입력
- PortOne sandbox/production 결제 검증
- SMTP 실제 발송 검증
- R2/S3 업로드·다운로드 검증
- 외부 scan provider 응답 검증
- Turnstile 활성화 검증
- CDN/cache purge
- `release:postdeploy` 실행

## 7. 최종 판단

Phase302는 패키지 납품 기준으로는 마감 가능하다. 단, 실제 라이브 오픈 완료 판정은 배포 후 `release:postdeploy`가 통과해야 한다.

# PHASE151 NV0 제품 범위 재정렬 패치

## 목적

이번 P151은 프롬프트 개발 제품 방향을 폐기하고, nv0.kr 실제 서비스 개선 프로젝트에만 집중하도록 범위를 재정렬하는 패치입니다.

## 판단

P150에서 추가된 `prompt-directive` API와 모듈은 nv0 본제품의 핵심 목적과 맞지 않습니다.  
nv0의 현재 핵심은 다음입니다.

- 무료 사이트 진단
- VERIDION 데모/진단 화면
- 요금제/상품 비교
- CTA 자동 발행 게시판
- SEO/전환 흐름
- prelaunch 결제 게이트
- R2/Postgres/Redis 배포 안정성
- 관리자/운영 기능

## 처리 내용

- P150 `server/core/prompt-directive.mjs` 제외
- P150 `/api/public/prompt-directive` API 제외
- P150 검증 스크립트 및 문서 제외
- P149의 실제 nv0 제품 개선 상태를 유효 기준으로 복원
- 이미 P150을 적용한 경우 제거 가능한 cleanup script 제공

## 유지되는 이전 정상 패치

- P143 PostgreSQL schema bootstrap
- P144 `/readyz` host guard 수정
- P145 Redis prelaunch readiness 완화
- P146 CTA SEO 개선
- P147 사이트 QA/SEO 개선
- P148 무한 조합형 CTA 발행 엔진
- P149 메인 URL 입력창 제거, 데모 고착 방지, 요금제 JS 오류 수정

## 적용 기준

P150을 아직 배포하지 않았다면 P150은 무시하고 이 P151 전체 ZIP을 적용합니다.

P150을 이미 배포했다면 다음 순서로 처리합니다.

```bash
node scripts/remove-phase150-prompt-directive.mjs
node scripts/validate-phase151-nv0-product-focus.mjs
```

그 후 배포를 진행합니다.

## 금지

- prompt-directive API 재추가 금지
- 프롬프트 생성 제품 방향으로 확장 금지
- nv0 실제 진단/요금제/CTA/운영 기능 외 작업 확대 금지
- Postgres/Redis/runtime volume 삭제 금지

# Phase351 Prompt Full Sweep Closeout

최종 검증 명령: `npm run phase351:final`

배포 전 검증: `npm run release:predeploy`

운영 반영 후 확인: `NV0_LIVE_BASE_URL=https://www.nv0.kr npm run live:smoke`

# VERIDION phase350 global CTA semantics closeout

온라인 사업자 신뢰·준법·전환 진단 패키지입니다. phase350에서는 메인, 무료 진단, 인사이트, 로그인, 결제 전환의 진단 CTA 의미를 `사이트 무료 진단 실행`으로 통일했습니다.

## 최종 명령

```bash
npm run phase351:final
```

아래 명령도 모두 같은 최종 게이트를 바라봅니다. release:predeploy, delivery:final, phase350:final 순서로 운영 전 검증을 맞춥니다.

```bash
npm run release:predeploy
npm run delivery:final
npm run phase351:final
./RUN_ALL_TESTS.sh
```

## 핵심 완료 사항

- 무료 진단 API fallback과 provider 장애 복구 유지
- 메인/진단 페이지 단일 진단 엔진 유지
- 결과 생성 전 후속 버튼 숨김/비활성 정책 유지
- 전역 공개 페이지 진단 CTA 문구 통일
- 버튼 대비, 반응형, 보안, 배포, 링크, route smoke 누적 게이트 유지
- phase350 전역 CTA semantics 검증 추가

## 운영 반영 후 확인

```bash
NV0_LIVE_BASE_URL=https://www.nv0.kr npm run live:smoke
```

운영 서버에 직접 배포되었는지는 이 패키지 안에서 확정할 수 없습니다. 이 정보는 확인되지 않았습니다.

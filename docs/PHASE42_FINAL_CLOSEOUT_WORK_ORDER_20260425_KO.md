# Phase42 최종 마감 작업 지시서

## 목표
Phase41 이후 남은 마지막 운영 마감 요소를 정리하여, 배포 직전 검수 명령이 중간에 멈추거나 결과 파일이 누락되는 문제까지 차단한다.

## 남은 요소 재산정
- 중분류: 4개
- 세부 항목: 14개
- 코드 패키지 차단 항목: 0개 목표

## 작업 범위
1. 최종 검수 러너 안정화
   - 각 검증 단계별 timeout 적용
   - 실패 지점 즉시 기록
   - `docs/PHASE42_FINAL_REVIEW_SUMMARY_20260425.json` 산출

2. Phase42 릴리즈 마커 반영
   - package version 업데이트
   - server release phase 업데이트
   - 이전 Phase37~41 검증과 호환 유지

3. 상용화 핵심 게이트 유지 검증
   - final gate
   - launch checklist
   - webhook strict gate
   - SMTP false-success 차단
   - 관리자 IP allowlist
   - private route noindex

4. 인수인계 문서 보강
   - 최종 명령어: `npm run final:review`
   - 운영 환경값은 실제 사업자/호스팅/결제/메일 값으로 교체 후 배포

## 완료 기준
- `npm run final:review` 통과
- `npm run validate:phase42` 통과
- ZIP 무결성 확인

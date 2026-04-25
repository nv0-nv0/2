# NV0 Veridion Phase41 상용화 잔여 요소 정밀 작업 지시서

## 1. 재산정 결과

Phase40 기준 잔여 요소는 코드 기능보다 운영 컷오버 게이트에 집중되어 있다.

- 잔여 중분류: 7개
- 잔여 세부 항목: 26개
- 즉시 코드 반영 대상: 6개 중분류 / 18개 세부 항목
- 외부 실계정 확인 대상: 1개 중분류 / 8개 세부 항목

## 2. 잔여 중분류 7개

1. 운영 환경변수 실값 검증 강화
2. 사업자/통신판매/고객지원 고지 필수 게이트
3. 결제 완료 주문과 산출물 발행 정합성 검증
4. 결제 웹훅 미처리 상태 차단
5. 거래성 이메일 큐의 허위 성공 처리 제거
6. 최종 상용화 게이트 API 추가
7. 외부 실계정 확인: PortOne 실결제, SMTP 실제 도착, Cloudflare/Coolify 배포 반영

## 3. 적용 지시

- NODE_ENV=production, NV0_PLATFORM_TARGET=commercial 조합에서는 필수 사업자 고지값, SMTP URL, 관리자 IP allowlist, HTTPS 공개 URL이 없으면 서버가 시작되지 않아야 한다.
- 결제 완료 주문 중 산출물이 없는 항목은 런칭 가능 상태로 판단하면 안 된다.
- 웹훅 inbox에 processed/ignored/failed 외 상태가 남아 있으면 런칭 가능 상태로 판단하면 안 된다.
- SMTP URL 누락 상태를 sent로 처리하지 않는다.
- public/admin final gate API를 추가하여 컷오버 직전 자동 확인이 가능해야 한다.

## 4. 완료 기준

- npm run validate:phase41 통과
- npm run final:review 통과
- /api/public/commercial-final-gate 200 또는 503으로 명확한 런칭 가능/차단 사유 반환
- /api/admin/commercial-final-gate에서 상세 차단 사유 확인 가능

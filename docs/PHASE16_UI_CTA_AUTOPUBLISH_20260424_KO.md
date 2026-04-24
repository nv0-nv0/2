# Phase16 UI/CTA 자동발행 보강 내역

## 반영 사항
- 공개 화면 상단 우측 메뉴 추가: 무료진단, 요금제, CTA 게시판, 고객포털, 가이드, 문의
- 데모 결과 노출량 축소: 무료 데모는 위험도/예상 과태료/상위 3개 항목만 표시
- 유료 플랜 차별화 강화: Free/Basic/Pro/Auto 기능 차등 표시
- CTA 게시판 추가: `/board`
- CTA 자동발행 서버 스케줄 추가: 기본 2시간 주기
- 자동발행 환경변수 추가: `NV0_CTA_AUTOPUBLISH_INTERVAL_MS`
- 문의 메일 기본값 및 화면 표기 변경: `ct@nv0.kr`
- 전체 색감 보강: 어두운 네이비 기반, 민트 포인트, 카드 그림자/라운딩 개선

## 배포 후 확인
1. `/` 상단 메뉴 노출 확인
2. `/products/veridion/demo` 결과가 간략하게 표시되는지 확인
3. `/plans`에서 무료/유료 기능 차이가 보이는지 확인
4. `/board` CTA 게시판 접근 확인
5. 서버 재시작 후 자동 CTA 게시글이 1개 이상 생성되는지 확인

## 운영 주기
기본 자동발행 주기: 2시간

변경하려면 Coolify 환경변수에 아래 값을 추가합니다.

```env
NV0_CTA_AUTOPUBLISH_INTERVAL_MS=7200000
NV0_SUPPORT_EMAIL=ct@nv0.kr
```

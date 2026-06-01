# VERIDION 현재 릴리즈

## 기준 버전

`1.0.16-commercial-phase355-organization-closeout`

## 한 줄 설명

온라인 사업자의 공개 웹페이지를 기준으로 신뢰·준법·전환 요소를 진단하고, 결과 저장·리포트·고객 포털 흐름으로 연결하는 VERIDION 패키지입니다.

## 사용자 실행 경로

```text
홈
→ 서비스 설명 확인
→ /products/veridion/demo 진입
→ URL 입력 및 무료 진단
→ 보완 후보 확인
→ 요금·도입 흐름
→ 고객 포털
```

## 유지보수 진입점

```bash
npm run help
npm run verify:quick
npm run verify:release
npm run release:predeploy
```

## 운영 반영 전 남은 수동 확인

실제 운영 서버, DNS, Coolify 환경변수, Docker 컨테이너, 결제 웹훅, 사업자 공개 정보는 배포 환경에서 확인합니다. 로컬 자동 검증만으로 운영 반영 완료라고 판단하지 않습니다.

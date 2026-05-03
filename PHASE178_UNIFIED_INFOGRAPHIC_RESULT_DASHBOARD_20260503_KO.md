# PHASE178 통합 인포그래픽 결과 대시보드 적용

## 적용 목적
- 데모 결과 화면을 이미지 시안 수준의 인포그래픽 대시보드로 실제 패키지에 반영
- 자주 발생하던 응답 시간 초과 체감 오류를 줄이기 위해 클라이언트 대기시간을 30초로 상향
- 실패 화면도 원인/다음 조치 중심의 대시보드형 오류 카드로 교체
- 내 사이트 관리(포털) 화면의 최근 진단 요약 카드도 동일 디자인 언어로 정리

## 수정 파일
- apps/public/veridion-demo/app.js
- apps/public/veridion-demo/app.css
- apps/public/portal/app.js
- apps/public/portal/app.css

## 핵심 변경
1. 결과 화면을 카드/게이지/위험 영역/확인 요소/수동 확인/즉시 조치형 인포그래픽으로 재구성
2. 상단 결과 요약을 처리 로그 중심이 아니라 발견 결과 중심으로 교체
3. 자주 보이던 timeout 오류 화면을 행동 유도형 오류 카드로 교체
4. `/api/public/diagnose` 프런트엔드 timeout 15초 → 30초 조정
5. 포털의 최근 진단 요약도 동일한 어두운 대시보드 계열 UI로 통일

## 검증
- node --check apps/public/veridion-demo/app.js
- node --check apps/public/portal/app.js

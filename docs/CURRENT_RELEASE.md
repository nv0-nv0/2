# VERIDION 현재 릴리즈

## 기준 버전

`1.0.20-commercial-phase357-global-qa-accessibility-closeout-csp-visual-integrity-patch-phase358-commercial-deploy-integrity-closeout`

## 한 줄 설명

온라인 사업자의 공개 웹페이지를 기준으로 신뢰·준법·전환 요소를 진단하고, 결과 저장·유료 리포트·고객 포털 흐름으로 연결하는 VERIDION 패키지입니다.

## 사용자 실행 경로

```text
홈
→ 서비스 설명 확인
→ /products/veridion/demo 진입
→ URL 입력 및 무료 진단
→ 결제 전 위기도 대시보드 확인
→ 핵심 문제·영역별 위험·고객 여정 확인
→ 기본 리포트 또는 전문가 플랜 선택
→ 고객 포털
```

## 유지보수 진입점

```bash
npm run help
npm run verify:quick
npm run verify:release
npm run release:predeploy
```

## PHASE358 핵심 보강

- 관리자 7개 화면 본문 바로가기
- 무료 진단·결제 폼 키보드 Enter 실행
- 진단 결과 포커스 이동과 상태 live region
- 고객 포털 사이드 메뉴 접근 가능한 이름
- Coolify Compose 운영 조절값 전달 확대
- 운영 템플릿 핵심 키 정합성 검사
- PHASE357 전역 감사와 릴리즈 게이트
- 공개 진단 입력 단계의 루프백·사설 IP·메타데이터 주소 fail-closed 차단
- 외부 `NV0_RUNTIME_DIR` 업로드 저장·다운로드·재시작·복구 보장
- 독립 테스트 런타임 격리와 종료 정리
- seed 기반 clean delivery 인수 검증과 production-shape 환경 분리
- 엄격한 `style-src 'self'` CSP와 충돌하지 않는 클래스 기반 동적 시각화
- prelaunch 결제 공급자 `disabled` 정합화
- 상용 Compose Redis strict readiness 및 `/readyz` healthcheck
- 임의 `.env*` 커밋·빌드·ZIP 유출 방어

## 운영 반영 전 남은 수동 확인

실제 운영 서버, DNS, Coolify 환경변수, Docker 컨테이너, 결제 웹훅, 사업자 공개 정보는 배포 환경에서 확인합니다. 로컬 자동 검증만으로 운영 반영 완료라고 판단하지 않습니다.

## PHASE356 시각 검수 참조

- `docs/PHASE356_VISUAL_QA.md`
- `docs/design-reference/PHASE356_CONVERSION_DASHBOARD_DESKTOP.png`
- `docs/design-reference/PHASE356_CONVERSION_DASHBOARD_MOBILE.png`

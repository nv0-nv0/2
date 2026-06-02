# PHASE357 원자 보완 매트릭스

| 번호 | 영역 | 문제 또는 보완 대상 | 실제 처리 |
| ---: | --- | --- | --- |
| 1 | 관리자 접근성 | console 본문 바로가기 누락 | 추가 |
| 2 | 관리자 접근성 | diagnostics 본문 바로가기 누락 | 추가 |
| 3 | 관리자 접근성 | gate 본문 바로가기 누락 | 추가 |
| 4 | 관리자 접근성 | library 본문 바로가기 누락 | 추가 |
| 5 | 관리자 접근성 | orders 본문 바로가기 누락 | 추가 |
| 6 | 관리자 접근성 | publications 본문 바로가기 누락 | 추가 |
| 7 | 관리자 접근성 | settings 본문 바로가기 누락 | 추가 |
| 8 | 무료 진단 | 기본 진단 화면에서 Enter 실행 불가 | submit 흐름으로 수정 |
| 9 | 무료 진단 | 별칭 진단 화면에서 Enter 실행 불가 | submit 흐름으로 수정 |
| 10 | 무료 진단 | submit과 click 이중 실행 가능성 | 직접 click listener 제거 |
| 11 | 무료 진단 | 결과 표시 후 키보드 포커스가 입력부에 잔류 | 결과 영역 포커스 이동 추가 |
| 12 | 무료 진단 | 결과·진행 상태 보조기기 전달 부족 | live region 보강 |
| 13 | 무료 진단 | 최근 기록이 없어도 비우기 버튼 노출 | 데이터 존재 시에만 표시 |
| 14 | 결제 | Enter 키로 결제 준비 실행 불가 | submit 버튼으로 변경 |
| 15 | 결제 | 폼 submit handler 누락 | submit handler 추가 |
| 16 | 결제 | 결제 상태 보조기기 전달 부족 | live region 보강 |
| 17 | 고객 포털 | 사이드 메뉴 접근 가능한 이름 누락 | aria-label 추가 |
| 18 | Compose | 빌드 버전 전달 누락 | 전달 추가 |
| 19 | Compose | 빌드 시각 전달 누락 | 전달 추가 |
| 20 | Compose | commit SHA 전달 누락 | 전달 추가 |
| 21 | Compose | release ID 전달 누락 | 전달 추가 |
| 22 | Compose | healthz strict 전달 누락 | 전달 추가 |
| 23 | Compose | readyz cache TTL 전달 누락 | 전달 추가 |
| 24 | Compose | scan soft timeout 전달 누락 | 전달 추가 |
| 25 | Compose | 공개 진단 fallback 스위치 전달 누락 | 전달 추가 |
| 26 | Compose | target fetch 최대 바이트 전달 누락 | 전달 추가 |
| 27 | Compose | target fetch 최대 redirect 전달 누락 | 전달 추가 |
| 28 | Compose | 외부 결제 provider URL 전달 누락 | 전달 추가 |
| 29 | Compose | 외부 결제 provider token 전달 누락 | 전달 추가 |
| 30 | Compose | 법적 근거 버전 전달 누락 | 전달 추가 |
| 31 | Compose | 개인정보 정책 버전 전달 누락 | 전달 추가 |
| 32 | Compose | 이용약관 버전 전달 누락 | 전달 추가 |
| 33 | Compose | 환불 정책 버전 전달 누락 | 전달 추가 |
| 34 | 템플릿 | Coolify 예시 핵심 키 누락 | 정합성 보강 |
| 35 | 템플릿 | Coolify 대량 입력 템플릿 핵심 키 누락 | 정합성 보강 |
| 36 | 템플릿 | 운영 템플릿 핵심 키 누락 | 정합성 보강 |
| 37 | 템플릿 | nv0.kr 운영 예시 핵심 키 누락 | 정합성 보강 |
| 38 | 템플릿 | 상용 템플릿 핵심 키 누락 | 정합성 보강 |
| 39 | QA | Compose 검사가 일부 키만 확인 | 검사 범위 확장 |
| 40 | QA | 접근성·키보드 전용 계약 누락 | PHASE357 계약 추가 |
| 41 | QA | 전역 인벤토리·정합성 감사 누락 | PHASE357 감사 추가 |
| 42 | 릴리즈 | 최신 최종 게이트 부재 | PHASE357 게이트 추가 |
| 43 | 릴리즈 | 납품·사전배포·검증 별칭 구형 게이트 참조 | PHASE357로 통일 |
| 44 | 실행 | 원클릭 스크립트 구형 게이트 참조 | PHASE357로 통일 |
| 45 | 문서 | README가 PHASE356 기준 | PHASE357 기준으로 갱신 |
| 46 | 문서 | CURRENT_RELEASE와 실행 도움말이 PHASE356 기준 | PHASE357 기준으로 갱신 |

| 47 | 보안 | 공개 진단 입력 단계에서 루프백·사설 IP가 즉시 거절되지 않음 | 입력 검증 단계에서 fail-closed 차단 |
| 48 | 보안 | localhost·.local·.internal·메타데이터 주소 차단 계약 부족 | 명시 차단 규칙 추가 |
| 49 | QA | SSRF 입력 차단 동적 회귀 테스트 부재 | 차단 9개·정상 공개 URL 1개 계약 추가 |
| 50 | QA | SSRF 계약이 최종 릴리즈 게이트에 연결되지 않음 | PHASE357 최종 게이트에 연결 |
| 51 | 테스트 격리 | 공개 API 격리 검사가 임시 런타임을 남김 | finally 정리 추가 |
| 52 | 테스트 격리 | 공개 제품 파이프라인 검사가 루트 runtime을 오염시킴 | 전용 임시 런타임으로 격리 |
| 53 | 테스트 격리 | 스모크 검사가 루트 runtime을 사용할 수 있음 | 전용 임시 런타임으로 격리 |
| 54 | 테스트 격리 | 스트레스 스모크가 임시 런타임을 남길 수 있음 | 전용 임시 런타임과 종료 정리 추가 |
| 55 | QA | 스트레스 스모크가 공개 차단 운영 API를 200 대상으로 검사 | 공개 200 부하 검사와 숨김 API 404 격리 검사로 분리 |
| 56 | 테스트 격리 | 유료 레드팀이 임시 런타임을 남길 수 있음 | finally 정리 추가 |
| 57 | 테스트 격리 | provider adapter 검사가 임시 런타임을 남길 수 있음 | finally 정리 추가 |
| 58 | 테스트 격리 | PortOne 이벤트 검사가 임시 런타임을 남길 수 있음 | finally 정리 추가 |
| 59 | QA | PortOne 이벤트 검사가 process.exit(0)로 assertion 실패를 숨길 수 있음 | 정상 종료·실패 전파 구조로 수정 |
| 60 | 테스트 격리 | PortOne provider 검사가 임시 런타임을 남길 수 있음 | finally 정리 추가 |
| 61 | QA | PortOne provider 검사가 process.exit(0)로 assertion 실패를 숨길 수 있음 | 정상 종료·실패 전파 구조로 수정 |
| 62 | 테스트 격리 | TrustOps 성장 검사 임시 런타임 정리 부족 | finally 정리 추가 |
| 63 | 테스트 격리 | TrustOps autopilot 검사 임시 런타임 정리 부족 | finally 정리 추가 |
| 64 | 테스트 격리 | TrustOps launch-control 검사 임시 런타임 정리 부족 | finally 정리 추가 |
| 65 | 테스트 격리 | TrustOps production-sentinel 검사 임시 런타임 정리 부족 | finally 정리 추가 |
| 66 | 테스트 격리 | TrustOps final-handoff 검사 임시 런타임 정리 부족 | finally 정리 추가 |
| 67 | 테스트 격리 | TrustOps 100-final 검사 임시 런타임 정리 부족 | finally 정리 추가 |
| 68 | 테스트 격리 | PostgreSQL prelaunch fallback 검사가 임시 런타임을 남길 수 있음 | 전용 임시 런타임과 종료 정리 추가 |
| 69 | QA | 테스트 런타임 오염 방지 회귀 계약 부재 | PHASE357 runtime-isolation 계약 추가 |
| 70 | 테스트 격리 | 과거 contracts fuzz가 루트 runtime을 사용할 수 있음 | 전용 임시 런타임과 종료 정리 추가 |
| 71 | QA | 과거 contracts fuzz가 최신 URL 정규화 정책과 충돌 | 현재 공개 URL 정책 기준으로 갱신 |
| 72 | 테스트 격리 | 세션 지속성 검사가 루트 runtime을 사용할 수 있음 | 전용 임시 런타임과 종료 정리 추가 |
| 73 | QA | 세션 지속성 검사가 삭제된 관리자 허브 문구를 강제 | 현재 보호 콘솔 안정 마커로 갱신 |
| 74 | 테스트 격리 | 런타임 백업·복구 검사가 루트 runtime을 사용할 수 있음 | 전용 임시 런타임과 종료 정리 추가 |
| 75 | 기능 결함 | NV0_RUNTIME_DIR 외부 설정 시 업로드 저장 후 다운로드가 404 | UPLOADS_DIR 기준 안전 제공 라우트로 수정 |
| 76 | 보안 | 업로드 제공 경로 변경 시 경로 이탈 방지 유지 필요 | 기존 안전 정적 파일 제공 함수와 category override 재사용 |
| 77 | 테스트 격리 | 상태 기반 보안 검사가 루트 runtime을 사용할 수 있음 | 전용 임시 런타임과 종료 정리 추가 |
| 78 | 테스트 격리 | verify-prod가 루트 runtime을 사용할 수 있음 | 전용 임시 런타임과 종료 정리 추가 |
| 79 | QA | verify-prod가 /demo 직접 200 렌더링을 강제 | 단일 진단 화면 301 리다이렉트를 정상으로 갱신 |
| 80 | QA | verify-prod가 과거 guides 문구를 강제 | 현재 개선 가이드 안정 마커로 갱신 |
| 81 | QA | verify-prod가 과거 privacy·terms·board 문구를 강제 | 현재 화면 안정 마커로 갱신 |
| 82 | QA | verify-prod가 과거 고객 포털 문구를 강제 | 현재 고객 포털 안정 마커로 갱신 |
| 83 | 데이터 안전 | 데이터 무결성 검사가 활성 DB 배송을 강제 | clean delivery seed 기반 검증으로 수정 |
| 84 | 데이터 안전 | seed 래퍼 구조를 활성 DB와 동일하게 가정 | seed payload 구조 인식형 검증으로 수정 |
| 85 | 실행 격리 | reset:demo가 루트 runtime을 건드릴 수 있음 | NV0_RUNTIME_DIR을 존중하도록 수정 |
| 86 | 환경변수 | 로컬 .env.example과 상용 템플릿 역할이 혼합됨 | 로컬 개발 예시와 commercial shape 검증 분리 |
| 87 | 문서 | 인수 러너가 삭제된 과거 인수인계 문서를 강제 | 현재 문서 인덱스·릴리즈·구조 지도로 갱신 |
| 88 | 문서 | docs/INDEX.md 일부가 PHASE355를 최신으로 안내 | PHASE357 기준으로 정렬 |
| 89 | 문서 | docs/PROJECT_STRUCTURE.md 일부가 PHASE356 별칭을 안내 | PHASE357 기준으로 정렬 |
| 90 | 배포 검증 | preflight가 공통 로컬 환경으로만 실행됨 | 환경 파일 인자를 받아 production-shape 검증 가능하도록 수정 |
| 91 | 배포 검증 | 인수 러너가 로컬 기능 테스트와 production-shape 테스트를 혼합 | 단계별 환경을 분리 |
| 92 | 배포 검증 | 인수 러너의 NV0_ADMIN_KEY가 production shape 단계에 상속 | 상용 shape 단계에서 명시적으로 비움 |
| 93 | 인수 테스트 | acceptance 러너가 활성 DB·세션 배송을 강제 | seed 기반 clean delivery 인수 기준으로 수정 |
| 94 | 인수 테스트 | acceptance 러너가 임시 런타임을 정리하지 않을 수 있음 | 전용 런타임과 종료 정리 추가 |
| 95 | 인수 테스트 | acceptance 보고서가 과거 경로만 사용 | current/PHASE357 보고서와 legacy 사본 병행 저장 |
| 96 | 인수 테스트 | acceptance 통과 수량이 종료 정리 단계를 반영하지 않음 | 28/28 통계 구조로 수정 |
| 97 | QA | diagnose fallback이 사설 입력 fail-closed를 고정하지 않음 | 회귀 계약 보강 |
| 98 | QA | unified diagnosis 구형 계약이 submit 버튼 개선과 충돌 | 최신 키보드 submit 흐름으로 갱신 |
| 99 | QA | PHASE353 감사기가 PHASE357 RUN_ALL_TESTS·README를 허용하지 않음 | 전방 호환 계약 갱신 |
| 100 | QA | PHASE354·355·356 감사 일부가 PHASE357 롤백·별칭을 허용하지 않음 | 전방 호환 계약 갱신 |
| 101 | 문서 | PHASE357 추가 보안·격리·인수 보완 이력 누락 | 보완 매트릭스와 closeout 갱신 |

| 102 | UI/보안 | 엄격한 CSP가 무료 진단 진행 막대의 동적 `style=` 폭을 차단할 수 있음 | 클래스 기반 폭 유틸리티로 교체 |
| 103 | UI/보안 | 위기도 원형 그래프와 영역별 막대가 CSP 인라인 스타일 차단 영향을 받을 수 있음 | 0~100 구간 클래스 기반 CSS 변수로 교체 |
| 104 | 보안 | 화면 복구를 위해 `unsafe-inline`을 허용하면 CSP가 약화됨 | CSP 완화 없이 시각화 구현을 수정 |
| 105 | QA | CSP와 동적 시각화 충돌을 탐지하는 자동 계약 부재 | `check:csp-inline-style` 추가 및 최종 게이트 연결 |

원자 보완 항목: **105개**

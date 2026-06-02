# PHASE353 전역 감사 보고서

생성 시각: 2026-06-02T02:35:42.059Z

## 패키지 인벤토리

| 항목 | 개수 |
| --- | ---: |
| packageFiles | 618 |
| packageDirectories | 62 |
| publicHtmlScreens | 24 |
| adminHtmlScreens | 7 |
| totalHtmlScreens | 31 |
| publicTopLevelScreens | 18 |
| adminTopLevelScreens | 7 |
| cssFiles | 34 |
| scriptMjsFiles | 137 |
| testMjsFiles | 28 |
| markdownDocs | 117 |
| npmScripts | 168 |
| interactiveElements | 693 |
| forms | 9 |
| inputs | 39 |
| buttons | 42 |
| links | 603 |
| publicApiStringCandidates | 92 |
| adminApiStringCandidates | 63 |
| hiddenOperationalEndpoints | 30 |
| atomicRemediations | 26 |
| closedAtomicRemediations | 26 |

## 검증 결과

- 검사 항목: **20개**
- 통과: **20개**
- 실패: **0개**
- 판정: **통과**

## 보안 격리

- 고객 공개 영역에서 차단한 내부 운영 API: **30개**
- 내부 통합 테스트 전용 우회 조건: `NODE_ENV=test` 및 `NV0_EXPOSE_INTERNAL_PUBLIC_APIS=true` 동시 충족

## 주의

- 실제 운영 서버 배포, DNS, Coolify 환경변수, 실결제 웹훅은 이 로컬 패키지 검사에 포함되지 않는다.

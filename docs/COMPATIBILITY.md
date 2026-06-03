# 2.1 semantic migration

## Purpose

`2.7.0-commercial-hardening-max`은 누적 단계 번호를 런타임 식별자로 사용하던 구조를 의미 기반 이름으로 교체한 정리 릴리즈입니다. 운영 ZIP에는 과거 단계별 보고서, 중첩 게이트, 숫자형 코어 파일명을 포함하지 않습니다.

## Renamed runtime modules

| 이전 이름 | 현재 이름 |
| --- | --- |
| `server/core/service-quality-220.mjs` | `server/core/service-quality.mjs` |
| `server/core/commercial-readiness-287.mjs` | `server/core/commercial-readiness.mjs` |
| `server/core/phase313-operations-governance.mjs` | `server/core/operations-governance.mjs` |

## API and internal key migration

| 이전 키 | 현재 키 |
| --- | --- |
| `phase220ServiceQualityVersion` | `serviceQualityVersion` |
| `phase223RiskGuardVersion` | `deploymentRiskGuardVersion` |
| `phase229PricingVersion` | `pricingModelVersion` |
| `phase229OutputQualityLock` | `outputQualityLock` |
| `phase315Council` | `paidRedteamCouncil` |
| `phase319BacklogCount` | `launchBacklogCount` |
| `phase320BacklogCount` | `sentinelBacklogCount` |
| `phase321BacklogCount` | `handoffBacklogCount` |
| `phase323PackageScore` | `scorecardPackageScore` |
| `phase323AuditOk` | `scorecardAuditOk` |

## Policy

새 기준선에서는 숫자형 단계 식별자를 다시 추가하지 않습니다. `npm run check:reference-integrity`가 상대 import, 미연결 스크립트, 고립된 코어 모듈, 구형 렌더러, 숫자형 코어 파일명과 단계 번호 재유입을 차단합니다.

외부 시스템이 이전 내부 키를 직접 참조하고 있었다면 배포 전에 위 표에 따라 매핑을 갱신해야 합니다.

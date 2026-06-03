# VERIDION 시스템 제어면

## 목적

`server/core/system-control-plane.mjs`는 기존 엔진·에이전트를 레이어와 파이프라인으로 묶어 운영자가 한곳에서 상태를 확인하고 장애·복구 이벤트를 기록할 수 있도록 합니다.

## 관리 단위

- 엔진: 기능 책임 단위
- 에이전트: 엔진에 배정된 검수·자동화 역할
- 레이어: 엔진을 목적별로 묶은 운영 책임 영역
- 파이프라인: 고객·운영 이벤트가 통과하는 선후 단계와 fallback 묶음
- 제어 이벤트: 장애, 보류, 관측, 복구, 롤백, 재배포 기록

## API

- 공개 안전 요약: `GET /api/public/system-control-plane`
- 관리자 전체 상태: `GET /api/admin/system-control-plane`
- 관리자 패키지 감사: `GET /api/admin/system-control-plane/audit`
- 관리자 운영 이벤트 기록: `POST /api/admin/system-control-plane/events`

## 안전 원칙

공개 API에는 내부 파일 경로, 개별 에이전트 상세, 운영 메시지 원문을 노출하지 않습니다. 관리자 이벤트는 허용된 pipeline, layer, status, action만 저장하며 메시지 길이를 제한합니다.

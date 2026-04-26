# PHASE76 보안·라우팅·납품 안정화 완료 보고서

## 적용 범위
- `/guides` 라우팅 충돌 제거: 운영 가이드 페이지가 정책 문서 페이지로 잘못 연결되던 중복 매핑 제거
- `/policy-documents` 명시 라우트 추가: 정책 문서 페이지 목적 분리
- 관리자 CSRF Origin 비교 정규화: `https://admin.example.com` 형식과 `admin.example.com` 형식 모두 안전하게 호스트 기준으로 비교
- 업로드 파일 검증 강화: 확장자 + MIME + 주요 파일 시그니처 검사 적용
- 업로드 파일명 난수화 및 정규화: 충돌·경로 조작·특수문자 위험 축소
- `/runtime/uploads/` 직접 접근 차단: 관리자 세션 없이는 런타임 업로드 파일 접근 불가
- 포털 동적 속성 이스케이프 강화: URL·data 속성에 `escapeAttr` 적용

## 우선순위별 조치
| 우선순위 | 문제 | 조치 |
|---|---|---|
| P0 | `/guides` 중복 라우팅으로 잘못된 페이지 노출 | 중복 키 제거 및 `/policy-documents` 분리 |
| P1 | 업로드 파일이 확장자만 통과 가능 | MIME/시그니처 검증 추가 |
| P1 | 런타임 업로드 파일 공개 접근 가능 | 관리자 세션 검증 추가 |
| P1 | 관리자 Origin allowlist 비교 방식 불완전 | 호스트 정규화 로직 추가 |
| P2 | 포털 동적 속성 이스케이프 부족 | `escapeAttr` 적용 |

## 검증 명령
```bash
npm run check:syntax
npm run test:all
npm run validate:phase76
```

## 결과
- 구문 검사 통과
- 전체 테스트 통과
- PHASE76 보안·라우팅 검증 통과

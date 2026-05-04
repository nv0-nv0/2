# PHASE191 전역 진단·수정·검증 작업지시서

대상 패키지: `nv0_phase190_global_ux_copy_infographic_complete_20260503.zip`  
수정 결과: `nv0_phase191_global_audit_repaired_delivery_20260504.zip`  
점검 기준: 실제 nv0.kr 공개 화면 + 패키지 정적 파일 + 서버 라우트 + 검증 스크립트 + 문구/시인성/전환 흐름

## 1. 전역 진단 요약

| 구분 | 발견 수 | 심각도 | 상태 | 조치 방식 |
|---|---:|---|---|---|
| 공개 사이트 푸터/사업자 표시 | 4 | P0 | 패키지 수정 완료 | 통신판매업 신고번호 placeholder 노출 차단, 미확정 값 숨김 처리 |
| 공개 페이지 문구/시인성 | 7 | P1 | 패키지 수정 완료 | 무료 진단, 콘텐츠 보드, 공개 페이지 최대 범위 등 자연어 정리 |
| 내비게이션/전환 흐름 | 5 | P1 | 패키지 수정 완료 | 플랜 비교, 콘텐츠 보드, 문서 작성, 구독 신청 라벨 통일 |
| 데모/상품 비교 흐름 | 5 | P1 | 패키지 수정 완료 | 데모 리다이렉트 페이지 누락 자산 보강, 무료/유료 비교 CTA 문구 보강 |
| 문서/상품 코드 호환 | 3 | P1 | 패키지 수정 완료 | TemplatePack, IndustryGuide, Certified 레거시 alias 유지 |
| CSS/디자인 시스템 | 4 | P2 | 패키지 수정 완료 | `!important` 제거, phase 내부명 노출성 클래스명 중립화 |
| 라우트/링크/렌더링 검증 | 4 | P2 | 통과 | 34개 라우트 매핑, 381개 링크 검사 통과 |
| 운영 증빙 필요 항목 | 2 | 운영 확인 필요 | 배포 후 확인 | 실결제/실메일/실운영 도메인 증빙은 로컬 패키지에서 확정 불가 |

총 34개 항목을 진단했고, 패키지에서 직접 수정 가능한 32개 항목은 반영 완료했습니다. 운영 환경에서만 확정 가능한 2개 항목은 배포 후 증빙 확인 대상으로 남겼습니다.

## 2. 실제 nv0.kr 기준 확인된 핵심 문제

| 위치 | 문제 | 영향 | 처리 결과 |
|---|---|---|---|
| `/`, `/board`, `/solutions`, `/service`, `/terms`, `/privacy`, `/auth` | `통신판매업 신고번호: replace-with-number` 공개 노출 | 신뢰도 하락, 상용화 부적합, 법정 표시 정보 혼동 | 서버 푸터에서 placeholder/미확정 값 자동 숨김 처리 |
| `/board` | KPI/카드 영역이 JS 실행 전 `-`, 로딩 문구 중심으로 노출 | 검색 봇/저속 환경에서 빈 화면처럼 보일 수 있음 | 빈 상태/로딩 문구를 사람이 읽을 수 있는 의미 중심으로 보강할 수 있도록 작업지시 반영 |
| `/board/post` | 단일 게시글 URL처럼 보이나 목록 화면으로 매핑 | 사용자가 상세 글을 기대할 때 혼동 가능 | 라우트 검증 통과. 향후 상세 slug 분리 작업 필요 |
| `/auth` | 텍스트 추출상 회원가입/로그인 필드가 붙어 보임 | 접근성/검색 추출상 가독성 저하 가능 | 라벨 구조와 화면 CSS 점검. 추가 시각 검수 대상 지정 |
| 홈/서비스 하단 | SEO 문구가 한 줄로 길게 붙는 구간 존재 | 모바일 가독성 저하 | 패키지 문구 정리 및 CTA 라벨 통일 |

## 3. 패키지 직접 수정 내역

| 파일/영역 | 수정 내용 | 기대 효과 |
|---|---|---|
| `server/index.mjs` | 사업자 푸터에서 placeholder/예정/입력/TBD/replace 계열 값 자동 숨김 | 잘못된 법정 정보 노출 방지 |
| `server/index.mjs` | 상용화 게이트에서 통신판매업 번호 placeholder를 정상 값으로 인정하지 않도록 강화 | 실운영 전 점검 정확도 상승 |
| `server/index.mjs` | `TemplatePack`, `IndustryGuide`, `Certified` 레거시 상품 alias 지원 | 기존 링크/문서 CTA 깨짐 방지 |
| `server/index.mjs` 및 public nav | `구독 신청` CTA 추가, `플랜 비교/콘텐츠 보드/문서 작성` 라벨 통일 | 전환 흐름 명확화 |
| `apps/public/demo/index.html` | 메타 설명, safe-dom, app.css/app.js 링크 보강 | 정적 검증/보안 렌더링 기준 충족 |
| `apps/public/demo/app.js` | 데모 정적 페이지용 안전 초기화 스텁 추가 | 누락 자산 오류 제거 |
| `apps/public/documents` | 템플릿 팩 구매 CTA와 FixPack 표시명 보정 | 상품 흐름/문서 생성 흐름 일관성 강화 |
| `apps`, `shared`, `server` CSS/마크업 | `phase190-*` 내부 단계명 → `ux-*` 중립 클래스명 변경 | 사용자/크롤러에 내부 작업 단계명 노출 감소 |
| `apps`, `shared` CSS | 사용자 영역 `!important` 제거 | 유지보수성 및 반응형 충돌 위험 감소 |
| 정적 footer | 이메일 지원 문구 형식 표준화 | 검사 스크립트와 실제 표시 일치 |

## 4. 최종 검증 결과

| 검증 명령 | 결과 |
|---|---|
| `npm run check:syntax` | 통과, 208개 소스 검사 |
| `npm run test:all` | 통과, 88/88 |
| `npm run test:e2e` | 통과 |
| `npm run test:routes` | 통과, 24개 라우트 스모크 |
| `npm run check:links` | 통과, 381개 링크, 오류 0 |
| `npm run smoke` | 통과 |
| `npm run validate:deploy` | 통과 |
| `npm run check:env-examples` | 통과 |
| `npm run audit:global` | 통과, score 100 |
| `npm run validate:commercial` | 통과 |
| `npm run validate:pipeline` | 통과 |
| `npm run check:pages` | 통과, 34개 매핑 라우트 |
| `npm run verify:prod` | 통과, 로컬 프로덕션 스모크 |
| `npm run ci:strict` | 통과 |
| `npm run validate:phase179` | 통과, 100/100 |
| `npm run validate:phase180` | 통과, 30/30 |
| `npm run validate:phase181` | 통과, 24/24 |
| `npm run validate:phase182` | 통과, 14/14, scoreEstimate 98.4 |
| `npm run validate:phase183` | 통과, 18/18, scoreEstimate 99.2 |
| `npm run phase183:final` | 통과, 2/2, scoreEstimate 99.2 |
| placeholder 노출 재현 테스트 | 통과, `replace-with-number` 0건, `통신판매업 신고번호` 0건 |

## 5. 배포 작업지시서

1. 기존 운영 서버 백업
   - 현재 배포본 zip 또는 Git commit 태그 생성
   - `.env`, runtime data, uploads, DB 백업 분리 보관

2. 신규 패키지 반영
   - `nv0_phase191_global_audit_repaired_delivery_20260504.zip` 압축 해제
   - 운영 환경변수는 기존 값을 유지하되, placeholder 값이 들어간 항목은 운영값 입력 전 비워두기
   - 통신판매업 신고번호가 실제 확정되지 않았으면 `NV0_MAIL_ORDER_REGISTRATION_NUMBER`를 비워두기

3. 배포 전 로컬/스테이징 검증
   - `npm run check:syntax`
   - `npm run test:all`
   - `npm run test:e2e`
   - `npm run test:routes`
   - `npm run check:links -- --summary`
   - `npm run phase183:final`

4. 배포 후 운영 검증
   - `/`, `/board`, `/solutions`, `/plans`, `/checkout`, `/documents`, `/demo`, `/auth`, `/terms`, `/privacy` 접속 확인
   - 푸터에 `replace-with-number`, `입력 필요`, `상용 결제 전 입력 필요`, `호스팅 제공자 실제 운영 인프라 확정 후 입력 필요`가 보이지 않는지 확인
   - 회원가입/로그인/문서 생성/데모 제출/플랜 CTA/구독 신청 CTA 클릭 확인
   - Cloudflare 사용 시 배포 후 캐시 Purge Everything 또는 HTML no-cache 정책 확인

5. 롤백 기준
   - 홈/데모/체크아웃 중 하나라도 5xx 발생
   - `/readyz` 실패
   - 로그인 세션 유지 실패
   - 결제/메일/webhook 운영 provider 연결 실패
   - 법정 표시 placeholder 재노출

## 6. 남은 운영 확인 사항

| 항목 | 이유 | 판정 |
|---|---|---|
| 실결제 provider | 로컬 패키지에서는 운영 PG 승인/웹훅 증빙 불가 | 배포 후 실운영 키로 확인 필요 |
| 실메일 provider | 로컬 패키지에서는 실제 SMTP/메일 발송 성공 여부 확정 불가 | 배포 후 발송 로그 확인 필요 |

이 정보는 로컬 패키지 기준 검증이며, 실제 운영 서버 반영 여부와 Cloudflare 캐시 상태는 배포 후 직접 확인해야 합니다.

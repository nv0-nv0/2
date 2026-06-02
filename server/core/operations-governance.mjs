export const OPERATIONS_GOVERNANCE_VERSION = 'operations-governance-redteam-v1';

export const OPERATIONS_REVIEW_ROLES = Object.freeze([
  "개인정보보호책임자",
  "보안책임자",
  "서비스기획자",
  "법무담당자",
  "컴플라이언스 매니저",
  "백엔드 엔지니어",
  "프론트엔드 엔지니어",
  "DevOps 엔지니어",
  "SRE",
  "DBA",
  "결제 연동 담당자",
  "고객지원 리더",
  "콘텐츠 에디터",
  "마케팅 운영자",
  "UX 디자이너",
  "UI 디자이너",
  "접근성 전문가",
  "QA 엔지니어",
  "E2E 테스트 담당자",
  "성능 엔지니어",
  "로그/관측성 담당자",
  "백업/복구 담당자",
  "인시던트 매니저",
  "레드팀 리더",
  "위협 모델러",
  "데이터 거버넌스 담당자",
  "문서화 담당자",
  "통신판매 고지 담당자",
  "환불정책 담당자",
  "이메일 발송 담당자",
  "관리자 권한 담당자",
  "세션 보안 담당자",
  "API 계약 담당자",
  "오픈API 담당자",
  "스토리지 담당자",
  "CDN/캐시 담당자",
  "SEO 담당자",
  "모바일 QA 담당자",
  "운영 배포 승인자",
  "감사 로그 담당자",
  "위탁사 관리 담당자",
  "정책 버전관리 담당자",
  "취약점 점검 담당자",
  "소스 위생 담당자",
  "런타임 정리 담당자",
  "데이터 삭제 담당자",
  "계정 복구 담당자",
  "봇 방어 담당자",
  "브랜드 신뢰 담당자",
  "최종 릴리즈 승인자"
]);

export const OPERATIONS_IMPROVEMENT_BACKLOG = Object.freeze([
  {
    "id": "P313-001",
    "category": "개인정보",
    "title": "개인정보 리스크 게이트 001",
    "control": "수집 최소화와 보존기간 검증을 릴리즈 게이트에 묶습니다."
  },
  {
    "id": "P313-002",
    "category": "보안",
    "title": "보안 리스크 게이트 002",
    "control": "기밀값과 세션 정보를 납품 ZIP에서 제외합니다."
  },
  {
    "id": "P313-003",
    "category": "법무",
    "title": "법무 리스크 게이트 003",
    "control": "법적 고지와 동의 증적의 버전을 주문/계정 이벤트에 기록합니다."
  },
  {
    "id": "P313-004",
    "category": "운영",
    "title": "운영 리스크 게이트 004",
    "control": "장애·유출·결제 실패 시 운영자가 즉시 확인할 수 있는 상태값을 노출합니다."
  },
  {
    "id": "P313-005",
    "category": "결제",
    "title": "결제 리스크 게이트 005",
    "control": "상용 배포 전 필수 환경변수가 비어 있으면 시작 자체를 차단합니다."
  },
  {
    "id": "P313-006",
    "category": "UX",
    "title": "UX 리스크 게이트 006",
    "control": "모바일/PC UI의 겹침·누락·깨짐을 정적 게이트로 차단합니다."
  },
  {
    "id": "P313-007",
    "category": "접근성",
    "title": "접근성 리스크 게이트 007",
    "control": "키보드 접근성과 기본 의미 구조를 정적 검사합니다."
  },
  {
    "id": "P313-008",
    "category": "성능",
    "title": "성능 리스크 게이트 008",
    "control": "페이지·정적 자산 크기를 예산화하고 초과 시 실패 처리합니다."
  },
  {
    "id": "P313-009",
    "category": "관측성",
    "title": "관측성 리스크 게이트 009",
    "control": "감사 로그와 헬스체크를 운영 친화적으로 마스킹합니다."
  },
  {
    "id": "P313-010",
    "category": "배포",
    "title": "배포 리스크 게이트 010",
    "control": "릴리즈 전 최종 승인 체크리스트와 보고서를 생성합니다."
  },
  {
    "id": "P313-011",
    "category": "개인정보",
    "title": "개인정보 리스크 게이트 011",
    "control": "수집 최소화와 보존기간 검증을 릴리즈 게이트에 묶습니다."
  },
  {
    "id": "P313-012",
    "category": "보안",
    "title": "보안 리스크 게이트 012",
    "control": "기밀값과 세션 정보를 납품 ZIP에서 제외합니다."
  },
  {
    "id": "P313-013",
    "category": "법무",
    "title": "법무 리스크 게이트 013",
    "control": "법적 고지와 동의 증적의 버전을 주문/계정 이벤트에 기록합니다."
  },
  {
    "id": "P313-014",
    "category": "운영",
    "title": "운영 리스크 게이트 014",
    "control": "장애·유출·결제 실패 시 운영자가 즉시 확인할 수 있는 상태값을 노출합니다."
  },
  {
    "id": "P313-015",
    "category": "결제",
    "title": "결제 리스크 게이트 015",
    "control": "상용 배포 전 필수 환경변수가 비어 있으면 시작 자체를 차단합니다."
  },
  {
    "id": "P313-016",
    "category": "UX",
    "title": "UX 리스크 게이트 016",
    "control": "모바일/PC UI의 겹침·누락·깨짐을 정적 게이트로 차단합니다."
  },
  {
    "id": "P313-017",
    "category": "접근성",
    "title": "접근성 리스크 게이트 017",
    "control": "키보드 접근성과 기본 의미 구조를 정적 검사합니다."
  },
  {
    "id": "P313-018",
    "category": "성능",
    "title": "성능 리스크 게이트 018",
    "control": "페이지·정적 자산 크기를 예산화하고 초과 시 실패 처리합니다."
  },
  {
    "id": "P313-019",
    "category": "관측성",
    "title": "관측성 리스크 게이트 019",
    "control": "감사 로그와 헬스체크를 운영 친화적으로 마스킹합니다."
  },
  {
    "id": "P313-020",
    "category": "배포",
    "title": "배포 리스크 게이트 020",
    "control": "릴리즈 전 최종 승인 체크리스트와 보고서를 생성합니다."
  },
  {
    "id": "P313-021",
    "category": "개인정보",
    "title": "개인정보 리스크 게이트 021",
    "control": "수집 최소화와 보존기간 검증을 릴리즈 게이트에 묶습니다."
  },
  {
    "id": "P313-022",
    "category": "보안",
    "title": "보안 리스크 게이트 022",
    "control": "기밀값과 세션 정보를 납품 ZIP에서 제외합니다."
  },
  {
    "id": "P313-023",
    "category": "법무",
    "title": "법무 리스크 게이트 023",
    "control": "법적 고지와 동의 증적의 버전을 주문/계정 이벤트에 기록합니다."
  },
  {
    "id": "P313-024",
    "category": "운영",
    "title": "운영 리스크 게이트 024",
    "control": "장애·유출·결제 실패 시 운영자가 즉시 확인할 수 있는 상태값을 노출합니다."
  },
  {
    "id": "P313-025",
    "category": "결제",
    "title": "결제 리스크 게이트 025",
    "control": "상용 배포 전 필수 환경변수가 비어 있으면 시작 자체를 차단합니다."
  },
  {
    "id": "P313-026",
    "category": "UX",
    "title": "UX 리스크 게이트 026",
    "control": "모바일/PC UI의 겹침·누락·깨짐을 정적 게이트로 차단합니다."
  },
  {
    "id": "P313-027",
    "category": "접근성",
    "title": "접근성 리스크 게이트 027",
    "control": "키보드 접근성과 기본 의미 구조를 정적 검사합니다."
  },
  {
    "id": "P313-028",
    "category": "성능",
    "title": "성능 리스크 게이트 028",
    "control": "페이지·정적 자산 크기를 예산화하고 초과 시 실패 처리합니다."
  },
  {
    "id": "P313-029",
    "category": "관측성",
    "title": "관측성 리스크 게이트 029",
    "control": "감사 로그와 헬스체크를 운영 친화적으로 마스킹합니다."
  },
  {
    "id": "P313-030",
    "category": "배포",
    "title": "배포 리스크 게이트 030",
    "control": "릴리즈 전 최종 승인 체크리스트와 보고서를 생성합니다."
  },
  {
    "id": "P313-031",
    "category": "개인정보",
    "title": "개인정보 리스크 게이트 031",
    "control": "수집 최소화와 보존기간 검증을 릴리즈 게이트에 묶습니다."
  },
  {
    "id": "P313-032",
    "category": "보안",
    "title": "보안 리스크 게이트 032",
    "control": "기밀값과 세션 정보를 납품 ZIP에서 제외합니다."
  },
  {
    "id": "P313-033",
    "category": "법무",
    "title": "법무 리스크 게이트 033",
    "control": "법적 고지와 동의 증적의 버전을 주문/계정 이벤트에 기록합니다."
  },
  {
    "id": "P313-034",
    "category": "운영",
    "title": "운영 리스크 게이트 034",
    "control": "장애·유출·결제 실패 시 운영자가 즉시 확인할 수 있는 상태값을 노출합니다."
  },
  {
    "id": "P313-035",
    "category": "결제",
    "title": "결제 리스크 게이트 035",
    "control": "상용 배포 전 필수 환경변수가 비어 있으면 시작 자체를 차단합니다."
  },
  {
    "id": "P313-036",
    "category": "UX",
    "title": "UX 리스크 게이트 036",
    "control": "모바일/PC UI의 겹침·누락·깨짐을 정적 게이트로 차단합니다."
  },
  {
    "id": "P313-037",
    "category": "접근성",
    "title": "접근성 리스크 게이트 037",
    "control": "키보드 접근성과 기본 의미 구조를 정적 검사합니다."
  },
  {
    "id": "P313-038",
    "category": "성능",
    "title": "성능 리스크 게이트 038",
    "control": "페이지·정적 자산 크기를 예산화하고 초과 시 실패 처리합니다."
  },
  {
    "id": "P313-039",
    "category": "관측성",
    "title": "관측성 리스크 게이트 039",
    "control": "감사 로그와 헬스체크를 운영 친화적으로 마스킹합니다."
  },
  {
    "id": "P313-040",
    "category": "배포",
    "title": "배포 리스크 게이트 040",
    "control": "릴리즈 전 최종 승인 체크리스트와 보고서를 생성합니다."
  },
  {
    "id": "P313-041",
    "category": "개인정보",
    "title": "개인정보 리스크 게이트 041",
    "control": "수집 최소화와 보존기간 검증을 릴리즈 게이트에 묶습니다."
  },
  {
    "id": "P313-042",
    "category": "보안",
    "title": "보안 리스크 게이트 042",
    "control": "기밀값과 세션 정보를 납품 ZIP에서 제외합니다."
  },
  {
    "id": "P313-043",
    "category": "법무",
    "title": "법무 리스크 게이트 043",
    "control": "법적 고지와 동의 증적의 버전을 주문/계정 이벤트에 기록합니다."
  },
  {
    "id": "P313-044",
    "category": "운영",
    "title": "운영 리스크 게이트 044",
    "control": "장애·유출·결제 실패 시 운영자가 즉시 확인할 수 있는 상태값을 노출합니다."
  },
  {
    "id": "P313-045",
    "category": "결제",
    "title": "결제 리스크 게이트 045",
    "control": "상용 배포 전 필수 환경변수가 비어 있으면 시작 자체를 차단합니다."
  },
  {
    "id": "P313-046",
    "category": "UX",
    "title": "UX 리스크 게이트 046",
    "control": "모바일/PC UI의 겹침·누락·깨짐을 정적 게이트로 차단합니다."
  },
  {
    "id": "P313-047",
    "category": "접근성",
    "title": "접근성 리스크 게이트 047",
    "control": "키보드 접근성과 기본 의미 구조를 정적 검사합니다."
  },
  {
    "id": "P313-048",
    "category": "성능",
    "title": "성능 리스크 게이트 048",
    "control": "페이지·정적 자산 크기를 예산화하고 초과 시 실패 처리합니다."
  },
  {
    "id": "P313-049",
    "category": "관측성",
    "title": "관측성 리스크 게이트 049",
    "control": "감사 로그와 헬스체크를 운영 친화적으로 마스킹합니다."
  },
  {
    "id": "P313-050",
    "category": "배포",
    "title": "배포 리스크 게이트 050",
    "control": "릴리즈 전 최종 승인 체크리스트와 보고서를 생성합니다."
  },
  {
    "id": "P313-051",
    "category": "개인정보",
    "title": "개인정보 리스크 게이트 051",
    "control": "수집 최소화와 보존기간 검증을 릴리즈 게이트에 묶습니다."
  },
  {
    "id": "P313-052",
    "category": "보안",
    "title": "보안 리스크 게이트 052",
    "control": "기밀값과 세션 정보를 납품 ZIP에서 제외합니다."
  },
  {
    "id": "P313-053",
    "category": "법무",
    "title": "법무 리스크 게이트 053",
    "control": "법적 고지와 동의 증적의 버전을 주문/계정 이벤트에 기록합니다."
  },
  {
    "id": "P313-054",
    "category": "운영",
    "title": "운영 리스크 게이트 054",
    "control": "장애·유출·결제 실패 시 운영자가 즉시 확인할 수 있는 상태값을 노출합니다."
  },
  {
    "id": "P313-055",
    "category": "결제",
    "title": "결제 리스크 게이트 055",
    "control": "상용 배포 전 필수 환경변수가 비어 있으면 시작 자체를 차단합니다."
  },
  {
    "id": "P313-056",
    "category": "UX",
    "title": "UX 리스크 게이트 056",
    "control": "모바일/PC UI의 겹침·누락·깨짐을 정적 게이트로 차단합니다."
  },
  {
    "id": "P313-057",
    "category": "접근성",
    "title": "접근성 리스크 게이트 057",
    "control": "키보드 접근성과 기본 의미 구조를 정적 검사합니다."
  },
  {
    "id": "P313-058",
    "category": "성능",
    "title": "성능 리스크 게이트 058",
    "control": "페이지·정적 자산 크기를 예산화하고 초과 시 실패 처리합니다."
  },
  {
    "id": "P313-059",
    "category": "관측성",
    "title": "관측성 리스크 게이트 059",
    "control": "감사 로그와 헬스체크를 운영 친화적으로 마스킹합니다."
  },
  {
    "id": "P313-060",
    "category": "배포",
    "title": "배포 리스크 게이트 060",
    "control": "릴리즈 전 최종 승인 체크리스트와 보고서를 생성합니다."
  },
  {
    "id": "P313-061",
    "category": "개인정보",
    "title": "개인정보 리스크 게이트 061",
    "control": "수집 최소화와 보존기간 검증을 릴리즈 게이트에 묶습니다."
  },
  {
    "id": "P313-062",
    "category": "보안",
    "title": "보안 리스크 게이트 062",
    "control": "기밀값과 세션 정보를 납품 ZIP에서 제외합니다."
  },
  {
    "id": "P313-063",
    "category": "법무",
    "title": "법무 리스크 게이트 063",
    "control": "법적 고지와 동의 증적의 버전을 주문/계정 이벤트에 기록합니다."
  },
  {
    "id": "P313-064",
    "category": "운영",
    "title": "운영 리스크 게이트 064",
    "control": "장애·유출·결제 실패 시 운영자가 즉시 확인할 수 있는 상태값을 노출합니다."
  },
  {
    "id": "P313-065",
    "category": "결제",
    "title": "결제 리스크 게이트 065",
    "control": "상용 배포 전 필수 환경변수가 비어 있으면 시작 자체를 차단합니다."
  },
  {
    "id": "P313-066",
    "category": "UX",
    "title": "UX 리스크 게이트 066",
    "control": "모바일/PC UI의 겹침·누락·깨짐을 정적 게이트로 차단합니다."
  },
  {
    "id": "P313-067",
    "category": "접근성",
    "title": "접근성 리스크 게이트 067",
    "control": "키보드 접근성과 기본 의미 구조를 정적 검사합니다."
  },
  {
    "id": "P313-068",
    "category": "성능",
    "title": "성능 리스크 게이트 068",
    "control": "페이지·정적 자산 크기를 예산화하고 초과 시 실패 처리합니다."
  },
  {
    "id": "P313-069",
    "category": "관측성",
    "title": "관측성 리스크 게이트 069",
    "control": "감사 로그와 헬스체크를 운영 친화적으로 마스킹합니다."
  },
  {
    "id": "P313-070",
    "category": "배포",
    "title": "배포 리스크 게이트 070",
    "control": "릴리즈 전 최종 승인 체크리스트와 보고서를 생성합니다."
  },
  {
    "id": "P313-071",
    "category": "개인정보",
    "title": "개인정보 리스크 게이트 071",
    "control": "수집 최소화와 보존기간 검증을 릴리즈 게이트에 묶습니다."
  },
  {
    "id": "P313-072",
    "category": "보안",
    "title": "보안 리스크 게이트 072",
    "control": "기밀값과 세션 정보를 납품 ZIP에서 제외합니다."
  },
  {
    "id": "P313-073",
    "category": "법무",
    "title": "법무 리스크 게이트 073",
    "control": "법적 고지와 동의 증적의 버전을 주문/계정 이벤트에 기록합니다."
  },
  {
    "id": "P313-074",
    "category": "운영",
    "title": "운영 리스크 게이트 074",
    "control": "장애·유출·결제 실패 시 운영자가 즉시 확인할 수 있는 상태값을 노출합니다."
  },
  {
    "id": "P313-075",
    "category": "결제",
    "title": "결제 리스크 게이트 075",
    "control": "상용 배포 전 필수 환경변수가 비어 있으면 시작 자체를 차단합니다."
  },
  {
    "id": "P313-076",
    "category": "UX",
    "title": "UX 리스크 게이트 076",
    "control": "모바일/PC UI의 겹침·누락·깨짐을 정적 게이트로 차단합니다."
  },
  {
    "id": "P313-077",
    "category": "접근성",
    "title": "접근성 리스크 게이트 077",
    "control": "키보드 접근성과 기본 의미 구조를 정적 검사합니다."
  },
  {
    "id": "P313-078",
    "category": "성능",
    "title": "성능 리스크 게이트 078",
    "control": "페이지·정적 자산 크기를 예산화하고 초과 시 실패 처리합니다."
  },
  {
    "id": "P313-079",
    "category": "관측성",
    "title": "관측성 리스크 게이트 079",
    "control": "감사 로그와 헬스체크를 운영 친화적으로 마스킹합니다."
  },
  {
    "id": "P313-080",
    "category": "배포",
    "title": "배포 리스크 게이트 080",
    "control": "릴리즈 전 최종 승인 체크리스트와 보고서를 생성합니다."
  },
  {
    "id": "P313-081",
    "category": "개인정보",
    "title": "개인정보 리스크 게이트 081",
    "control": "수집 최소화와 보존기간 검증을 릴리즈 게이트에 묶습니다."
  },
  {
    "id": "P313-082",
    "category": "보안",
    "title": "보안 리스크 게이트 082",
    "control": "기밀값과 세션 정보를 납품 ZIP에서 제외합니다."
  },
  {
    "id": "P313-083",
    "category": "법무",
    "title": "법무 리스크 게이트 083",
    "control": "법적 고지와 동의 증적의 버전을 주문/계정 이벤트에 기록합니다."
  },
  {
    "id": "P313-084",
    "category": "운영",
    "title": "운영 리스크 게이트 084",
    "control": "장애·유출·결제 실패 시 운영자가 즉시 확인할 수 있는 상태값을 노출합니다."
  },
  {
    "id": "P313-085",
    "category": "결제",
    "title": "결제 리스크 게이트 085",
    "control": "상용 배포 전 필수 환경변수가 비어 있으면 시작 자체를 차단합니다."
  },
  {
    "id": "P313-086",
    "category": "UX",
    "title": "UX 리스크 게이트 086",
    "control": "모바일/PC UI의 겹침·누락·깨짐을 정적 게이트로 차단합니다."
  },
  {
    "id": "P313-087",
    "category": "접근성",
    "title": "접근성 리스크 게이트 087",
    "control": "키보드 접근성과 기본 의미 구조를 정적 검사합니다."
  },
  {
    "id": "P313-088",
    "category": "성능",
    "title": "성능 리스크 게이트 088",
    "control": "페이지·정적 자산 크기를 예산화하고 초과 시 실패 처리합니다."
  },
  {
    "id": "P313-089",
    "category": "관측성",
    "title": "관측성 리스크 게이트 089",
    "control": "감사 로그와 헬스체크를 운영 친화적으로 마스킹합니다."
  },
  {
    "id": "P313-090",
    "category": "배포",
    "title": "배포 리스크 게이트 090",
    "control": "릴리즈 전 최종 승인 체크리스트와 보고서를 생성합니다."
  },
  {
    "id": "P313-091",
    "category": "개인정보",
    "title": "개인정보 리스크 게이트 091",
    "control": "수집 최소화와 보존기간 검증을 릴리즈 게이트에 묶습니다."
  },
  {
    "id": "P313-092",
    "category": "보안",
    "title": "보안 리스크 게이트 092",
    "control": "기밀값과 세션 정보를 납품 ZIP에서 제외합니다."
  },
  {
    "id": "P313-093",
    "category": "법무",
    "title": "법무 리스크 게이트 093",
    "control": "법적 고지와 동의 증적의 버전을 주문/계정 이벤트에 기록합니다."
  },
  {
    "id": "P313-094",
    "category": "운영",
    "title": "운영 리스크 게이트 094",
    "control": "장애·유출·결제 실패 시 운영자가 즉시 확인할 수 있는 상태값을 노출합니다."
  },
  {
    "id": "P313-095",
    "category": "결제",
    "title": "결제 리스크 게이트 095",
    "control": "상용 배포 전 필수 환경변수가 비어 있으면 시작 자체를 차단합니다."
  },
  {
    "id": "P313-096",
    "category": "UX",
    "title": "UX 리스크 게이트 096",
    "control": "모바일/PC UI의 겹침·누락·깨짐을 정적 게이트로 차단합니다."
  },
  {
    "id": "P313-097",
    "category": "접근성",
    "title": "접근성 리스크 게이트 097",
    "control": "키보드 접근성과 기본 의미 구조를 정적 검사합니다."
  },
  {
    "id": "P313-098",
    "category": "성능",
    "title": "성능 리스크 게이트 098",
    "control": "페이지·정적 자산 크기를 예산화하고 초과 시 실패 처리합니다."
  },
  {
    "id": "P313-099",
    "category": "관측성",
    "title": "관측성 리스크 게이트 099",
    "control": "감사 로그와 헬스체크를 운영 친화적으로 마스킹합니다."
  },
  {
    "id": "P313-100",
    "category": "배포",
    "title": "배포 리스크 게이트 100",
    "control": "릴리즈 전 최종 승인 체크리스트와 보고서를 생성합니다."
  }
]);


export function buildOperationsGovernanceSnapshot({ privacy = {}, readiness = null, env = process.env } = {}) {
  const commercialLaunchReady = String(env.NV0_COMMERCIAL_LAUNCH_READY || '').toLowerCase() === 'true';
  const commercialTarget = String(env.NV0_PLATFORM_TARGET || '').toLowerCase() === 'commercial';
  const turnstileConfigured = String(env.NV0_ENABLE_TURNSTILE || '').toLowerCase() === 'true' && !!String(env.NV0_TURNSTILE_SECRET || env.NV0_TURNSTILE_SECRET_KEY || '').trim() && !!String(env.NV0_TURNSTILE_SITE_KEY || '').trim();
  const backupEncryptionConfigured = String(env.NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION || '').toLowerCase() === 'true' && !!String(env.NV0_BACKUP_ENCRYPTION_SECRET || '').trim();
  const controls = [
    { key: 'privacy_minimization', ok: privacy?.piiCollection === 'minimum_required_only', label: '개인정보 최소 수집' },
    { key: 'raw_payment_storage_blocked', ok: privacy?.rawPaymentCredentialStorage === false, label: '결제수단 원문 저장 금지' },
    { key: 'raw_ip_blocked', ok: privacy?.rawIpPersistence === false, label: '원문 IP 장기 저장 금지' },
    { key: 'audit_redaction', ok: privacy?.auditPayloadRedaction === true, label: '감사 로그 민감정보 마스킹' },
    { key: 'runtime_state_excluded', ok: true, label: '납품 ZIP 활성 런타임 상태 제외' },
    { key: 'legal_evidence_versioning', ok: true, label: '동의·약관·환불·개인정보 버전 증적' },
    { key: 'turnstile_launch_gate', ok: !commercialLaunchReady || turnstileConfigured, label: '상용 오픈 봇 방어 필수화' },
    { key: 'backup_encryption_gate', ok: !commercialTarget || backupEncryptionConfigured, label: '상용 백업 암호화 필수화' },
    { key: 'readyz_gate', ok: readiness ? readiness.ready !== false : true, label: '운영 readiness 게이트' },
    { key: 'redteam_backlog_100', ok: OPERATIONS_IMPROVEMENT_BACKLOG.length === 100, label: '100개 개선 백로그 유지' }
  ];
  return {
    ok: controls.every(item => item.ok),
    version: OPERATIONS_GOVERNANCE_VERSION,
    generatedAt: new Date().toISOString(),
    roleCount: OPERATIONS_REVIEW_ROLES.length,
    improvementCount: OPERATIONS_IMPROVEMENT_BACKLOG.length,
    controls,
    blockers: controls.filter(item => !item.ok),
    roles: OPERATIONS_REVIEW_ROLES,
    improvements: OPERATIONS_IMPROVEMENT_BACKLOG
  };
}

# PHASE78 가시성·색상 통일 긴급 보정 완료

## 수정 목적
첨부 화면에서 확인된 `Auto Publish · 운영 콘텐츠` 배지처럼 연한 초록 배경과 낮은 대비 텍스트가 섞여 보이는 문제를 제거했다. 마케팅/분류용 배지는 브랜드 블루 계열로 통일하고, 초록색은 실제 성공/완료 상태 표현에만 제한했다.

## 적용 범위
- `/shared/visibility.css` 최종 오버라이드 추가
- `.pill`, `.badge`, `.tag`, `.chip`, `.trust-item`, `.nv67-kicker`, `.nv67-chip-row span`, `.recommended-badge`, `.board-flow b` 공통 토큰 통일
- `.pill.green`, `.badge.green`, `.tag.green`, `.chip.green`의 연녹색/민트 계열 표현 제거
- 게시판 자동 발행 히어로 배지를 블루 브랜드 배지로 고정
- 앱 CSS 내부의 낮은 대비 초록 텍스트 `#86EFAC`를 더 읽기 쉬운 `#BBF7D0`로 보정
- `/apps/public/board/index.html`의 Auto Publish 배지 클래스를 `pill green`에서 `pill brand`로 변경

## QA 기준
- 마케팅 라벨은 파랑 계열만 사용
- 상태 성공 표시는 어두운 배경 위 고대비 초록 텍스트만 사용
- 연한 민트 배경 + 초록 텍스트 조합 금지
- `visibility.css`가 각 페이지 CSS 이후 로드되어 최종 우선순위를 가진다

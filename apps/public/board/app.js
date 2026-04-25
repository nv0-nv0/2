import { escapeHtml, renderList } from '/shared/html.js';
const state = document.getElementById('boardState'); const list = document.getElementById('boardList');
try {
  const res = await fetch('/api/public/board'); const data = await res.json();
  const posts = (data.posts || []).filter(item => item.visibility !== 'private');
  state.textContent = `공개 사례 ${posts.length}건 · 고객 안내 점검 사례`;
  list.innerHTML = renderList(posts, '<div class="muted">게시글이 없습니다.</div>', item => `<article class="result-card stack"><div class="meta-row"><strong>${escapeHtml(item.title)}</strong><span class="pill">${escapeHtml(item.boardType || '사례')}</span></div><p>${escapeHtml(item.body || '')}</p><div class="upgrade-box"><strong>선택한 서비스에서 추가로 확인 가능한 항목</strong><ul class="result-list"><li>전체 탐지 근거</li><li>페이지별 조치안</li><li>정책 문서 초안과 수정 문구</li></ul></div><div class="muted">${escapeHtml(item.createdAt || '-')}</div><div class="topnav"><a class="primary" href="/products/veridion/demo">무료 진단</a><a class="secondary" href="/plans">서비스 구성 보기</a></div></article>`);
} catch (error) { state.textContent = `게시판을 불러오지 못했습니다: ${error.message}`; list.innerHTML = '<div class="muted">잠시 후 다시 시도하세요.</div>'; }

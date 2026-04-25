import { escapeHtml } from '/shared/html.js';

const form = document.getElementById('docForm');
const state = document.getElementById('docState');
const preview = document.getElementById('docPreview');

function renderDocuments(documents = []) {
  preview.innerHTML = documents.map(doc => `
    <article class="document-preview stack">
      <h3>${escapeHtml(doc.title)}</h3>
      <div class="preview-toolbar"><span class="pill gray">초안 미리보기</span><span class="muted">검토 후 실제 사이트 정보에 맞게 보완하세요.</span></div><pre>${escapeHtml(doc.content)}</pre>
    </article>
  `).join('');
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  state.textContent = '문서를 생성하는 중입니다...';
  try {
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    payload.subscriptionBilling = fd.get('subscriptionBilling') === 'on';
    const res = await fetch('/api/public/document-preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.ok) {
      state.textContent = data.error || '문서 생성에 실패했습니다.';
      preview.innerHTML = '<div class="empty-preview">입력값을 확인한 뒤 다시 시도하세요.</div>';
      return;
    }
    state.textContent = `${data.preview.businessName} 문서 초안이 생성되었습니다.`;
    renderDocuments(data.preview.documents || []);
  } catch (error) {
    state.textContent = `문서 생성 중 오류가 발생했습니다: ${error.message}`;
    preview.innerHTML = '<div class="empty-preview">문서 생성 중 오류가 발생했습니다.</div>';
  }
});

try {
  const saved = sessionStorage.getItem('veridion:document결과 예시');
  if (saved) {
    const previewData = JSON.parse(saved);
    if (previewData?.documents?.length) {
      state.textContent = `${previewData.businessName || '입력 정보'} 문서 초안이 준비되었습니다.`;
      renderDocuments(previewData.documents);
      sessionStorage.removeItem('veridion:document결과 예시');
    }
  }
} catch {}

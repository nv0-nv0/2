import { escapeHtml } from '/shared/html.js';

const form = document.getElementById('docForm');
const state = document.getElementById('docState');
const preview = document.getElementById('docView');
const copyBtn = document.getElementById('copyDocBtn');
const saveBtn = document.getElementById('saveDocBtn');
const loadSavedBtn = document.getElementById('loadSavedBtn');
const STORAGE_KEY = 'nv0:workOrder:last';
let latestContent = '';

function renderDocuments(documents = []) {
  latestContent = documents[0]?.content || '';
  if (!latestContent) {
    preview.innerHTML = '<div class="empty-preview">생성된 페이지 수정 요청서가 여기에 표시됩니다.</div>';
    return;
  }
  preview.innerHTML = documents.map(doc => `
    <article class="document-preview stack">
      <h3>${escapeHtml(doc.title || '최종 페이지 수정 요청서')}</h3>
      <div class="preview-toolbar"><span class="pill gray">페이지 수정 요청서</span><span class="muted">복사 후 담당자에게 바로 전달할 수 있습니다.</span></div>
      <pre>${escapeHtml(doc.content)}</pre>
    </article>
  `).join('');
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  state.textContent = '최종 페이지 수정 요청서를 생성하는 중입니다.';
  try {
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    payload.documentKind = 'work_order';
    const res = await fetch('/api/public/document-preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.ok) {
      state.textContent = data.error || '페이지 수정 요청서 생성에 실패했습니다.';
      preview.innerHTML = '<div class="empty-preview">입력값을 확인한 뒤 다시 시도하세요.</div>';
      return;
    }
    state.textContent = '최종 페이지 수정 요청서가 생성되었습니다.';
    renderDocuments(data.preview.documents || []);
  } catch (error) {
    state.textContent = `페이지 수정 요청서 생성 중 오류가 발생했습니다: ${error.message}`;
    preview.innerHTML = '<div class="empty-preview">페이지 수정 요청서 생성 중 오류가 발생했습니다.</div>';
  }
});

copyBtn?.addEventListener('click', async () => {
  if (!latestContent) {
    state.textContent = '복사할 페이지 수정 요청서가 없습니다.';
    return;
  }
  try {
    await navigator.clipboard.writeText(latestContent);
    state.textContent = '페이지 수정 요청서를 클립보드에 복사했습니다.';
  } catch {
    state.textContent = '브라우저 권한 문제로 자동 복사에 실패했습니다. 결과 영역에서 직접 선택해 복사하세요.';
  }
});

saveBtn?.addEventListener('click', () => {
  if (!latestContent) {
    state.textContent = '저장할 페이지 수정 요청서가 없습니다.';
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ content: latestContent, savedAt: new Date().toISOString() }));
  state.textContent = '현재 브라우저에 페이지 수정 요청서를 저장했습니다.';
});

loadSavedBtn?.addEventListener('click', () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (!saved.content) {
      state.textContent = '저장된 페이지 수정 요청서가 없습니다.';
      return;
    }
    state.textContent = '저장된 페이지 수정 요청서를 불러왔습니다.';
    renderDocuments([{ title: '저장된 최종 페이지 수정 요청서', content: saved.content }]);
  } catch {
    state.textContent = '저장본을 불러오지 못했습니다.';
  }
});

try {
  const saved = sessionStorage.getItem('veridion:document결과 예시');
  if (saved) sessionStorage.removeItem('veridion:document결과 예시');
} catch {}

(function () {
  if (window.__NV0_CLIENT_RISK_GUARD__) return;
  window.__NV0_CLIENT_RISK_GUARD__ = true;
  function show(message) {
    try {
      var existing = document.querySelector('.vr-client-risk-banner');
      if (existing) return;
      var box = document.createElement('div');
      box.className = 'vr-client-risk-banner';
      box.setAttribute('role', 'status');
      box.textContent = message || '일부 화면 요소를 불러오지 못했습니다. 새로고침 후에도 반복되면 고객지원으로 문의해 주세요.';
      document.body.appendChild(box);
      setTimeout(function () { box.classList.add('is-visible'); }, 16);
    } catch {}
  }
  window.addEventListener('error', function (event) {
    var target = event && event.target;
    if (target && target !== window && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
      show('일부 정적 파일을 불러오지 못했습니다. 캐시를 비우고 다시 시도해 주세요.');
      return;
    }
    show('화면 처리 중 오류가 감지되었습니다. 입력 내용은 저장하지 않고 안전하게 중단했습니다.');
  }, true);
  window.addEventListener('unhandledrejection', function () {
    show('네트워크 또는 처리 지연이 감지되었습니다. 잠시 후 다시 시도해 주세요.');
  });
})();

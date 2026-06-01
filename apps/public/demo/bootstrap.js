(function () {
  function bindDiagnosisGuard() {
    var form = document.getElementById('unifiedDiagnosisForm');
    var state = document.getElementById('demoState');
    var button = document.getElementById('scanBtn');
    if (!form) return;

    function blockRefresh(event) {
      if (event) event.preventDefault();
      if (typeof window.__veridionRunScan === 'function') {
        window.__veridionRunScan();
        return false;
      }
      if (state) {
        state.className = 'notice warn';
        state.textContent = '진단 화면 초기화가 아직 끝나지 않았습니다. 잠시 후 다시 시도해 주세요.';
      }
      return false;
    }

    form.addEventListener('submit', blockRefresh);
    if (button) {
      button.addEventListener('click', function (event) {
        if (event) event.preventDefault();
        blockRefresh(event);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindDiagnosisGuard, { once: true });
  } else {
    bindDiagnosisGuard();
  }
})();

try {
  const startLinks = Array.from(document.querySelectorAll('a[href="/products/veridion/demo"]'));
  const readiness = document.createElement('div');
  readiness.id = 'demoReadinessStatus';
  readiness.className = 'sr-only';
  readiness.textContent = '무료 진단 안내 페이지 로딩 완료. 모든 안내 버튼은 Veridion 진단 실행 화면으로 연결됩니다.';
  document.querySelector('main')?.appendChild(readiness);

  startLinks.forEach((link, index) => {
    link.dataset.ctaIndex = String(index + 1);
    link.setAttribute('aria-label', 'Veridion 무료 진단 시작 화면으로 이동');
  });
} catch (error) {
  const fallback = document.createElement('div');
  fallback.className = 'sr-only';
  fallback.textContent = '무료 진단 안내 연결 상태를 확인하지 못했습니다. 상단 메뉴의 무료 진단 시작 링크를 이용하세요.';
  document.body?.appendChild(fallback);
}

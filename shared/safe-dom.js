(function () {
  const SAFE_URL_RE = /^(https?:|mailto:|tel:|\/|#)/i;
  const DROP_TAGS = new Set(['SCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'BASE']);
  function sanitizeNode(node) {
    if (!node || !node.childNodes) return;
    Array.from(node.children || []).forEach((child) => {
      if (DROP_TAGS.has(child.tagName)) { child.remove(); return; }
      Array.from(child.attributes || []).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = String(attr.value || '').trim();
        if (name.startsWith('on') || name === 'srcdoc') { child.removeAttribute(attr.name); return; }
        if (['href','src','action','formaction','xlink:href'].includes(name) && value && !SAFE_URL_RE.test(value)) {
          child.removeAttribute(attr.name); return;
        }
        if (name === 'target' && value === '_blank') {
          const rel = new Set(String(child.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
          rel.add('noopener'); rel.add('noreferrer'); child.setAttribute('rel', Array.from(rel).join(' '));
        }
      });
      sanitizeNode(child);
    });
  }
  function htmlFromNodes(root) {
    return Array.from(root.childNodes).map((node) => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
      if (node.outerHTML) return node.outerHTML;
      return node.textContent || '';
    }).join('');
  }
  function sanitizeHtml(source) {
    const doc = new DOMParser().parseFromString(String(source == null ? '' : source), 'text/html');
    sanitizeNode(doc.body);
    return htmlFromNodes(doc.body);
  }
  function renderSafe(target, html) {
    if (!target) return target;
    const source = sanitizeHtml(html);
    if (!source) { target.replaceChildren(); return target; }
    const doc = new DOMParser().parseFromString(source, 'text/html');
    target.replaceChildren(...Array.from(doc.body.childNodes));
    return target;
  }
  function installInnerHtmlGuard() {
    const proto = typeof Element !== 'undefined' ? Element.prototype : null;
    const descriptor = proto && Object.getOwnPropertyDescriptor(proto, 'innerHTML');
    if (!descriptor || !descriptor.set || proto.__nv0InnerHtmlGuardInstalled) return;
    Object.defineProperty(proto, '__nv0InnerHtmlGuardInstalled', { value: true, configurable: false });
    Object.defineProperty(proto, 'innerHTML', {
      configurable: true,
      enumerable: descriptor.enumerable,
      get: function () { return descriptor.get.call(this); },
      set: function (value) { descriptor.set.call(this, sanitizeHtml(value)); }
    });
  }
  installInnerHtmlGuard();
  window.NV0SafeDom = Object.freeze({ renderSafe, sanitizeHtml });
})();

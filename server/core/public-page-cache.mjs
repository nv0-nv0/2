import crypto from 'node:crypto';

export function responseEtag(body) {
  return `W/"${crypto.createHash('sha256').update(body).digest('base64url').slice(0, 20)}-${body.byteLength.toString(16)}"`;
}

export function requestMatchesEtag(req, etag) {
  return String(req?.headers?.['if-none-match'] || '')
    .split(',')
    .map(value => value.trim())
    .some(value => value === '*' || value === etag);
}

export function createPublicPageCache({ enabled = false, readTextFile } = {}) {
  if (typeof readTextFile !== 'function') throw new TypeError('readTextFile must be a function');
  const templateCache = new Map();
  const renderedPublicPageCache = new Map();
  const stats = { templateHits: 0, templateMisses: 0, renderHits: 0, renderMisses: 0 };

  async function readTemplate(htmlPath) {
    if (!enabled) return readTextFile(htmlPath);
    if (templateCache.has(htmlPath)) {
      stats.templateHits += 1;
      return templateCache.get(htmlPath);
    }
    stats.templateMisses += 1;
    const body = await readTextFile(htmlPath);
    templateCache.set(htmlPath, body);
    return body;
  }

  function getRendered(key) {
    if (!enabled) return '';
    if (renderedPublicPageCache.has(key)) {
      stats.renderHits += 1;
      return renderedPublicPageCache.get(key);
    }
    stats.renderMisses += 1;
    return '';
  }

  function setRendered(key, body) {
    if (enabled) renderedPublicPageCache.set(key, body);
    return body;
  }

  function clear() {
    templateCache.clear();
    renderedPublicPageCache.clear();
    for (const key of Object.keys(stats)) stats[key] = 0;
  }

  return Object.freeze({ enabled: Boolean(enabled), readTemplate, getRendered, setRendered, clear, stats });
}

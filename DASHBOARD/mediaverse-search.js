/* ============================================================
   MEDIAVERSE — Shared Search System
   Usage:
     MVSearch.init({ sources: [ {...}, {...} ] });
============================================================ */
(function () {
  'use strict';

  /* ---------- isolated helpers ---------- */
  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
  }
  function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function highlight(text, query) {
    if (!query) return escapeHTML(text);
    const safe = escapeHTML(text);
    const re = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    return safe.replace(re, '<span class="search-highlight">$1</span>');
  }

  const sources = [];
  let els = null;
  let isOpen = false;

  function getEls() {
    if (els) return els;
    els = {
      overlay:  document.getElementById('searchOverlay'),
      input:    document.getElementById('searchInput'),
      results:  document.getElementById('searchResults'),
      hint:     document.getElementById('searchHint'),
      trigger:  document.getElementById('openSearch'),
      closeBtn: document.getElementById('closeSearch'),
    };
    return els;
  }

  function register(source) {
    if (!source || !source.key) return;
    sources.push(source);
  }
  function clearSources() { sources.length = 0; }

  function defaultSearch(item, q) {
    return Object.values(item)
      .filter(v => typeof v === 'string' || typeof v === 'number')
      .join(' ')
      .toLowerCase()
      .includes(q);
  }
  function getData(source) {
    return typeof source.data === 'function' ? source.data() : (source.data || []);
  }

  function defaultRender(item, q, source) {
    const name = item.name || item.title || '';
    const sub  = item.subtitle || item.username || item.creator || '';
    const img  = item.image || item.avatar || '';
    const verified = !!item.verified;

    const imgHtml = img
      ? `<div class="search-result-avatar"><img src="${escapeHTML(img)}" alt=""></div>`
      : `<div class="search-result-avatar" style="display:grid;place-items:center;color:var(--cyan);background:rgba(0,229,255,.10);"><i class="fa-solid fa-user"></i></div>`;

    return `<button class="search-result" type="button">
      ${imgHtml}
      <div class="search-result-info">
        <div class="search-result-title"><span>${highlight(name, q)}</span>${verified?'<i class="fa-solid fa-circle-check"></i>':''}</div>
        <div class="search-result-subtitle">${highlight(sub, q)}</div>
      </div>
      <span class="search-result-type">${escapeHTML(source.type || 'ITEM')}</span>
    </button>`;
  }

  function renderEmptyState() {
    return `<div class="search-empty-state">
      <div class="search-empty-icon"><i class="fa-solid fa-sparkles"></i></div>
      <strong>Explore the Mediaverse</strong>
      <p>Search people, @usernames, IDs, videos, posts, hashtags and ideas.</p>
    </div>`;
  }
  function renderNoResult() {
    return `<div class="no-search-result">
      <i class="fa-solid fa-satellite-dish"></i>
      <strong>No signal found</strong>
      <span>Try another name, ID, video, hashtag or keyword.</span>
    </div>`;
  }

  function renderResults() {
    const e = getEls();
    if (!e.results) return;
    const raw = (e.input?.value || '').trim();
    const q = raw.toLowerCase();

    if (!raw) {
      if (e.hint) e.hint.style.display = 'block';
      e.results.innerHTML = renderEmptyState();
      return;
    }
    if (e.hint) e.hint.style.display = 'none';

    let total = 0, html = '';

    sources.forEach(source => {
      const data = getData(source) || [];
      const matcher = source.search || defaultSearch;
      const matched = data.filter(item => matcher(item, q));
      if (!matched.length) return;

      const limit = source.limit || 5;
      const shown = matched.slice(0, limit);
      total += matched.length;

      const icon = source.icon || 'fa-magnifying-glass';
      html += `<section class="search-section">
        <div class="search-section-title">
          <i class="fa-solid ${icon}"></i> ${escapeHTML(source.label || source.key)}
        </div>`;
      shown.forEach(item => {
        html += (source.render || defaultRender)(item, raw, source);
      });
      html += `</section>`;
    });

    if (total > 0) {
      html = `<div class="search-count">${total} signal${total !== 1 ? 's' : ''} detected in the Mediaverse</div>` + html;
    } else {
      html = renderNoResult();
    }
    e.results.innerHTML = html;
  }

  function open() {
    const e = getEls();
    if (!e.overlay) return;
    e.overlay.classList.add('show');
    if (e.input) e.input.value = '';
    renderResults();
    isOpen = true;
    setTimeout(() => e.input?.focus(), 100);
  }
  function close() {
    const e = getEls();
    if (!e.overlay) return;
    e.overlay.classList.remove('show');
    isOpen = false;
  }

  function init(options) {
    options = options || {};
    const e = getEls();
    if (!e.overlay) {
      console.warn('[MVSearch] search overlay not found');
      return;
    }

    if (Array.isArray(options.sources)) options.sources.forEach(register);

    e.trigger?.addEventListener('click', open);
    e.closeBtn?.addEventListener('click', close);
    e.overlay.addEventListener('click', ev => {
      if (ev.target === e.overlay) close();
    });
    e.input?.addEventListener('input', renderResults);

    document.addEventListener('keydown', ev => {
      if (ev.ctrlKey && ev.key.toLowerCase() === 'k') {
        const tag = (document.activeElement?.tagName || '').toLowerCase();
        const typing = tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable;
        if (typing && !e.overlay.classList.contains('show')) return;
        ev.preventDefault();
        open();
      }
      if (ev.key === 'Escape' && isOpen) close();
    });

    console.log('[MVSearch] ready with', sources.length, 'source(s)');
  }

  window.MVSearch = {
    init, register, clearSources,
    open, close, renderResults,
    escapeHTML, highlight
  };
})();
/* ============================================================
   MEDIAVERSE — Network Status System (Self-Contained)
   ------------------------------------------------------------
   Usage:
     Just add:  <script src="mediaverse-network.js"></script>
   ------------------------------------------------------------
   ✔ Auto-injects HTML if not present
   ✔ Auto-injects CSS if not present
   ✔ Detects existing elements (no double injection)
   ✔ Works on any page
============================================================ */
(function () {
  'use strict';

  /* ---------- Prevent double initialization ---------- */
  if (window._mvNetworkReady) return;
  window._mvNetworkReady = true;

  /* ============================================================
     1) CSS INJECTION
  ============================================================ */
  function injectCSS() {
    if (document.getElementById('mv-network-style')) return;

    const style = document.createElement('style');
    style.id = 'mv-network-style';
    style.textContent = `
      .network-status-overlay{position:fixed;inset:0;z-index:12000;display:flex;align-items:center!important;justify-content:center;padding:18px!important;pointer-events:none;opacity:0;visibility:hidden;transition:opacity .22s ease,visibility .22s ease;background:rgba(4,6,15,.34);backdrop-filter:blur(10px) saturate(120%);-webkit-backdrop-filter:blur(10px) saturate(120%);}
      .network-status-overlay.show{opacity:1;visibility:visible;}
      .network-status-card{width:min(430px,100%);display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:18px;background:linear-gradient(135deg,rgba(255,95,130,.13),rgba(168,85,247,.08)),rgba(15,17,31,.88);border:1px solid rgba(255,255,255,.10);box-shadow:0 22px 60px rgba(0,0,0,.46),inset 0 1px 0 rgba(255,255,255,.13);transform:translateY(14px) scale(.96);transition:transform .3s cubic-bezier(.2,.9,.3,1.2);backdrop-filter:blur(24px) saturate(160%);-webkit-backdrop-filter:blur(24px) saturate(160%);}
      .network-status-overlay.show .network-status-card{transform:translateY(0) scale(1);}
      .network-status-icon{width:38px;height:38px;flex:0 0 38px;display:grid;place-items:center;border-radius:12px;color:#ff8da0;background:rgba(255,95,130,.10);border:1px solid rgba(255,95,130,.18);}
      .network-status-copy{min-width:0;flex:1;}
      .network-status-copy strong{display:block;color:#fff;font-size:11px;font-weight:800;}
      .network-status-copy span{display:block;margin-top:3px;color:#9aa2ba;font-size:9px;line-height:1.45;}
      .network-status-loader{width:24px;height:24px;flex:0 0 24px;border-radius:50%;border:2px solid rgba(255,255,255,.10);border-top-color:#ff7b91;animation:networkSpin .8s linear infinite;}
      .network-status-overlay.restored .network-status-card{background:linear-gradient(135deg,rgba(53,230,154,.13),rgba(0,229,255,.07)),rgba(15,17,31,.88);}
      .network-status-overlay.restored .network-status-icon{color:#55e7ad;background:rgba(53,230,154,.10);border-color:rgba(53,230,154,.18);}
      .network-status-overlay.restored .network-status-loader{border-color:rgba(53,230,154,.22);border-top-color:#53e6ad;animation:none;}
      @keyframes networkSpin{to{transform:rotate(360deg)}}
      html.mv-network-lock,body.mv-network-lock{overflow:hidden!important;}
    `;
    document.head.appendChild(style);
  }

  /* ============================================================
     2) HTML INJECTION — only if not already present
  ============================================================ */
  function injectHTML() {
    let overlay = document.getElementById('networkStatusOverlay');
    if (overlay) return overlay;   // already exists (e.g. home.html)

    overlay = document.createElement('div');
    overlay.className = 'network-status-overlay';
    overlay.id = 'networkStatusOverlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="network-status-card glass" id="networkStatusCard">
        <div class="network-status-icon" id="networkStatusIcon"><i class="fa-solid fa-wifi"></i></div>
        <div class="network-status-copy">
          <strong id="networkStatusTitle">Your internet connection was lost</strong>
          <span id="networkStatusText">Mediaverse is waiting for your connection to return.</span>
        </div>
        <div class="network-status-loader" id="networkStatusLoader"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  /* ============================================================
     3) STATE
  ============================================================ */
  let offlineShown = false;
  let restoreTimer = null;

  /* ============================================================
     4) SHOW / HIDE FUNCTIONS
  ============================================================ */
  function showNetworkLost() {
    document.documentElement.classList.add('mv-network-lock');
    document.body.classList.add('mv-network-lock');

    const overlay = document.getElementById('networkStatusOverlay');
    if (!overlay) return;

    offlineShown = true;
    clearTimeout(restoreTimer);

    const title  = document.getElementById('networkStatusTitle');
    const text   = document.getElementById('networkStatusText');
    const icon   = document.getElementById('networkStatusIcon');
    const loader = document.getElementById('networkStatusLoader');

    overlay.classList.remove('restored');
    if (title)  title.textContent  = 'Your internet connection was lost';
    if (text)   text.textContent   = 'Mediaverse is waiting for your connection to return.';
    if (icon)   icon.innerHTML     = '<i class="fa-solid fa-wifi"></i>';
    if (loader) loader.style.display = 'block';

    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function showNetworkRestored() {
    document.documentElement.classList.remove('mv-network-lock');
    document.body.classList.remove('mv-network-lock');

    const overlay = document.getElementById('networkStatusOverlay');
    if (!overlay || !offlineShown) return;

    const title  = document.getElementById('networkStatusTitle');
    const text   = document.getElementById('networkStatusText');
    const icon   = document.getElementById('networkStatusIcon');
    const loader = document.getElementById('networkStatusLoader');

    overlay.classList.add('restored');
    if (title)  title.textContent  = 'Internet connection restored';
    if (text)   text.textContent   = 'You are back online. Mediaverse is connected again.';
    if (icon)   icon.innerHTML     = '<i class="fa-solid fa-wifi"></i>';
    if (loader) loader.style.display = 'none';

    restoreTimer = setTimeout(() => {
      overlay.classList.remove('show');
      document.documentElement.classList.remove('mv-network-lock');
      document.body.classList.remove('mv-network-lock');
      overlay.setAttribute('aria-hidden', 'true');
      offlineShown = false;
    }, 1900);
  }

  /* ============================================================
     5) BOOT
  ============================================================ */
  function boot() {
    injectCSS();
    injectHTML();

    window.addEventListener('offline', showNetworkLost, { passive: true });
    window.addEventListener('online',  showNetworkRestored, { passive: true });

    if (!navigator.onLine) showNetworkLost();

    console.log('[MV-Network] ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ============================================================
     6) PUBLIC API (for debugging / manual trigger)
  ============================================================ */
  window.MVNetwork = {
    show:     showNetworkLost,
    restore:  showNetworkRestored,
    isOffline() { return !navigator.onLine; }
  };
})();
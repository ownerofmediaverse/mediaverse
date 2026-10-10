/* ============================================================
   MEDIAVERSE — SHARED NOTIFICATION COUNTER
   All pages use this to keep the same unread count.
   Location: NOTIFICATION/notification-count.js
============================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'mv_unread_notifications_v1';
  var LISTEN_KEY  = 'mv_notif_count_update';
  var DEFAULT_COUNT = 16;   /* ⭐ First-time default (matches Notification.html) */

  /* ---------- Read / Write ---------- */
  function getCount() {
    var raw = localStorage.getItem(STORAGE_KEY);

    // ⭐ FIX: First time on this device → seed with default
    if (raw === null) {
      try { localStorage.setItem(STORAGE_KEY, String(DEFAULT_COUNT)); } catch (e) {}
      return DEFAULT_COUNT;
    }

    var n = parseInt(raw, 10);
    return isNaN(n) ? 0 : n;
  }

  function setCount(n) {
    n = Math.max(0, parseInt(n, 10) || 0);
    try { localStorage.setItem(STORAGE_KEY, String(n)); } catch (e) {}
    broadcast();
    applyToAllBadges();
  }

  function increment(delta) {
    setCount(getCount() + (parseInt(delta, 10) || 0));
  }

  function decrement(delta) {
    setCount(getCount() - (parseInt(delta, 10) || 0));
  }

  function clear() {
    setCount(0);
  }

  /* ---------- Multi-tab sync ---------- */
  function broadcast() {
    try {
      localStorage.setItem(LISTEN_KEY, String(Date.now()));
    } catch (e) {}
  }

  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY || e.key === LISTEN_KEY) {
      applyToAllBadges();
    }
  });

  /* ---------- Apply count to every possible badge element ---------- */
  function formatBadge(n) {
    if (n <= 0) return '';
    if (n > 99) return '99+';
    return String(n);
  }

  function applyToAllBadges() {
    var n = getCount();
    var label = formatBadge(n);
    var hasUnread = n > 0;

    /* ⭐ Debug (Console এ দেখতে পাবেন) */
    // console.log('[MVNotifCount] Applying:', n, 'to badges');

    /* ⭐ Home.html — topbar bell (id="notificationDot", class="icon-badge") */
    var dot = document.getElementById('notificationDot');
    if (dot) {
      if (dot.classList.contains('icon-badge')) {
        dot.textContent = label || '';
        dot.classList.toggle('hidden', !hasUnread);
        dot.style.display = hasUnread ? '' : 'none';
      } else {
        // legacy pulse-dot
        dot.style.display = hasUnread ? '' : 'none';
      }
    }

    /* ⭐ Notification.html — topbar bell (id="topbarBadge") */
    var topbarBadge = document.getElementById('topbarBadge');
    if (topbarBadge) {
      topbarBadge.textContent = label || '';
      topbarBadge.classList.toggle('hidden', !hasUnread);
      topbarBadge.style.display = hasUnread ? '' : 'none';
    }

    /* ⭐ Dock nav badge (both pages) */
    var dockBadge = document.getElementById('dockBadge');
    if (dockBadge) {
      dockBadge.textContent = label || '';
      dockBadge.classList.toggle('hidden', !hasUnread);
      dockBadge.style.display = hasUnread ? '' : 'none';
    }

    /* ⭐ Notification.html — alt id */
    var navCount = document.getElementById('navBadgeCount');
    if (navCount) {
      navCount.textContent = label || '';
      navCount.classList.toggle('hidden', !hasUnread);
      navCount.style.display = hasUnread ? '' : 'none';
    }

    /* ⭐ Notification.html — left rail badge */
    var railBadge = document.getElementById('railBadge');
    if (railBadge) {
      railBadge.textContent = label || '';
      railBadge.style.display = hasUnread ? '' : 'none';
    }

    /* ⭐ Document title prefix */
    var cleanTitle = document.title.replace(/^\(\d+\+?\)\s/, '');
    if (hasUnread) {
      document.title = '(' + label + ') ' + cleanTitle;
    } else {
      document.title = cleanTitle;
    }
  }

  /* ---------- Expose global API ---------- */
  window.MVNotifCount = {
    get: getCount,
    set: setCount,
    increment: increment,
    decrement: decrement,
    clear: clear,
    refresh: applyToAllBadges,
    reset: function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch(e){}
      applyToAllBadges();
    }
  };

  /* ---------- Auto apply on DOM ready ---------- */
  function boot() {
    applyToAllBadges();
    setTimeout(applyToAllBadges, 250);
    setTimeout(applyToAllBadges, 900);
    setTimeout(applyToAllBadges, 1800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ---------- Watch for badge elements appearing later ---------- */
  if (window.MutationObserver) {
    var mo = new MutationObserver(function () { applyToAllBadges(); });
    mo.observe(document.body, { childList: true, subtree: true });
  }

})();
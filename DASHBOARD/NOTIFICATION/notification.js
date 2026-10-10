/* ============================================================
   MEDIAVERSE — NOTIFICATION PAGE SCRIPT
   All notification page logic lives here.
   Linked from Notification.html as:
     <script src="notification.js"></script>
============================================================ */
(function () {
  'use strict';

  /* ============================================================
     1) IMAGE FALLBACK ENGINE
     — catches broken images / missing webp reactions
  ============================================================ */
  var REACTION_EMOJI = {
    like: '👍', dislike: '👎', love: '❤️', haha: '😂',
    wow: '😮', sad: '😢', angry: '😡', fire: '🔥'
  };

  var AVATAR_FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#a855f7"/><stop offset="1" stop-color="#00e5ff"/>' +
      '</linearGradient></defs>' +
      '<rect width="100" height="100" fill="url(#g)"/>' +
      '<circle cx="50" cy="38" r="16" fill="rgba(255,255,255,.92)"/>' +
      '<path d="M18 92c4-19 17-28 32-28s28 9 32 28z" fill="rgba(255,255,255,.92)"/>' +
    '</svg>'
  );

  function fixImage(img) {
    if (!img || img.tagName !== 'IMG') return;
    if (img.dataset.mvFallback === '1') return;
    img.dataset.mvFallback = '1';

    var badge = img.closest('.notif-type-badge.type-reaction');
    if (badge) {
      var type = badge.dataset.reaction || 'love';
      badge.innerHTML = '<span class="reaction-emoji">' +
        (REACTION_EMOJI[type] || '❤️') + '</span>';
      return;
    }

    var thumb = img.closest('.notif-thumb');
    if (thumb) {
      img.style.display = 'none';
      thumb.classList.add('thumb-fallback');
      return;
    }

    if (img.closest('.search-result-media')) {
      img.style.display = 'none';
      return;
    }

    img.src = AVATAR_FALLBACK;
  }

  document.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG') fixImage(t);
  }, true);

  function sweepImages() {
    var imgs = document.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      var im = imgs[i];
      if (im.complete && im.naturalWidth === 0) fixImage(im);
    }
  }

  setTimeout(sweepImages, 250);
  setTimeout(sweepImages, 1600);

  window.mvFixBrokenImages = sweepImages;
  window.mvFixImage = fixImage;

  /* ============================================================
     2) TOAST
  ============================================================ */
  var toastTimer = null;
  function showToast(message) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, 2600);
  }
  window.showToast = showToast;

  /* ============================================================
     3) HELPERS
  ============================================================ */
  function formatBadgeCount(n) {
    if (n <= 0) return '';
    if (n > 99) return '99+';
    return String(n);
  }

function updateAllBadges() {
  var items = [].slice.call(document.querySelectorAll('.notif-item'));

  function countBy(type) {
    return items.filter(function (el) {
      return el.dataset.type === type;
    }).length;
  }

  /* Tab counts — শুধু notification page এর filter tabs এর জন্য */
  var tabCounts = {
    all: items.length,
    unread: document.querySelectorAll('.notif-item.unread').length,
    requests: countBy('requests'),
    mentions: countBy('mentions'),
    reactions: countBy('reactions'),
    comments: countBy('comments'),
    reports: countBy('reports'),
    support: countBy('support')
  };

  document.querySelectorAll('[data-count-for]').forEach(function (el) {
    var key = el.dataset.countFor;
    if (tabCounts[key] !== undefined) el.textContent = tabCounts[key];
  });
}

  function closeAllMenus() {
    document.querySelectorAll('.notif-menu.show').forEach(function (m) {
      m.classList.remove('show', 'flip-up');
    });
    document.querySelectorAll('.notif-more.active').forEach(function (b) {
      b.classList.remove('active');
    });
    document.querySelectorAll('.notif-item.menu-open').forEach(function (i) {
      i.classList.remove('menu-open');
    });
  }

function removeItemAnimated(item, done) {
  var wasUnread = item.classList.contains('unread');
  item.style.transition = 'opacity .3s ease, transform .3s ease, height .3s ease, margin .3s ease, padding .3s ease';
  item.style.opacity = '0';
  item.style.transform = 'translateX(30px)';
  item.style.height = item.offsetHeight + 'px';
  setTimeout(function () {
    item.style.height = '0';
    item.style.margin = '0';
    item.style.padding = '0';
  }, 20);
  setTimeout(function () {
    if (wasUnread && window.MVNotifCount) {
      window.MVNotifCount.decrement(1);
    }
    item.remove();
    updateAllBadges();
    if (done) done();
  }, 360);
}
  /* ============================================================
     4) INIT (runs once DOM is ready)
  ============================================================ */
  function init() {

/* ---------- Hero collapse ---------- */
(function () {
  var hero = document.getElementById('notifHero');
  var toggle = document.getElementById('heroToggle');
  if (!hero || !toggle) return;

  var KEY = 'mv-notif-hero-collapsed';

  function setCollapsed(collapsed, save) {
    hero.classList.toggle('collapsed', collapsed);

    // aria + title for accessibility
    toggle.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
    toggle.setAttribute('title', collapsed ? 'Show this section' : 'Hide this section');

    if (save) {
      try { localStorage.setItem(KEY, collapsed ? '1' : '0'); } catch (e) {}
    }
  }

  var saved = '0';
  try { saved = localStorage.getItem(KEY) || '0'; } catch (e) {}
  setCollapsed(saved === '1', false);

  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    setCollapsed(!hero.classList.contains('collapsed'), true);
  });
})();

    /* ---------- Filter tabs ---------- */
    var tabs = document.querySelectorAll('.notif-tab');
    var notifItems = document.querySelectorAll('.notif-item');

    function applyFilter(filter) {
      notifItems.forEach(function (item) {
        var type = item.dataset.type || '';
        var isUnread = item.classList.contains('unread');
        var show = true;
        if (filter === 'all') show = true;
        else if (filter === 'unread') show = isUnread;
        else if (filter === 'system') show = (type === 'system');
        else show = (type === filter);
        item.style.display = show ? '' : 'none';
      });

      document.querySelectorAll('.notif-day-divider').forEach(function (div) {
        var next = div.nextElementSibling;
        var hasVisible = false;
        while (next && !next.classList.contains('notif-day-divider')) {
          if (next.classList.contains('notif-list')) {
            next.querySelectorAll('.notif-item').forEach(function (it) {
              if (it.style.display !== 'none') hasVisible = true;
            });
          }
          next = next.nextElementSibling;
        }
        div.style.display = hasVisible ? '' : 'none';
      });

      if (window.mvFixBrokenImages) setTimeout(window.mvFixBrokenImages, 120);
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        applyFilter(tab.dataset.filter);
      });
    });

    /* ---------- Mark all read ---------- */
var markAllBtn = document.getElementById('markAllRead');
if (markAllBtn) {
  markAllBtn.addEventListener('click', function () {
    document.querySelectorAll('.notif-item.unread').forEach(function (el) {
      el.classList.remove('unread');
    });
    if (window.MVNotifCount) window.MVNotifCount.clear();
    updateAllBadges();
    showToast('All notifications marked as read ✦');
  });
}

    /* ---------- Topbar bell panel ---------- */
    var notificationButton = document.getElementById('notificationButton');
    var notificationPanel = document.getElementById('notificationPanel');
    var markRead = document.getElementById('markRead');

    if (notificationButton && notificationPanel) {
      notificationButton.addEventListener('click', function (e) {
        e.stopPropagation();
        notificationPanel.classList.toggle('show');
      });
    }
    if (markRead) {
      markRead.addEventListener('click', function () {
        showToast('All signals marked as read');
      });
    }
    document.addEventListener('click', function (e) {
      if (notificationPanel && notificationButton &&
          !notificationPanel.contains(e.target) &&
          !notificationButton.contains(e.target)) {
        notificationPanel.classList.remove('show');
      }
    });

    /* ---------- Mute-user menu items ---------- */
    (function injectMuteUserItems() {
      var MUTE_USER_TYPES = ['reactions', 'comments', 'mentions', 'requests'];
      document.querySelectorAll('.notif-item').forEach(function (item) {
        if (MUTE_USER_TYPES.indexOf(item.dataset.type) === -1) return;
        var menu = item.querySelector('.notif-menu');
        if (!menu || menu.querySelector('.mi-mute-user')) return;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'notif-menu-item mi-mute-user';
        btn.innerHTML =
          '<span class="mi-icon"><i class="fa-solid fa-user-slash"></i></span>' +
          '<span class="mi-info">' +
            '<span class="mi-title">Mute this user</span>' +
            '<span class="mi-desc">Stop all notifications from this person</span>' +
          '</span>';

        var divider = menu.querySelector('.notif-menu-divider');
        if (divider) menu.insertBefore(btn, divider);
        else menu.appendChild(btn);
      });
    })();

    /* ---------- 3-dot menu ---------- */
    function openMenu(moreBtn) {
      var wrap = moreBtn.closest('.notif-menu-wrap');
      var menu = wrap && wrap.querySelector('.notif-menu');
      var item = moreBtn.closest('.notif-item');
      if (!menu) return;

      closeAllMenus();
      if (item) item.classList.add('menu-open');
      moreBtn.classList.add('active');

      menu.classList.remove('flip-up');
      menu.style.visibility = 'hidden';
      menu.style.display = 'block';
      var mRect = menu.getBoundingClientRect();
      var spaceBelow = window.innerHeight - mRect.bottom;
      var spaceAbove = mRect.top - 8;
      if (spaceBelow < 14 && spaceAbove > mRect.height + 8) {
        menu.classList.add('flip-up');
      }
      menu.style.visibility = '';
      menu.style.display = '';
      menu.classList.add('show');
    }

    document.addEventListener('click', function (e) {
      var moreBtn = e.target.closest('.notif-more');
      if (moreBtn) {
        e.stopPropagation();
        var wrap = moreBtn.closest('.notif-menu-wrap');
        var menu = wrap && wrap.querySelector('.notif-menu');
        var alreadyOpen = menu && menu.classList.contains('show');
        if (alreadyOpen) closeAllMenus();
        else openMenu(moreBtn);
        return;
      }

      var menuItem = e.target.closest('.notif-menu-item');
      if (menuItem) {
        e.stopPropagation();
        var item = menuItem.closest('.notif-item');
        var action = '';
        if (menuItem.classList.contains('mi-read'))            action = 'read';
        else if (menuItem.classList.contains('mi-mute'))       action = 'mute';
        else if (menuItem.classList.contains('mi-mute-user'))  action = 'mute-user';
        else if (menuItem.classList.contains('mi-pin'))        action = 'pin';
        else if (menuItem.classList.contains('mi-appeal'))     action = 'appeal';
        else if (menuItem.classList.contains('mi-ticket'))     action = 'ticket';
        else if (menuItem.classList.contains('mi-remove'))     action = 'remove';

if (action === 'read' && item) {
tains('unread') && window.MVNotifCount) {
    window.MVNotifCount.decrement(1);
  }
  item.classList.remove('unread');
  updateAllBadges();
  showToast('Marked as read ✦');
}
        else if (action === 'mute') {
          showToast('Notifications muted for this thread 🔕');
        }
        else if (action === 'mute-user') {
          var nameEl = item && item.querySelector('.notif-text b');
          var name = nameEl ? nameEl.textContent : 'this user';
          showToast('All notifications from ' + name + ' muted 🔕');
        }
else if (action === 'appeal') {
  if (item && item.classList.contains('unread') && window.MVNotifCount) {
    window.MVNotifCount.decrement(1);
  }
  showToast('Appeal submitted — our team will review it within 24–48h ⚖️');
  if (item) { item.classList.remove('unread'); updateAllBadges(); }
}
        else if (action === 'ticket') {
          showToast('Opening support center…');
        }
        else if (action === 'pin' && item) {
          var list = item.parentElement;
          if (list && list.firstElementChild !== item) {
            list.insertBefore(item, list.firstElementChild);
          }
          showToast('Request pinned to the top 📌');
        }
        else if (action === 'remove' && item) {
          removeItemAnimated(item);
          showToast('Notification removed');
        }

        closeAllMenus();
        return;
      }

      if (!e.target.closest('.notif-menu')) closeAllMenus();
    });

    window.addEventListener('resize', closeAllMenus);
    window.addEventListener('orientationchange', closeAllMenus);

    /* ---------- Card click ---------- */
    document.addEventListener('click', function (e) {
      if (e.target.closest('.notif-more, .notif-menu, .notif-act, .notif-actions, button, a')) return;

      var item = e.target.closest('.notif-item');
      if (!item) return;

      item.classList.add('opened');
      setTimeout(function () { item.classList.remove('opened'); }, 700);

      var type = item.dataset.type || '';
      var labels = {
        requests: 'Friend request',
        mentions: 'Mention',
        reactions: 'Reaction',
        comments: 'Comment',
        reports: 'Report update',
        support: 'Support ticket',
        system: 'System update'
      };
      showToast((labels[type] || 'Notification') + ' opened ✦');

if (item.classList.contains('unread')) {
  if (window.MVNotifCount) window.MVNotifCount.decrement(1);
  item.classList.remove('unread');
  updateAllBadges();
}
    });

    /* ---------- Friend request accept / decline ---------- */
    document.addEventListener('click', function (e) {
      var reqBtn = e.target.closest('[data-request-action]');
      if (reqBtn) {
        e.stopPropagation();
        var item = reqBtn.closest('.notif-item');
        var action = reqBtn.dataset.requestAction;

        if (action === 'accept') {
  showToast('Friend request accepted 🎉');
  if (item) {
    var actions = item.querySelector('.notif-actions');
    if (actions) {
      actions.innerHTML =
        '<button class="notif-act following" type="button">' +
          '<i class="fa-solid fa-check"></i> Friends now' +
        '</button>';
    }
    if (item.classList.contains('unread') && window.MVNotifCount) {
      window.MVNotifCount.decrement(1);
    }
    item.classList.remove('unread');
    updateAllBadges();
  }
}
 else if (action === 'decline') {
          showToast('Friend request declined');
          if (item) removeItemAnimated(item);
        }
        return;
      }

      var followBtn = e.target.closest('[data-follow-back]');
      if (followBtn) {
        e.stopPropagation();
        var isFollowing = followBtn.classList.toggle('following');
        if (isFollowing) {
          followBtn.innerHTML = '<i class="fa-solid fa-check"></i> Following';
          followBtn.classList.remove('accept');
          showToast('Now following back ✦');
        } else {
          followBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Follow back';
          followBtn.classList.add('accept');
        }
      }
    });

    /* ---------- Hero buttons ---------- */
    var settingsBtn = document.getElementById('notifSettings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', function () {
        showToast('Notification settings coming soon');
      });
    }
    var quickCreate = document.getElementById('quickCreate');
    if (quickCreate) {
      quickCreate.addEventListener('click', function () {
        showToast('Create flow coming soon');
      });
    }

    /* ---------- Right rail follow ---------- */
    document.querySelectorAll('.follow').forEach(function (button) {
      button.addEventListener('click', function () {
        var active = button.classList.toggle('following');
        button.textContent = active ? 'Following' : 'Follow';
        showToast(active ? 'Now following' : 'Unfollowed');
      });
    });

    /* ---------- Nav links ---------- */
    document.querySelectorAll('.nav-link').forEach(function (link) {
      link.addEventListener('click', function (e) {
        if (link.getAttribute('href') === 'home.html') return;
        e.preventDefault();
        document.querySelectorAll('.nav-link').forEach(function (item) {
          item.classList.remove('active');
        });
        link.classList.add('active');
        showToast(link.textContent.trim() + ' opening soon');
      });
    });

    /* ---------- Search modal ---------- */
    var openSearch = document.getElementById('openSearch');
    var searchOverlay = document.getElementById('searchOverlay');
    var closeSearch = document.getElementById('closeSearch');
    var searchInput = document.getElementById('searchInput');

    if (openSearch && searchOverlay) {
      openSearch.addEventListener('click', function () {
        searchOverlay.classList.add('show');
        setTimeout(function () { if (searchInput) searchInput.focus(); }, 120);
      });
    }
    if (closeSearch && searchOverlay) {
      closeSearch.addEventListener('click', function () {
        searchOverlay.classList.remove('show');
      });
    }
    if (searchOverlay) {
      searchOverlay.addEventListener('click', function (e) {
        if (e.target === searchOverlay) searchOverlay.classList.remove('show');
      });
    }
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (searchOverlay) {
          searchOverlay.classList.add('show');
          setTimeout(function () { if (searchInput) searchInput.focus(); }, 120);
        }
      }
      if (e.key === 'Escape') {
        if (searchOverlay) searchOverlay.classList.remove('show');
        closeAllMenus();
      }
    });

    /* ---------- Reaction webp engine ---------- */
    (function () {
      var NOTIF_REACTION_ICONS = {
        like:    'reactions/like.webp',
        dislike: 'reactions/dislike.webp',
        love:    'reactions/love.webp',
        haha:    'reactions/haha.webp',
        wow:     'reactions/wow.webp',
        sad:     'reactions/sad.webp',
        angry:   'reactions/angry.webp',
        fire:    'reactions/fire.webp'
      };
      var NOTIF_REACTION_LABELS = {
        like: 'Like', dislike: 'Dislike', love: 'Love', haha: 'Haha',
        wow: 'Wow', sad: 'Sad', angry: 'Angry', fire: 'Fire'
      };

      function detectReactionFromText(text) {
        var t = String(text || '').toLowerCase();
        if (/ha\s*ha|laugh|funny|😂|🤣/.test(t)) return 'haha';
        if (/fire|lit\b|🔥/.test(t)) return 'fire';
        if (/wow|amaz|surpris|😮|😲/.test(t)) return 'wow';
        if (/angry|mad|😡|😠/.test(t)) return 'angry';
        if (/sad|cry|😢|😭/.test(t)) return 'sad';
        if (/dislike|👎/.test(t)) return 'dislike';
        if (/like|👍/.test(t)) return 'like';
        if (/love|❤|💖|💕|😍|🥰/.test(t)) return 'love';
        return null;
      }

      function applyNotificationReactionBadges(root) {
        (root || document).querySelectorAll('.notif-type-badge.type-reaction').forEach(function (badge) {
          if (badge.dataset.mvReactionApplied === '1') return;

          var type = badge.dataset.reaction;
          if (!type) {
            var item = badge.closest('.notif-item');
            var textEl = item && item.querySelector('.notif-text');
            var subEl = item && item.querySelector('.notif-sub');
            var text = textEl ? textEl.textContent : '';
            var sub = subEl ? subEl.textContent : '';
            type = detectReactionFromText(text) || detectReactionFromText(sub) || 'love';
          }
          if (!NOTIF_REACTION_ICONS[type]) type = 'love';

          badge.dataset.reaction = type;
          badge.dataset.mvReactionApplied = '1';
          badge.innerHTML =
            '<img src="' + NOTIF_REACTION_ICONS[type] + '" alt="' +
            NOTIF_REACTION_LABELS[type] + '" draggable="false">';
        });

        if (window.mvFixBrokenImages) window.mvFixBrokenImages();
      }

      applyNotificationReactionBadges();

      var container = document.getElementById('notifListContainer');
      if (container && window.MutationObserver) {
        new MutationObserver(function (muts) {
          muts.forEach(function (m) {
            m.addedNodes.forEach(function (n) {
              if (n.nodeType !== 1) return;
              if (n.classList && n.classList.contains('notif-item')) {
                applyNotificationReactionBadges(n.parentNode || document);
              } else if (n.querySelectorAll) {
                applyNotificationReactionBadges(n);
              }
            });
          });
        }).observe(container, { childList: true, subtree: true });
      }

      window.mvApplyNotifReactionBadges = applyNotificationReactionBadges;

      setTimeout(function () {
        if (window.mvFixBrokenImages) window.mvFixBrokenImages();
      }, 1200);
    })();

    /* ---------- Search sources (MVSearch) ---------- */
    (function () {
      if (!window.MVSearch) return;

      var searchPeople = [
        { name: 'Sorufa Begum', username: '@sorufa', id: 'MV-102948', image: 'https://i.pravatar.cc/150?img=32', verified: true, subtitle: 'Digital creator · 24.8K followers' },
        { name: 'Sohagi Akter', username: '@sohagi', id: 'MV-209331', image: 'https://i.pravatar.cc/150?img=47', verified: false, subtitle: 'Creator · Photography & lifestyle' },
        { name: 'Aduri Akter', username: '@aduri', id: 'MV-842671', image: 'https://i.pravatar.cc/150?img=59', verified: true, subtitle: 'Creator · 12.4K followers' },
        { name: 'Emma Wilson', username: '@emmawilson', id: 'MV-456891', image: 'https://i.pravatar.cc/150?img=45', verified: true, subtitle: 'Tech creator · Product designer' },
        { name: 'Daniel Lee', username: '@daniellee', id: 'MV-764201', image: 'https://i.pravatar.cc/150?img=14', verified: false, subtitle: 'Creative thinker · Universe explorer' },
        { name: 'Olivia Chen', username: '@oliviachen', id: 'MV-918332', image: 'https://i.pravatar.cc/150?img=49', verified: true, subtitle: 'Visual artist · 8.2K followers' }
      ];

      var searchVideos = [
        { title: 'Building the Next Digital World', creator: 'Sorufa Begum', duration: '12:48', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=500&q=80' },
        { title: 'The Future of Artificial Intelligence', creator: 'Emma Wilson', duration: '08:21', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=500&q=80' },
        { title: 'Creating Your Digital Universe', creator: 'Aduri Akter', duration: '15:02', image: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=500&q=80' }
      ];

      var searchTrends = [
        { title: '#ArtificialIntelligence', subtitle: '18.4K posts' },
        { title: '#CreateTheFuture', subtitle: '12.7K posts' },
        { title: '#DigitalDreams', subtitle: '9.3K posts' },
        { title: '#Mediaverse', subtitle: 'Growing across the universe' }
      ];

      MVSearch.init({
        sources: [
          { key: 'people', label: 'People', icon: 'fa-user-group', type: 'PERSON', data: searchPeople, limit: 5 },
          {
            key: 'videos', label: 'Video Posts', icon: 'fa-circle-play', type: 'VIDEO',
            data: searchVideos,
            search: function (v, q) {
              return (v.title + ' ' + v.creator).toLowerCase().indexOf(q) !== -1;
            },
            render: function (v, q) {
              return '<button class="search-result" type="button">' +
                '<div class="search-result-media">' +
                  '<img src="' + MVSearch.escapeHTML(v.image) + '" alt="">' +
                  '<div class="video-play-icon"><i class="fa-solid fa-play"></i></div>' +
                '</div>' +
                '<div class="search-result-info">' +
                  '<div class="search-result-title"><span>' + MVSearch.highlight(v.title, q) + '</span></div>' +
                  '<div class="search-result-subtitle">' + MVSearch.highlight(v.creator, q) + ' · ' + v.duration + '</div>' +
                '</div>' +
                '<span class="search-result-type">VIDEO</span>' +
              '</button>';
            },
            limit: 4
          },
          {
            key: 'trends', label: 'Trending Posts', icon: 'fa-chart-line', type: 'TREND',
            data: searchTrends,
            search: function (t, q) {
              return (t.title + ' ' + t.subtitle).toLowerCase().indexOf(q) !== -1;
            },
            render: function (t, q) {
              return '<button class="search-result" type="button">' +
                '<div class="search-result-avatar" style="display:grid;place-items:center;color:var(--purple);background:rgba(168,85,247,.10);">' +
                  '<i class="fa-solid fa-hashtag"></i>' +
                '</div>' +
                '<div class="search-result-info">' +
                  '<div class="search-result-title"><span>' + MVSearch.highlight(t.title, q) + '</span></div>' +
                  '<div class="search-result-subtitle">' + t.subtitle + '</div>' +
                '</div>' +
                '<span class="search-result-type">TREND</span>' +
              '</button>';
            },
            limit: 4
          }
        ]
      });
    })();

    /* ---------- Initial badge sync ---------- */
    updateAllBadges();
  }

  /* ============================================================
     5) BOOTSTRAP
  ============================================================ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
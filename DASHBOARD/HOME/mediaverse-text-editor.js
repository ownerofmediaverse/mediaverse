/* ============================================================
   MEDIAVERSE TEXT STUDIO — FIXED VERSION
   Fixes:
   - Drag stuck on readonly textarea → uses overlay
   - Font size not changing on mobile → uses CSS variable
   - Edit restores wrong style → restores AFTER resetComposer
   ============================================================ */
(function(){
'use strict';

/* ============ 1) Google Fonts ============ */
(function(){
  if(document.getElementById('mv-te-fonts-link')) return;
  const link = document.createElement('link');
  link.id = 'mv-te-fonts-link';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,700&family=Oswald:wght@400;700&family=Dancing+Script:wght@700&family=Bebas+Neue&family=Roboto+Mono:wght@400;700&family=Pacifico&family=Lobster&family=Poppins:wght@400;600;800&display=swap';
  document.head.appendChild(link);
})();

/* ============ 2) Constants ============ */
const FONTS = [
  { id:'space',   label:'Space Grotesk', css:"'Space Grotesk', sans-serif" },
  { id:'inter',   label:'Inter',         css:"'Inter', sans-serif" },
  { id:'poppins', label:'Poppins',       css:"'Poppins', sans-serif" },
  { id:'playfair',label:'Playfair',      css:"'Playfair Display', serif" },
  { id:'oswald',  label:'Oswald',        css:"'Oswald', sans-serif" },
  { id:'bebas',   label:'Bebas Neue',    css:"'Bebas Neue', sans-serif" },
  { id:'mono',    label:'Roboto Mono',   css:"'Roboto Mono', monospace" },
  { id:'dancing', label:'Dancing Script',css:"'Dancing Script', cursive" },
  { id:'pacifico',label:'Pacifico',      css:"'Pacifico', cursive" },
  { id:'lobster', label:'Lobster',       css:"'Lobster', cursive" },
  { id:'georgia', label:'Georgia',       css:"Georgia, serif" }
];

const PRESET_COLORS = [
  '#ffffff','#080914','#ff4ecd','#00e5ff','#a855f7','#ff9f43',
  '#35e69a','#ffd43b','#4d7cff','#ff6b6b','#ffb199','#7cecff'
];

const EFFECTS = [
  { id:'none',    label:'None',    icon:'fa-ban' },
  { id:'shadow',  label:'Shadow',  icon:'fa-clone' },
  { id:'glow',    label:'Glow',    icon:'fa-sun' },
  { id:'outline', label:'Outline', icon:'fa-font' },
  { id:'gradient',label:'Gradient',icon:'fa-palette' }
];

const DEFAULTS = {
  fontId:'space', fontSize:22,
  bold:true, italic:false, underline:false,
  color:'#ffffff', align:'center',
  letterSpacing:0, lineHeight:1.35,
  effect:'none', effectColor:'#00e5ff',
  gradientFrom:'#00e5ff', gradientTo:'#a855f7',
  x:50, y:50, moveMode:false, custom:false
};

let style = Object.assign({}, DEFAULTS);

/* ============ 3) Helpers ============ */
function hexToRgba(hex, a){
  const m = String(hex||'#fff').replace('#','');
  const h = m.length === 3 ? m.split('').map(c=>c+c).join('') : m;
  const n = parseInt(h,16) || 0;
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}
function getFontCss(){
  const f = FONTS.find(x => x.id === style.fontId);
  return f ? f.css : FONTS[0].css;
}
function onReady(fn){
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
  else fn();
}
function camelToKebab(s){
  return s.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
}

/* ============ 4) Compute text styles (camelCase object) ============ */
function computeTextStyles(){
  const css = {
    fontFamily: getFontCss(),
    fontSize: style.fontSize + 'px',
    fontWeight: style.bold ? '800' : '400',
    fontStyle: style.italic ? 'italic' : 'normal',
    textDecoration: style.underline ? 'underline' : 'none',
    color: style.color,
    textAlign: style.align,
    letterSpacing: style.letterSpacing + 'px',
    lineHeight: String(style.lineHeight),
    textShadow: 'none',
    WebkitTextStroke: '0',
    background: '',
    WebkitBackgroundClip: '',
    backgroundClip: '',
    WebkitTextFillColor: style.color
  };

  if(style.effect === 'shadow'){
    css.textShadow = `0 4px 14px ${hexToRgba(style.effectColor,0.85)}, 0 2px 4px rgba(0,0,0,.65)`;
  } else if(style.effect === 'glow'){
    css.textShadow = `0 0 8px ${style.effectColor}, 0 0 22px ${style.effectColor}, 0 0 44px ${hexToRgba(style.effectColor,.55)}`;
  } else if(style.effect === 'outline'){
    css.WebkitTextStroke = `2px ${style.effectColor}`;
    css.textShadow = '0 3px 10px rgba(0,0,0,.55)';
  } else if(style.effect === 'gradient'){
    css.background = `linear-gradient(135deg, ${style.gradientFrom}, ${style.gradientTo})`;
    css.WebkitBackgroundClip = 'text';
    css.backgroundClip = 'text';
    css.WebkitTextFillColor = 'transparent';
    css.color = 'transparent';
  }
  return css;
}

/* ============ 5) Apply styles with !important (fixes mobile override) ============ */
function applyImportantStyles(el, cssObj){
  if(!el) return;
  Object.keys(cssObj).forEach(k => {
    const prop = camelToKebab(k);
    const val  = cssObj[k];
    try{
      if(val == null || val === ''){
        el.style.removeProperty(prop);
      } else {
        el.style.setProperty(prop, val, 'important');
      }
    }catch(e){}
  });
}

/* ============ 6) Apply to composer ============ */
function applyToComposer(){
  const area  = document.getElementById('composerTextArea');
  const input = document.getElementById('postInput');
  if(!area || !input) return;

  const css = computeTextStyles();

  /* Clear previous inline styles we own, then set with !important */
  [
    'font-family','font-size','font-weight','font-style','text-decoration',
    'color','text-align','letter-spacing','line-height','text-shadow',
    '-webkit-text-stroke','background','-webkit-background-clip','background-clip',
    '-webkit-text-fill-color'
  ].forEach(p => { try { input.style.removeProperty(p); } catch(e){} });

  applyImportantStyles(input, css);

  /* ⭐ CSS variable for font-size (mobile !important beat) */
  input.style.setProperty('--mv-text-size', style.fontSize + 'px');

  /* Position variables */
  area.style.setProperty('--mv-text-x', style.x + '%');
  area.style.setProperty('--mv-text-y', style.y + '%');

  area.classList.toggle('mv-te-custom',    !!style.custom);
  area.classList.toggle('mv-te-move-mode', !!style.moveMode);

  /* Ensure overlay exists */
  ensureDragOverlay(area);
}

/* ============ 7) Apply to published post ============ */
function applyStyleToPost(post){
  if(!post) return;
  const textEl = post.querySelector('.post-text');
  if(!textEl) return;

  const css = computeTextStyles();
  const hasBg = textEl.classList.contains('has-bg');

  if(hasBg){
    let inner = textEl.querySelector(':scope > .mv-text-inner');
    if(!inner){
      const raw = textEl.textContent;
      textEl.innerHTML = '';
      inner = document.createElement('span');
      inner.className = 'mv-text-inner';
      inner.textContent = raw;
      textEl.appendChild(inner);
    }
    /* clear then apply */
    ['font-family','font-size','font-weight','font-style','text-decoration','color',
     'text-align','letter-spacing','line-height','text-shadow','-webkit-text-stroke',
     'background','-webkit-background-clip','background-clip','-webkit-text-fill-color'
    ].forEach(p => { try { inner.style.removeProperty(p); } catch(e){} });
    applyImportantStyles(inner, css);

    textEl.style.setProperty('--mv-text-x', style.x + '%');
    textEl.style.setProperty('--mv-text-y', style.y + '%');
    textEl.classList.add('mv-text-custom');
  } else {
    ['font-family','font-size','font-weight','font-style','text-decoration','color',
     'text-align','letter-spacing','line-height','text-shadow','-webkit-text-stroke',
     'background','-webkit-background-clip','background-clip','-webkit-text-fill-color'
    ].forEach(p => { try { textEl.style.removeProperty(p); } catch(e){} });
    applyImportantStyles(textEl, css);
    textEl.classList.add('mv-text-custom');
  }

  post._mvData = post._mvData || {};
  post._mvData.textStyle = Object.assign({}, style);
}

/* ============ 8) Populate panel buttons ============ */
function populatePanel(){
  const panel = document.getElementById('mvTePanel');
  if(!panel) return;

  const fontsBox   = panel.querySelector('#mvTeFonts');
  const swatchBox  = panel.querySelector('#mvTeSwatches');
  const effectsBox = panel.querySelector('#mvTeEffects');

  if(fontsBox && !fontsBox.dataset.done){
    fontsBox.innerHTML = FONTS.map(f =>
      `<button type="button" class="mv-te-font-btn" data-font="${f.id}" style="font-family:${f.css}">${f.label}</button>`
    ).join('');
    fontsBox.dataset.done = '1';
  }
  if(swatchBox && !swatchBox.dataset.done){
    swatchBox.innerHTML = PRESET_COLORS.map(c =>
      `<button type="button" class="mv-te-swatch" data-color="${c}" style="--c:${c}" title="${c}" aria-label="Color ${c}"></button>`
    ).join('');
    swatchBox.dataset.done = '1';
  }
  if(effectsBox && !effectsBox.dataset.done){
    effectsBox.innerHTML = EFFECTS.map(e =>
      `<button type="button" class="mv-te-effect-btn" data-effect="${e.id}"><i class="fa-solid ${e.icon}"></i> ${e.label}</button>`
    ).join('');
    effectsBox.dataset.done = '1';
  }
}

/* ============ 9) Wire panel ============ */
function wirePanel(){
  const panel = document.getElementById('mvTePanel');
  if(!panel || panel.dataset.wired) return;
  panel.dataset.wired = '1';

  panel.querySelector('#mvTeFonts').addEventListener('click', e => {
    const b = e.target.closest('.mv-te-font-btn');
    if(!b) return;
    style.fontId = b.dataset.font; style.custom = true;
    syncUI(); applyToComposer();
  });

  const sizeInput = panel.querySelector('#mvTeSize');
  sizeInput.addEventListener('input', () => {
    const v = Math.max(10, Math.min(72, parseInt(sizeInput.value,10) || 22));
    style.fontSize = v; style.custom = true;
    applyToComposer();
  });
  panel.querySelectorAll('[data-size]').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = parseInt(btn.dataset.size,10);
      style.fontSize = Math.max(10, Math.min(72, style.fontSize + d));
      style.custom = true;
      syncUI(); applyToComposer();
    });
  });

  panel.querySelectorAll('.mv-te-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      style[btn.dataset.style] = !style[btn.dataset.style];
      style.custom = true;
      syncUI(); applyToComposer();
    });
  });

  panel.querySelectorAll('[data-align]').forEach(btn => {
    btn.addEventListener('click', () => {
      style.align = btn.dataset.align; style.custom = true;
      syncUI(); applyToComposer();
    });
  });

  panel.querySelector('#mvTeColor').addEventListener('input', e => {
    style.color = e.target.value; style.custom = true;
    syncUI(); applyToComposer();
  });

  panel.querySelector('#mvTeSwatches').addEventListener('click', e => {
    const s = e.target.closest('.mv-te-swatch');
    if(!s) return;
    style.color = s.dataset.color; style.custom = true;
    syncUI(); applyToComposer();
  });

  panel.querySelector('#mvTeEffects').addEventListener('click', e => {
    const b = e.target.closest('.mv-te-effect-btn');
    if(!b) return;
    style.effect = b.dataset.effect; style.custom = true;
    syncUI(); applyToComposer();
  });

  panel.querySelector('#mvTeEffectColor').addEventListener('input', e => {
    style.effectColor = e.target.value; style.custom = true; applyToComposer();
  });
  panel.querySelector('#mvTeGradFrom').addEventListener('input', e => {
    style.gradientFrom = e.target.value; style.custom = true; applyToComposer();
  });
  panel.querySelector('#mvTeGradTo').addEventListener('input', e => {
    style.gradientTo = e.target.value; style.custom = true; applyToComposer();
  });

  /* Move mode */
  panel.querySelector('#mvTeMove').addEventListener('click', () => {
    style.moveMode = !style.moveMode;
    syncUI(); applyToComposer();
    if(style.moveMode && typeof showToast === 'function'){
      showToast('Move mode ON — drag the text on the canvas');
    }
  });

  /* Center */
  panel.querySelector('#mvTeCenter').addEventListener('click', () => {
    style.x = 50; style.y = 50;
    applyToComposer();
    const xy = panel.querySelector('#mvTeXY');
    if(xy) xy.textContent = 'x:50% · y:50%';
    if(typeof showToast === 'function') showToast('Text centered');
  });

  /* Reset */
  panel.querySelector('#mvTeReset').addEventListener('click', () => {
    style = Object.assign({}, DEFAULTS);
    syncUI(); applyToComposer();
    if(typeof showToast === 'function') showToast('Text styles reset ✦');
  });
}

/* ============ 10) Sync UI ============ */
function syncUI(){
  const panel = document.getElementById('mvTePanel');
  if(!panel) return;

  panel.querySelectorAll('.mv-te-font-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.font === style.fontId)
  );

  const sizeInput = panel.querySelector('#mvTeSize');
  if(sizeInput && sizeInput.value !== String(style.fontSize)) sizeInput.value = style.fontSize;

  panel.querySelectorAll('.mv-te-toggle').forEach(b =>
    b.classList.toggle('active', !!style[b.dataset.style])
  );

  panel.querySelectorAll('[data-align]').forEach(b =>
    b.classList.toggle('active', b.dataset.align === style.align)
  );

  const colorInput = panel.querySelector('#mvTeColor');
  if(colorInput) colorInput.value = style.color;
  panel.querySelectorAll('.mv-te-swatch').forEach(s =>
    s.classList.toggle('active', s.dataset.color.toLowerCase() === String(style.color).toLowerCase())
  );

  panel.querySelectorAll('.mv-te-effect-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.effect === style.effect)
  );

  const extras    = panel.querySelector('#mvTeEffectExtras');
  const efColorW  = panel.querySelector('#mvTeEffectColorWrap');
  const gradFromW = panel.querySelector('#mvTeGradFromWrap');
  const gradToW   = panel.querySelector('#mvTeGradToWrap');

  if(style.effect === 'shadow' || style.effect === 'glow' || style.effect === 'outline'){
    extras.style.display = '';
    efColorW.style.display = '';
    gradFromW.style.display = 'none';
    gradToW.style.display = 'none';
  } else if(style.effect === 'gradient'){
    extras.style.display = '';
    efColorW.style.display = 'none';
    gradFromW.style.display = '';
    gradToW.style.display = '';
  } else {
    extras.style.display = 'none';
  }

  const moveBtn = panel.querySelector('#mvTeMove');
  moveBtn.classList.toggle('active', style.moveMode);
  const moveLabel = moveBtn.querySelector('span');
  if(moveLabel) moveLabel.textContent = style.moveMode ? 'Move ON' : 'Move text';

  const xy = panel.querySelector('#mvTeXY');
  if(xy) xy.textContent = `x:${Math.round(style.x)}% · y:${Math.round(style.y)}%`;
}

/* ============ 11) Drag Overlay (FIX #1) ============ */
function ensureDragOverlay(area){
  if(!area) return null;
  let overlay = area.querySelector(':scope > .mv-te-drag-overlay');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.className = 'mv-te-drag-overlay';
    area.appendChild(overlay);
    bindDragOverlay(overlay, area);
  }
  return overlay;
}

function bindDragOverlay(overlay, area){
  let dragging = false;
  let startX = 0, startY = 0, startPctX = 0, startPctY = 0;

  overlay.addEventListener('pointerdown', e => {
    if(!style.moveMode) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startPctX = style.x;
    startPctY = style.y;
    try { overlay.setPointerCapture(e.pointerId); } catch(_){}
    e.preventDefault();
    e.stopPropagation();
  });

  overlay.addEventListener('pointermove', e => {
    if(!dragging) return;
    const r = area.getBoundingClientRect();
    const dx = ((e.clientX - startX) / r.width)  * 100;
    const dy = ((e.clientY - startY) / r.height) * 100;
    style.x = Math.max(6, Math.min(94, startPctX + dx));
    style.y = Math.max(6, Math.min(94, startPctY + dy));
    applyToComposer();
    const xy = document.getElementById('mvTeXY');
    if(xy) xy.textContent = `x:${Math.round(style.x)}% · y:${Math.round(style.y)}%`;
    e.preventDefault();
  });

  overlay.addEventListener('pointerup', e => {
    if(!dragging) return;
    dragging = false;
    try { overlay.releasePointerCapture(e.pointerId); } catch(_){}
  });

  overlay.addEventListener('pointercancel', () => { dragging = false; });
}

/* ============ 12) Hook composer functions (FIX #3) ============ */
function hookComposer(){

  /* Publish → apply style on new post */
  const origCreate = window.createPostFromComposer;
  if(typeof origCreate === 'function' && !origCreate._mvTEHooked){
    window.createPostFromComposer = async function(snap){
      const result = await origCreate.apply(this, arguments);
      if(style.custom && snap && snap.text){
        const newest = document.querySelector('#postsContainer > .post');
        if(newest) applyStyleToPost(newest);
      }
      return result;
    };
    window.createPostFromComposer._mvTEHooked = true;
  }

  /* Edit save → reapply */
  const origEdit = window.applyEditToPost;
  if(typeof origEdit === 'function' && !origEdit._mvTEHooked){
    window.applyEditToPost = function(post){
      const r = origEdit.apply(this, arguments);
      if(post && style.custom){
        // wait for DOM to settle, then re-wrap + reapply
        setTimeout(() => applyStyleToPost(post), 80);
      }
      return r;
    };
    window.applyEditToPost._mvTEHooked = true;
  }

  /* ⭐ FIX: restore style AFTER origOpen (which internally calls resetComposer) */
  const origOpen = window.openEditPostInComposer;
  if(typeof origOpen === 'function' && !origOpen._mvTEHooked){
    window.openEditPostInComposer = function(post){
      const ts = post && post._mvData && post._mvData.textStyle;

      // run original — it will call resetComposer() and set up state
      const r = origOpen.apply(this, arguments);

      // NOW restore style (overrides what resetComposer did)
      if(ts){
        style = Object.assign({}, DEFAULTS, ts);
      } else {
        style = Object.assign({}, DEFAULTS);
      }
      syncUI();
      // double-tap apply — first immediately, second after DOM settles
      applyToComposer();
      setTimeout(applyToComposer, 60);

      return r;
    };
    window.openEditPostInComposer._mvTEHooked = true;
  }

  /* Reset when opening fresh composer */
  const origReset = window.resetComposer;
  if(typeof origReset === 'function' && !origReset._mvTEHooked){
    window.resetComposer = function(){
      // ⭐ Don't wipe style if we're inside an edit flow.
      // The openEditPostInComposer hook restores it right after anyway.
      const isEditing = (typeof editingPost !== 'undefined' && editingPost);
      if(!isEditing){
        style = Object.assign({}, DEFAULTS);
      }
      const r = origReset.apply(this, arguments);
      syncUI();
      setTimeout(applyToComposer, 20);
      return r;
    };
    window.resetComposer._mvTEHooked = true;
  }
}

/* ============ 13) Watch new posts ============ */
function watchPosts(){
  const container = document.getElementById('postsContainer');
  if(!container) return;

  new MutationObserver(muts => {
    muts.forEach(m => {
      m.addedNodes.forEach(n => {
        if(n.nodeType !== 1) return;
        if(n.classList && n.classList.contains('post')){
          const ts = n._mvData && n._mvData.textStyle;
          if(ts){
            const saved = Object.assign({}, style);
            Object.assign(style, ts);
            applyStyleToPost(n);
            Object.assign(style, saved);
          }
        }
      });
    });
  }).observe(container, { childList: true, subtree: false });
}

/* ============ 14) Public API ============ */
window.MVTextStudio = {
  get style(){ return Object.assign({}, style); },
  set(s){ Object.assign(style, s||{}); syncUI(); applyToComposer(); },
  reset(){ style = Object.assign({}, DEFAULTS); syncUI(); applyToComposer(); },
  apply: applyStyleToPost
};

/* ============ 15) Init ============ */
onReady(function(){
  setTimeout(function(){
    const panel   = document.getElementById('mvTePanel');
    const toolBtn = document.getElementById('toolTextStyle');

    if(!panel){
      console.warn('[MV TextStudio] #mvTePanel not found');
      return;
    }

    populatePanel();
    wirePanel();
    hookComposer();
    watchPosts();
    syncUI();
    applyToComposer();

    /* Style button toggle */
    if(toolBtn && !toolBtn.dataset.wired){
      toolBtn.dataset.wired = '1';
      toolBtn.addEventListener('click', () => {
        const isOpen = panel.classList.contains('show');
        panel.classList.toggle('show');
        if(!isOpen){
          setTimeout(() => panel.scrollIntoView({ behavior:'smooth', block:'nearest' }), 80);
        }
      });
    }

    /* Make sure overlay exists on first open */
    const composerArea = document.getElementById('composerTextArea');
    if(composerArea) ensureDragOverlay(composerArea);

    console.log('[MV TextStudio] ready ✦');
  }, 300);
});

})();

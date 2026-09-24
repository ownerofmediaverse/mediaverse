/* ============================================================
   MEDIAVERSE TEXT STUDIO — SELF-CONTAINED VERSION
   Auto-injects CSS + HTML panel + Style button if missing
   ============================================================ */
(function(){
'use strict';

console.log('[MV TextStudio] booting…');

/* ============================================================
   1) INJECT CSS (only if not already present)
============================================================ */
function injectCSS(){
  if(document.getElementById('mv-te-css')) return;

  const styleEl = document.createElement('style');
  styleEl.id = 'mv-te-css';
  styleEl.textContent = `
.mv-te-panel{margin-top:12px;padding:14px 16px 16px;border-radius:16px;
  background:linear-gradient(135deg,rgba(255,255,255,.055),rgba(255,255,255,.018));
  border:1px solid rgba(255,255,255,.09);display:none;flex-direction:column;gap:11px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.08);animation:mvTeOpen .28s cubic-bezier(.2,.9,.3,1.2);}
.mv-te-panel.show{display:flex;}
@keyframes mvTeOpen{from{opacity:0;transform:translateY(-6px);}to{opacity:1;transform:translateY(0);}}
.mv-te-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:2px;}
.mv-te-title{display:flex;align-items:center;gap:8px;font-size:11.5px;font-weight:800;
  letter-spacing:.6px;color:#e8ecf8;text-transform:uppercase;}
.mv-te-title i{width:26px;height:26px;display:grid;place-items:center;border-radius:9px;
  font-size:11px;color:#ffd43b;background:linear-gradient(135deg,rgba(255,212,59,.16),rgba(168,85,247,.10));
  border:1px solid rgba(255,212,59,.20);}
.mv-te-reset{width:30px;height:30px;border:none;border-radius:10px;background:rgba(255,255,255,.055);
  color:#aeb5cb;cursor:pointer;display:grid;place-items:center;font-size:11px;transition:.2s ease;}
.mv-te-reset:hover{background:rgba(255,95,130,.16);color:#ff8a9a;transform:rotate(-45deg);}
.mv-te-row{display:flex;align-items:center;gap:9px;flex-wrap:wrap;min-width:0;}
.mv-te-label{font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;
  color:#7d84a0;min-width:52px;flex-shrink:0;}
.mv-te-fonts{display:flex;gap:6px;overflow-x:auto;flex:1;scrollbar-width:none;padding-bottom:2px;}
.mv-te-fonts::-webkit-scrollbar{display:none;}
.mv-te-font-btn{flex:0 0 auto;padding:7px 12px;border-radius:11px;
  border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#cbd0e0;
  font-size:12px;font-weight:600;cursor:pointer;transition:.2s ease;white-space:nowrap;}
.mv-te-font-btn:hover{background:rgba(255,255,255,.07);color:#fff;border-color:rgba(255,255,255,.14);}
.mv-te-font-btn.active{background:linear-gradient(135deg,rgba(0,229,255,.16),rgba(168,85,247,.14));
  border-color:rgba(0,229,255,.35);color:#fff;box-shadow:0 0 16px rgba(0,229,255,.15);}
.mv-te-size{display:flex;align-items:center;gap:2px;padding:3px;border-radius:11px;
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);}
.mv-te-size button{width:26px;height:26px;border:none;border-radius:8px;background:transparent;
  color:#cbd0e0;cursor:pointer;font-size:13px;font-weight:700;line-height:1;transition:.2s ease;}
.mv-te-size button:hover{background:rgba(0,229,255,.14);color:#fff;}
.mv-te-size input{width:38px;height:26px;border:none;outline:none;background:transparent;
  color:#fff;text-align:center;font-family:inherit;font-size:12px;font-weight:700;-moz-appearance:textfield;}
.mv-te-size input::-webkit-outer-spin-button,.mv-te-size input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}
.mv-te-styles,.mv-te-align{display:flex;gap:3px;}
.mv-te-toggle,.mv-te-align button{width:32px;height:32px;border:1px solid rgba(255,255,255,.08);
  border-radius:10px;background:rgba(255,255,255,.03);color:#cbd0e0;cursor:pointer;
  font-size:13px;display:grid;place-items:center;transition:.2s ease;font-family:inherit;}
.mv-te-toggle:hover,.mv-te-align button:hover{background:rgba(255,255,255,.08);color:#fff;border-color:rgba(255,255,255,.14);}
.mv-te-toggle.active,.mv-te-align button.active{background:linear-gradient(135deg,rgba(0,229,255,.16),rgba(168,85,247,.13));
  border-color:rgba(0,229,255,.32);color:#fff;box-shadow:0 0 14px rgba(0,229,255,.12);}
.mv-te-toggle b,.mv-te-toggle i,.mv-te-toggle u{font-size:13px;line-height:1;}
.mv-te-color-picker{position:relative;width:32px;height:32px;border-radius:10px;
  border:1px solid rgba(255,255,255,.12);cursor:pointer;overflow:hidden;flex-shrink:0;
  background:conic-gradient(from 0deg,#ff4ecd,#a855f7,#00e5ff,#35e69a,#ffd43b,#ff9f43,#ff4ecd);
  box-shadow:inset 0 0 0 2px rgba(0,0,0,.25);transition:.2s ease;}
.mv-te-color-picker:hover{transform:scale(1.06);}
.mv-te-color-picker input{position:absolute;inset:0;width:200%;height:200%;border:none;
  padding:0;cursor:pointer;opacity:0;margin:-25% 0 0 -25%;}
.mv-te-swatches{display:flex;gap:5px;flex-wrap:wrap;flex:1;}
.mv-te-swatch{width:26px;height:26px;border-radius:9px;cursor:pointer;
  border:2px solid rgba(255,255,255,.10);background:var(--c);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.20),0 3px 8px rgba(0,0,0,.28);
  transition:transform .18s ease,border-color .18s ease;}
.mv-te-swatch:hover{transform:translateY(-2px) scale(1.08);}
.mv-te-swatch.active{border-color:#fff;box-shadow:0 0 0 2px rgba(0,229,255,.4),inset 0 1px 0 rgba(255,255,255,.3);}
.mv-te-effects{display:flex;gap:5px;flex-wrap:wrap;flex:1;}
.mv-te-effect-btn{padding:7px 11px;border-radius:10px;border:1px solid rgba(255,255,255,.08);
  background:rgba(255,255,255,.03);color:#cbd0e0;font-size:10.5px;font-weight:700;
  cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:.2s ease;font-family:inherit;}
.mv-te-effect-btn i{font-size:10px;opacity:.85;}
.mv-te-effect-btn:hover{background:rgba(255,255,255,.08);color:#fff;}
.mv-te-effect-btn.active{background:linear-gradient(135deg,rgba(0,229,255,.16),rgba(168,85,247,.13));
  border-color:rgba(0,229,255,.32);color:#fff;}
.mv-te-move-btn,.mv-te-center-btn{padding:8px 13px;border-radius:10px;
  border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);color:#cbd0e0;
  font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;
  display:inline-flex;align-items:center;gap:6px;transition:.2s ease;}
.mv-te-move-btn:hover,.mv-te-center-btn:hover{background:rgba(255,255,255,.09);color:#fff;}
.mv-te-move-btn.active{background:linear-gradient(135deg,rgba(53,230,154,.18),rgba(0,229,255,.14));
  border-color:rgba(53,230,154,.36);color:#fff;box-shadow:0 0 18px rgba(53,230,154,.20);
  animation:mvTePulse 2.2s ease-in-out infinite;}
@keyframes mvTePulse{0%,100%{box-shadow:0 0 18px rgba(53,230,154,.20);}50%{box-shadow:0 0 26px rgba(53,230,154,.40);}}
.mv-te-xy{font-size:9.5px;color:#7d84a0;font-weight:700;padding:0 4px;margin-left:auto;
  letter-spacing:.3px;font-variant-numeric:tabular-nums;white-space:nowrap;}
.composer-text-area.mv-te-custom .composer-input{transition:font-size .18s ease,color .18s ease,font-family .18s ease;}
.composer-text-area.has-bg.mv-te-custom{position:relative;display:block;padding:0;min-height:240px;overflow:hidden;}
.composer-text-area.has-bg.mv-te-custom .composer-input{position:absolute;
  left:var(--mv-text-x,50%);top:var(--mv-text-y,50%);transform:translate(-50%,-50%);
  width:86%;max-width:86%;min-height:auto !important;padding:14px 12px !important;
  caret-color:#fff;transition:none;pointer-events:auto;touch-action:manipulation;}
.composer-text-area.mv-te-custom .composer-input{font-size:var(--mv-text-size,22px) !important;}
@media (max-width:640px){.composer-text-area.mv-te-custom .composer-input,
  .composer-text-area.has-bg.mv-te-custom .composer-input{font-size:var(--mv-text-size,22px) !important;}}
.composer-text-area.mv-te-custom .mv-te-drag-overlay{position:absolute;inset:0;z-index:50;
  display:none;cursor:grab;background:transparent;touch-action:none;-webkit-user-select:none;user-select:none;}
.composer-text-area.mv-te-custom.mv-te-move-mode .mv-te-drag-overlay{display:block;}
.composer-text-area.mv-te-custom.mv-te-move-mode .mv-te-drag-overlay:active{cursor:grabbing;}
.composer-text-area.mv-te-custom.mv-te-move-mode .mv-te-drag-overlay::before{content:"";
  position:absolute;inset:0;border:2px dashed rgba(53,230,154,.55);border-radius:14px;
  pointer-events:none;animation:mvTeDash 3s linear infinite;}
@keyframes mvTeDash{0%,100%{border-color:rgba(53,230,154,.55);}50%{border-color:rgba(0,229,255,.75);}}
.post-text.has-bg.mv-text-custom{display:block !important;text-align:initial !important;
  padding:0 !important;position:relative;min-height:240px;overflow:hidden;}
.post-text.has-bg.mv-text-custom .mv-text-inner{position:absolute;
  left:var(--mv-text-x,50%);top:var(--mv-text-y,50%);transform:translate(-50%,-50%);
  width:84%;max-width:84%;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;display:block;}
@media (max-width:520px){
  .mv-te-panel{padding:12px 13px 14px;gap:10px;}
  .mv-te-row{gap:7px;}
  .mv-te-label{min-width:44px;font-size:8.5px;}
  .mv-te-font-btn{padding:6px 10px;font-size:11px;}
  .mv-te-size button{width:24px;height:24px;}
  .mv-te-size input{width:34px;}
  .mv-te-toggle,.mv-te-align button{width:30px;height:30px;font-size:12px;}
  .mv-te-swatch{width:24px;height:24px;}
  .mv-te-effect-btn{padding:6px 9px;font-size:10px;}
  .mv-te-move-btn,.mv-te-center-btn{padding:7px 11px;font-size:10.5px;}
  .mv-te-xy{font-size:9px;}
  .composer-text-area.has-bg.mv-te-custom{min-height:200px;}
  .composer-text-area.has-bg.mv-te-custom .composer-input{width:90%;max-width:90%;}
  .post-text.has-bg.mv-text-custom{min-height:200px;}
  .post-text.has-bg.mv-text-custom .mv-text-inner{width:88%;max-width:88%;}
}
  `;
  document.head.appendChild(styleEl);
}

/* ============================================================
   2) INJECT HTML PANEL (if missing)
============================================================ */
function injectPanelHTML(){
  if(document.getElementById('mvTePanel')) return;

  const composerBody = document.querySelector('.composer-body');
  if(!composerBody){
    console.warn('[MV TextStudio] .composer-body not found yet');
    return;
  }

  const bgSection = composerBody.querySelector('.composer-bg-section');
  const charCounter = composerBody.querySelector('.composer-char-counter');

  const panel = document.createElement('div');
  panel.id = 'mvTePanel';
  panel.className = 'mv-te-panel';
  panel.innerHTML = `
    <div class="mv-te-head">
      <div class="mv-te-title"><i class="fa-solid fa-font"></i> Text Studio</div>
      <button type="button" class="mv-te-reset" id="mvTeReset" title="Reset all styles" aria-label="Reset">
        <i class="fa-solid fa-rotate-left"></i>
      </button>
    </div>
    <div class="mv-te-row">
      <span class="mv-te-label">Font</span>
      <div class="mv-te-fonts" id="mvTeFonts"></div>
    </div>
    <div class="mv-te-row">
      <span class="mv-te-label">Size</span>
      <div class="mv-te-size">
        <button type="button" data-size="-1" aria-label="Smaller">−</button>
        <input type="number" id="mvTeSize" min="10" max="72" value="22" aria-label="Font size">
        <button type="button" data-size="1" aria-label="Bigger">+</button>
      </div>
      <div class="mv-te-styles">
        <button type="button" class="mv-te-toggle" data-style="bold" title="Bold"><b>B</b></button>
        <button type="button" class="mv-te-toggle" data-style="italic" title="Italic"><i>I</i></button>
        <button type="button" class="mv-te-toggle" data-style="underline" title="Underline"><u>U</u></button>
      </div>
      <div class="mv-te-align">
        <button type="button" data-align="left" title="Left"><i class="fa-solid fa-align-left"></i></button>
        <button type="button" data-align="center" title="Center"><i class="fa-solid fa-align-center"></i></button>
        <button type="button" data-align="right" title="Right"><i class="fa-solid fa-align-right"></i></button>
      </div>
    </div>
    <div class="mv-te-row">
      <span class="mv-te-label">Color</span>
      <label class="mv-te-color-picker" title="Custom color">
        <input type="color" id="mvTeColor" value="#ffffff" aria-label="Text color">
      </label>
      <div class="mv-te-swatches" id="mvTeSwatches"></div>
    </div>
    <div class="mv-te-row">
      <span class="mv-te-label">Effect</span>
      <div class="mv-te-effects" id="mvTeEffects"></div>
    </div>
    <div class="mv-te-row" id="mvTeEffectExtras" style="display:none">
      <span class="mv-te-label">Effect color</span>
      <label class="mv-te-color-picker" id="mvTeEffectColorWrap" title="Effect color">
        <input type="color" id="mvTeEffectColor" value="#00e5ff">
      </label>
      <label class="mv-te-color-picker" id="mvTeGradFromWrap" title="Gradient start" style="display:none">
        <input type="color" id="mvTeGradFrom" value="#00e5ff">
      </label>
      <label class="mv-te-color-picker" id="mvTeGradToWrap" title="Gradient end" style="display:none">
        <input type="color" id="mvTeGradTo" value="#a855f7">
      </label>
    </div>
    <div class="mv-te-row">
      <span class="mv-te-label">Position</span>
      <button type="button" class="mv-te-move-btn" id="mvTeMove">
        <i class="fa-solid fa-up-down-left-right"></i> <span>Move text</span>
      </button>
      <button type="button" class="mv-te-center-btn" id="mvTeCenter">
        <i class="fa-solid fa-crosshairs"></i> Center
      </button>
      <span class="mv-te-xy" id="mvTeXY">x:50% · y:50%</span>
    </div>
  `;

  // insert after bg-section, or before char-counter, or at end
  if(bgSection)         bgSection.insertAdjacentElement('afterend', panel);
  else if(charCounter)  charCounter.insertAdjacentElement('beforebegin', panel);
  else                  composerBody.appendChild(panel);

  console.log('[MV TextStudio] Panel injected');
}

/* ============================================================
   3) INJECT STYLE BUTTON (if missing)
============================================================ */
function injectStyleButton(){
  if(document.getElementById('toolTextStyle')) return;

  const toolbar = document.querySelector('.composer-toolbar');
  if(!toolbar){
    console.warn('[MV TextStudio] .composer-toolbar not found yet');
    return;
  }

  const btn = document.createElement('button');
  btn.className = 'composer-tool tool-text';
  btn.id = 'toolTextStyle';
  btn.type = 'button';
  btn.title = 'Text Studio — font, color, effect & position';
  btn.innerHTML = '<i class="fa-solid fa-font" style="color:#ffd43b"></i><span class="tool-text">Style</span>';
  toolbar.appendChild(btn);

  console.log('[MV TextStudio] Style button injected');
}

/* ============================================================
   4) Google Fonts
============================================================ */
(function(){
  if(document.getElementById('mv-te-fonts-link')) return;
  const link = document.createElement('link');
  link.id = 'mv-te-fonts-link';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,700&family=Oswald:wght@400;700&family=Dancing+Script:wght@700&family=Bebas+Neue&family=Roboto+Mono:wght@400;700&family=Pacifico&family=Lobster&family=Poppins:wght@400;600;800&display=swap';
  document.head.appendChild(link);
})();

/* ============================================================
   5) Constants
============================================================ */
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

/* ============================================================
   6) Helpers
============================================================ */
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
function camelToKebab(s){ return s.replace(/[A-Z]/g, m => '-' + m.toLowerCase()); }
function onReady(fn){
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
  else fn();
}

/* ============================================================
   7) Compute text styles
============================================================ */
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

function applyImportantStyles(el, cssObj){
  if(!el) return;
  Object.keys(cssObj).forEach(k => {
    const prop = camelToKebab(k);
    const val  = cssObj[k];
    try{
      if(val == null || val === '') el.style.removeProperty(prop);
      else el.style.setProperty(prop, val, 'important');
    }catch(e){}
  });
}

const STYLE_PROPS = [
  'font-family','font-size','font-weight','font-style','text-decoration',
  'color','text-align','letter-spacing','line-height','text-shadow',
  '-webkit-text-stroke','background','-webkit-background-clip','background-clip',
  '-webkit-text-fill-color'
];
function clearStyles(el){
  if(!el) return;
  STYLE_PROPS.forEach(p => { try{ el.style.removeProperty(p); }catch(e){} });
}

/* ============================================================
   8) Apply to composer
============================================================ */
function applyToComposer(){
  const area  = document.getElementById('composerTextArea');
  const input = document.getElementById('postInput');
  if(!area || !input) return;

  const css = computeTextStyles();
  clearStyles(input);
  applyImportantStyles(input, css);
  input.style.setProperty('--mv-text-size', style.fontSize + 'px');

  area.style.setProperty('--mv-text-x', style.x + '%');
  area.style.setProperty('--mv-text-y', style.y + '%');
  area.classList.toggle('mv-te-custom',    !!style.custom);
  area.classList.toggle('mv-te-move-mode', !!style.moveMode);

  ensureDragOverlay(area);
}

/* ============================================================
   9) Apply to published post
============================================================ */
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
    clearStyles(inner);
    applyImportantStyles(inner, css);
    textEl.style.setProperty('--mv-text-x', style.x + '%');
    textEl.style.setProperty('--mv-text-y', style.y + '%');
    textEl.classList.add('mv-text-custom');
  } else {
    clearStyles(textEl);
    applyImportantStyles(textEl, css);
    textEl.classList.add('mv-text-custom');
  }

  post._mvData = post._mvData || {};
  post._mvData.textStyle = Object.assign({}, style);
}

/* ============================================================
   10) Populate panel buttons
============================================================ */
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
      `<button type="button" class="mv-te-swatch" data-color="${c}" style="--c:${c}" title="${c}"></button>`
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

/* ============================================================
   11) Wire panel
============================================================ */
function wirePanel(){
  const panel = document.getElementById('mvTePanel');
  if(!panel || panel.dataset.wired) return;
  panel.dataset.wired = '1';

  panel.querySelector('#mvTeFonts').addEventListener('click', e => {
    const b = e.target.closest('.mv-te-font-btn'); if(!b) return;
    style.fontId = b.dataset.font; style.custom = true;
    syncUI(); applyToComposer();
  });

  const sizeInput = panel.querySelector('#mvTeSize');
  sizeInput.addEventListener('input', () => {
    const v = Math.max(10, Math.min(72, parseInt(sizeInput.value,10) || 22));
    style.fontSize = v; style.custom = true; applyToComposer();
  });
  panel.querySelectorAll('[data-size]').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = parseInt(btn.dataset.size,10);
      style.fontSize = Math.max(10, Math.min(72, style.fontSize + d));
      style.custom = true; syncUI(); applyToComposer();
    });
  });

  panel.querySelectorAll('.mv-te-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      style[btn.dataset.style] = !style[btn.dataset.style];
      style.custom = true; syncUI(); applyToComposer();
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
    const s = e.target.closest('.mv-te-swatch'); if(!s) return;
    style.color = s.dataset.color; style.custom = true;
    syncUI(); applyToComposer();
  });

  panel.querySelector('#mvTeEffects').addEventListener('click', e => {
    const b = e.target.closest('.mv-te-effect-btn'); if(!b) return;
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

  panel.querySelector('#mvTeMove').addEventListener('click', () => {
    style.moveMode = !style.moveMode;
    syncUI(); applyToComposer();
    if(style.moveMode && typeof showToast === 'function')
      showToast('Move mode ON — drag the text on the canvas');
  });

  panel.querySelector('#mvTeCenter').addEventListener('click', () => {
    style.x = 50; style.y = 50;
    applyToComposer();
    const xy = panel.querySelector('#mvTeXY');
    if(xy) xy.textContent = 'x:50% · y:50%';
    if(typeof showToast === 'function') showToast('Text centered');
  });

  panel.querySelector('#mvTeReset').addEventListener('click', () => {
    style = Object.assign({}, DEFAULTS);
    syncUI(); applyToComposer();
    if(typeof showToast === 'function') showToast('Text styles reset ✦');
  });
}

/* ============================================================
   12) Sync UI
============================================================ */
function syncUI(){
  const panel = document.getElementById('mvTePanel');
  if(!panel) return;

  panel.querySelectorAll('.mv-te-font-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.font === style.fontId));
  const sizeInput = panel.querySelector('#mvTeSize');
  if(sizeInput && sizeInput.value !== String(style.fontSize)) sizeInput.value = style.fontSize;
  panel.querySelectorAll('.mv-te-toggle').forEach(b =>
    b.classList.toggle('active', !!style[b.dataset.style]));
  panel.querySelectorAll('[data-align]').forEach(b =>
    b.classList.toggle('active', b.dataset.align === style.align));

  const colorInput = panel.querySelector('#mvTeColor');
  if(colorInput) colorInput.value = style.color;
  panel.querySelectorAll('.mv-te-swatch').forEach(s =>
    s.classList.toggle('active', s.dataset.color.toLowerCase() === String(style.color).toLowerCase()));

  panel.querySelectorAll('.mv-te-effect-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.effect === style.effect));

  const extras    = panel.querySelector('#mvTeEffectExtras');
  const efColorW  = panel.querySelector('#mvTeEffectColorWrap');
  const gradFromW = panel.querySelector('#mvTeGradFromWrap');
  const gradToW   = panel.querySelector('#mvTeGradToWrap');

  if(style.effect === 'shadow' || style.effect === 'glow' || style.effect === 'outline'){
    extras.style.display = ''; efColorW.style.display = '';
    gradFromW.style.display = 'none'; gradToW.style.display = 'none';
  } else if(style.effect === 'gradient'){
    extras.style.display = ''; efColorW.style.display = 'none';
    gradFromW.style.display = ''; gradToW.style.display = '';
  } else { extras.style.display = 'none'; }

  const moveBtn = panel.querySelector('#mvTeMove');
  moveBtn.classList.toggle('active', style.moveMode);
  const moveLabel = moveBtn.querySelector('span');
  if(moveLabel) moveLabel.textContent = style.moveMode ? 'Move ON' : 'Move text';

  const xy = panel.querySelector('#mvTeXY');
  if(xy) xy.textContent = `x:${Math.round(style.x)}% · y:${Math.round(style.y)}%`;
}

/* ============================================================
   13) Drag overlay
============================================================ */
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
  let dragging = false, startX=0, startY=0, startPctX=0, startPctY=0;
  overlay.addEventListener('pointerdown', e => {
    if(!style.moveMode) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    startPctX = style.x; startPctY = style.y;
    try{ overlay.setPointerCapture(e.pointerId); }catch(_){}
    e.preventDefault(); e.stopPropagation();
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
    try{ overlay.releasePointerCapture(e.pointerId); }catch(_){}
  });
  overlay.addEventListener('pointercancel', () => { dragging = false; });
}

/* ============================================================
   14) Hook composer functions
============================================================ */
function hookComposer(){
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

  const origEdit = window.applyEditToPost;
  if(typeof origEdit === 'function' && !origEdit._mvTEHooked){
    window.applyEditToPost = function(post){
      const r = origEdit.apply(this, arguments);
      if(post && style.custom) setTimeout(() => applyStyleToPost(post), 80);
      return r;
    };
    window.applyEditToPost._mvTEHooked = true;
  }

  const origOpen = window.openEditPostInComposer;
  if(typeof origOpen === 'function' && !origOpen._mvTEHooked){
    window.openEditPostInComposer = function(post){
      const ts = post && post._mvData && post._mvData.textStyle;
      const r = origOpen.apply(this, arguments);
      if(ts) style = Object.assign({}, DEFAULTS, ts);
      else   style = Object.assign({}, DEFAULTS);
      syncUI();
      applyToComposer();
      setTimeout(applyToComposer, 60);
      return r;
    };
    window.openEditPostInComposer._mvTEHooked = true;
  }

  const origReset = window.resetComposer;
  if(typeof origReset === 'function' && !origReset._mvTEHooked){
    window.resetComposer = function(){
      const isEditing = (typeof editingPost !== 'undefined' && editingPost);
      if(!isEditing) style = Object.assign({}, DEFAULTS);
      const r = origReset.apply(this, arguments);
      syncUI();
      setTimeout(applyToComposer, 20);
      return r;
    };
    window.resetComposer._mvTEHooked = true;
  }
}

/* ============================================================
   15) Watch new posts
============================================================ */
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

/* ============================================================
   16) Wire Style button (with retry)
============================================================ */
function wireStyleButton(){
  const toolBtn = document.getElementById('toolTextStyle');
  const panel   = document.getElementById('mvTePanel');
  if(!toolBtn || !panel || toolBtn.dataset.wired) return;

  toolBtn.dataset.wired = '1';
  toolBtn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();

    const isOpen = panel.classList.contains('show');
    panel.classList.toggle('show');

    if(!isOpen){
      setTimeout(() => panel.scrollIntoView({ behavior:'smooth', block:'nearest' }), 80);
    }
    console.log('[MV TextStudio] Panel toggled:', !isOpen ? 'OPEN' : 'CLOSED');
  });
}

/* ============================================================
   17) Boot — retries if composer not yet in DOM
============================================================ */
function boot(){
  injectCSS();

  // composer may be created lazily; retry a few times
  let tries = 0;
  const interval = setInterval(() => {
    tries++;
    injectPanelHTML();
    injectStyleButton();

    const panel   = document.getElementById('mvTePanel');
    const toolBtn = document.getElementById('toolTextStyle');
    const composerArea = document.getElementById('composerTextArea');

    if(panel && toolBtn){
      populatePanel();
      wirePanel();
      wireStyleButton();
      if(composerArea) ensureDragOverlay(composerArea);
      syncUI();
      applyToComposer();
    }

    if((panel && toolBtn && composerArea) || tries > 40){
      clearInterval(interval);
      if(panel && toolBtn){
        console.log('[MV TextStudio] ✅ ready');
      } else {
        console.warn('[MV TextStudio] ⚠ composer elements not found after retries');
      }
    }
  }, 200);

  // Also run hooks once DOM is stable
  setTimeout(() => {
    hookComposer();
    watchPosts();
  }, 800);
}

onReady(boot);

/* Public API */
window.MVTextStudio = {
  get style(){ return Object.assign({}, style); },
  set(s){ Object.assign(style, s||{}); syncUI(); applyToComposer(); },
  reset(){ style = Object.assign({}, DEFAULTS); syncUI(); applyToComposer(); },
  apply: applyStyleToPost,
  debug(){
    console.log('Panel:', document.getElementById('mvTePanel'));
    console.log('Button:', document.getElementById('toolTextStyle'));
    console.log('Composer area:', document.getElementById('composerTextArea'));
    console.log('Style:', style);
  }
};

})();
